// construction new/backend/controllers/attendanceController.js
const asyncHandler = require('express-async-handler');
const AttendanceEntry = require('../models/AttendanceEntry');
const Worker = require('../models/Worker');
const Site = require('../models/Site');
const SalaryLog = require('../models/SalaryLog'); // ADDED: Import SalaryLog
const mongoose = require('mongoose');

// Helper to get multiplier based on shiftType
const getMultiplier = (shiftType) => {
  switch (shiftType) {
    case 'Full Day':
      return 1.0;
    case 'One-and-a-Half Day':
      return 1.5;
    case 'Half Day Morning':
      return 0.5;
    case 'Half Day Evening':
      return 0.5;
    default:
      return 0;
  }
};

// @desc    Mark attendance for workers
// @route   POST /api/attendance
// @access  Private (Admin, Supervisor)
const markAttendance = asyncHandler(async (req, res) => {
  const { siteId, date, attendanceRecords } = req.body;

  console.log(`[markAttendance] Received request to mark attendance for site: ${siteId}, date: ${date}`);

  if (!siteId || !date || !attendanceRecords || attendanceRecords.length === 0) {
    console.warn('[markAttendance] Missing required fields in request body.');
    res.status(400).json({ message: 'Please provide siteId, date, and attendance records.' });
    return;
  }

  const site = await Site.findById(siteId);
  if (!site) {
    console.warn(`[markAttendance] Site not found with ID: ${siteId}`);
    res.status(404).json({ message: 'Site not found.' });
    return;
  }

  // Authorization: Admin can mark for any site. Supervisor must be assigned to the site.
  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(siteId)) {
    console.warn(`[markAttendance] Unauthorized supervisor (${req.user._id}) attempting to mark attendance for site: ${siteId}`);
    res.status(403).json({ message: 'Not authorized to mark attendance for this site.' });
    return;
  }

  const attendanceDate = new Date(date).setUTCHours(0, 0, 0, 0);
  console.log(`[markAttendance] Processing attendance for date (UTC 00:00:00): ${new Date(attendanceDate).toISOString()}`);

  const newEntries = [];
  const updatedEntries = [];

  for (const record of attendanceRecords) {
    const { workerId, status, checkInTime, checkOutTime, shiftType, multiplier } = record;

    const isWorkerAssigned = site.assignedWorkers.some(
        (assignment) => assignment.workerId.toString() === workerId
    );

    if (!isWorkerAssigned) {
        console.warn(`[markAttendance] Worker ${workerId} is not assigned to site ${siteId}. Skipping.`);
        continue;
    }

    if (!workerId || !status) {
      console.warn(`[markAttendance] Skipping attendance record due to missing workerId or status: ${JSON.stringify(record)}`);
      continue;
    }

    const finalMultiplier = typeof multiplier === 'number' ? multiplier : getMultiplier(shiftType);
    console.log(`[markAttendance] Worker: ${workerId}, Status: ${status}, Multiplier: ${finalMultiplier}`);

    let actualRecordedBy = req.user._id;
    if (req.user._id === 'dev_admin_id' || req.user._id === 'dev_supervisor_id') {
      actualRecordedBy = new mongoose.Types.ObjectId('60a7b1b3c9f2b1001a4e2d3f'); // Use a static dummy ID for dev users
    }

    try {
        const updatePayload = {
            status,
            shiftType, // FIX: Pass shiftType directly to ensure it's saved for all statuses
            multiplier: finalMultiplier,
            checkInTime,
            checkOutTime,
            recordedBy: actualRecordedBy
        };
        
        let existingEntry = await AttendanceEntry.findOneAndUpdate(
            { workerId, siteId, date: attendanceDate },
            { $set: updatePayload },
            { new: true, upsert: true, runValidators: true, rawResult: true }
        );

        if (existingEntry.lastErrorObject?.upserted) {
            const doc = await AttendanceEntry.findById(existingEntry.value._id).populate('workerId', 'name').populate('siteId', 'name').populate('recordedBy', 'name');
            newEntries.push(doc);
            console.log(`[markAttendance] New entry created for worker ${workerId}.`);
        } else {
            const doc = await AttendanceEntry.findById(existingEntry.value._id).populate('workerId', 'name').populate('siteId', 'name').populate('recordedBy', 'name');
            updatedEntries.push(doc);
            console.log(`[markAttendance] Existing entry updated for worker ${workerId}.`);
        }
    } catch (upsertError) {
        console.error(`[markAttendance] Error during findOneAndUpdate for worker ${workerId}:`, upsertError.message);
    }
  }

  res.status(200).json({
    message: 'Attendance marked/updated successfully',
    newEntries,
    updatedEntries,
  });
  console.log('[markAttendance] Attendance marking process complete.');
});


// @desc    Get attendance entries (filtered by site, date range, worker)
// @route   GET /api/attendance
// @access  Private (Admin/Supervisor)
const getAttendanceEntries = asyncHandler(async (req, res) => {
  const { siteId, workerId, startDate, endDate } = req.query;
  let query = {};

  // Apply filters from query parameters
  if (workerId) {
    query.workerId = workerId;
  }
  if (startDate && endDate) {
    // Ensure dates are parsed correctly for Mongoose query
    query.date = {
      $gte: new Date(startDate).setUTCHours(0, 0, 0, 0),
      $lte: new Date(endDate).setUTCHours(23, 59, 59, 999)
    };
  }

  // Apply site filtering based on user role and provided siteId
  if (req.user.role === 'supervisor') {
    const assignedSites = req.user.assignedSites.map(id => id.toString());
    if (siteId) {
      if (!assignedSites.includes(siteId)) {
        res.status(403).json({ message: 'Not authorized to view attendance for this site' });
        return;
      }
      query.siteId = siteId;
    } else {
      query.siteId = { $in: assignedSites };
    }
  } else if (siteId) { // If admin and a specific siteId is requested
    query.siteId = siteId;
  }

  try {
    const attendanceEntries = await AttendanceEntry.find(query)
      .populate('workerId', 'name role')
      .populate('siteId', 'name')
      .populate('recordedBy', 'name role')
      .sort({ date: -1 });

    const formattedAttendanceEntries = attendanceEntries.map(entry => {
      let recordedByName;
      if (entry.recordedBy) {
        // Case 1: User was found. Use their name, or default to 'Admin'.
        recordedByName = entry.recordedBy.name || 'Admin';
      } else {
        // Case 2: User was NOT found (the dev admin case). Default to 'Admin'.
        recordedByName = 'Admin';
      }

      return {
        ...entry.toObject(),
        workerId: { _id: entry.workerId?._id, name: entry.workerId?.name || 'N/A Worker', role: entry.workerId?.role || 'N/A Role' },
        siteId: { _id: entry.siteId?._id, name: entry.siteId?.name || 'N/A Site' },
        recordedBy: { _id: entry.recordedBy?._id, name: recordedByName, role: entry.recordedBy?.role || 'admin' }
      };
    });
   
    res.json(formattedAttendanceEntries);
  } catch (dbError) {
    console.error('[getAttendanceEntries] Database error fetching attendance entries:', dbError.message);
    res.status(500).json({ message: 'Server Error during attendance entries fetch.', error: dbError.message });
  }
});

// @desc    Get attendance summary for all sites or a specific site for Admin
// @route   GET /api/attendance/overview
// @access  Private (Admin)
const getAttendanceOverview = asyncHandler(async (req, res) => {
  const { siteId, startDate, endDate } = req.query;

  console.log('--- getAttendanceOverview START ---');
  console.log('Received query params:', { siteId, startDate, endDate });

  let matchQuery = {};
  if (siteId) {
    try {
      matchQuery.siteId = new mongoose.Types.ObjectId(siteId);
    } catch (err) {
      console.error('[getAttendanceOverview] Invalid siteId for aggregation:', siteId, err.message);
      res.status(400).json({ message: 'Invalid Site ID provided.' });
      return;
    }
  }
  if (startDate && endDate) {
    matchQuery.date = {
      $gte: new Date(startDate).setUTCHours(0, 0, 0, 0),
      $lte: new Date(endDate).setUTCHours(23, 59, 59, 999)
    };
  }
  console.log('Final Mongoose match query for getAttendanceOverview:', JSON.stringify(matchQuery));

  try {
    const attendanceOverview = await AttendanceEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { siteId: '$siteId', workerId: '$workerId' },
          totalMultiplier: { $sum: '$multiplier' },
          datesPresent: {
            $push: {
              date: '$date',
              status: '$status',
              shiftType: '$shiftType',
              multiplier: '$multiplier'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'workers', // Ensure this matches your actual collection name
          localField: '_id.workerId',
          foreignField: '_id',
          as: 'workerDetails',
        }
      },
      { $unwind: '$workerDetails' },
      {
        $lookup: {
          from: 'sites', // Ensure this matches your actual collection name
          localField: '_id.siteId',
          foreignField: '_id',
          as: 'siteDetails',
        }
      },
      { $unwind: '$siteDetails' },
      {
        $project: {
          _id: 0,
          workerId: '$_id.workerId',
          workerName: '$workerDetails.name',
          workerRole: '$workerDetails.role',
          siteId: '$_id.siteId',
          siteName: '$siteDetails.name',
          totalAttendanceDays: '$totalMultiplier',
          datesPresent: '$datesPresent'
        }
      },
      {
        $group: {
          _id: '$siteId',
          siteName: { $first: '$siteName' },
          workersAttendance: {
            $push: {
              workerId: '$workerId',
              workerName: '$workerName',
              workerRole: '$workerRole',
              totalAttendanceDays: '$totalAttendanceDays',
              datesPresent: '$datesPresent'
            }
          },
          totalWorkersCount: { $sum: 1 }
        }
      },
      { $sort: { siteName: 1 } }
    ]);

    console.log('[getAttendanceOverview] Successfully fetched attendance overview data. Site summaries count:', attendanceOverview.length);
    res.json(attendanceOverview);
  } catch (dbError) {
    console.error('[getAttendanceOverview] Database error fetching attendance overview:', dbError.message);
    console.error('[getAttendanceOverview] DB Error Details:', dbError);
    res.status(500).json({ message: 'Server Error during attendance overview fetch.', error: dbError.message });
  }
  console.log('--- getAttendanceOverview END ---');
});


// @desc    Update an attendance entry (e.g., correct shift type)
// @route   PUT /api/attendance/:id
// @access  Private (Admin/Supervisor)
const updateAttendanceEntry = asyncHandler(async (req, res) => {
  const { status, shiftType, multiplier, checkInTime, checkOutTime } = req.body;
  const attendance = await AttendanceEntry.findById(req.params.id);

  if (attendance) {
    // Ensure supervisor is authorized for this site
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(attendance.siteId.toString())) {
      res.status(403).json({ message: 'Not authorized to update attendance for this site' });
      return;
    }

    attendance.status = status !== undefined ? status : attendance.status;
    attendance.shiftType = shiftType !== undefined ? shiftType : attendance.shiftType;
    attendance.checkInTime = checkInTime !== undefined ? checkInTime : attendance.checkInTime;
    attendance.checkOutTime = checkOutTime !== undefined ? checkOutTime : attendance.checkOutTime;
    
    // Recalculate multiplier based on new status/shiftType if provided, otherwise keep old
    if (multiplier !== undefined) {
      attendance.multiplier = multiplier;
    } else if (attendance.status === 'Present') {
      attendance.multiplier = getMultiplier(attendance.shiftType);
    } else {
      attendance.multiplier = 0; // If not present, multiplier is 0
    }

    const updatedAttendance = await attendance.save();
    res.json(updatedAttendance);
  } else {
    res.status(404).json({ message: 'Attendance entry not found' });
  }
});

// @desc    Delete an attendance entry
// @route   DELETE /api/attendance/:id
// @access  Private (Admin/Supervisor)
const deleteAttendanceEntry = asyncHandler(async (req, res) => {
  const attendance = await AttendanceEntry.findById(req.params.id);

  if (attendance) {
    // Ensure supervisor is authorized for this site
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(attendance.siteId.toString())) {
      res.status(403).json({ message: 'Not authorized to delete attendance for this site' });
      return;
    }
    
    // MODIFIED: Delete corresponding salary log before deleting attendance
    await SalaryLog.deleteOne({
      workerId: attendance.workerId,
      siteId: attendance.siteId,
      date: attendance.date
    });

    await attendance.deleteOne();
    res.json({ message: 'Attendance entry removed' });
  } else {
    res.status(404).json({ message: 'Attendance entry not found' });
  }
});


module.exports = {
  markAttendance,
  getAttendanceEntries,
  getAttendanceOverview,
  updateAttendanceEntry,
  deleteAttendanceEntry,
};