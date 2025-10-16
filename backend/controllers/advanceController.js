const asyncHandler = require('express-async-handler');
const AdvanceEntry = require('../models/AdvanceEntry');
const Worker = require('../models/Worker');
const Site = require('../models/Site');
const User = require('../models/User'); // Ensure User model is imported
const mongoose = require('mongoose');

// @desc    Log an advance payment
// @route   POST /api/advances
// @access  Private (Supervisor/Admin)
const createAdvanceLog = asyncHandler(async (req, res) => {
  const {
    workerId,
    temporaryWorkerName,
    siteId,
    amount,
    date,
    reason
  } = req.body;

  const site = await Site.findById(siteId);

  if (!site) {
    res.status(404).json({ message: 'Site not found' });
    return;
  }

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(siteId)) {
    res.status(403).json({ message: 'Not authorized to log advance for this site' });
    return;
  }
  
  if (workerId) {
    const worker = await Worker.findById(workerId);
    if (!worker) {
        res.status(404).json({ message: 'Worker not found' });
        return;
    }
    const isWorkerAssignedToSite = site.assignedWorkers.some(aw => aw.workerId.toString() === workerId);
    if (!isWorkerAssignedToSite) {
        res.status(400).json({ message: 'Worker is not assigned to this site.' });
        return;
    }
  } else if (!temporaryWorkerName) {
      res.status(400).json({ message: 'Either a workerId or a temporaryWorkerName must be provided.'});
      return;
  }

  let actualRecordedBy = req.user._id;
  if (req.user._id === 'dev_admin_id' || req.user._id === 'dev_supervisor_id') {
      actualRecordedBy = new mongoose.Types.ObjectId('60a7b1b3c9f2b1001a4e2d3f');
  }

  try {
    const advance = await AdvanceEntry.create({
      workerId: workerId || null,
      temporaryWorkerName: temporaryWorkerName || null,
      siteId,
      amount,
      date: date || Date.now(),
      reason,
      recordedBy: actualRecordedBy,
    });
    res.status(201).json(advance);
  } catch (dbError) {
    if (dbError.name === 'ValidationError') {
      const errors = Object.values(dbError.errors).map(err => err.message);
      res.status(400).json({ message: 'Validation Error', errors });
    } else {
      res.status(500).json({ message: 'Server error during advance logging', error: dbError.message });
    }
  }
});

// @desc    Get advance entries (filtered by worker, site, date range)
// @route   GET /api/advances
// @access  Private (Admin/Supervisor)
const getAdvanceLogs = asyncHandler(async (req, res) => {
  const { siteId, workerId, temporaryWorkerName, startDate, endDate } = req.query;
  let query = {};

  if (workerId) {
    query.workerId = workerId;
  }

  if (temporaryWorkerName) {
    query.temporaryWorkerName = temporaryWorkerName;
  }
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate).setUTCHours(0, 0, 0, 0),
      $lte: new Date(endDate).setUTCHours(23, 59, 59, 999)
    };
  }

  if (req.user.role === 'supervisor') {
    const assignedSites = req.user.assignedSites.map(id => id.toString());
    if (siteId) {
      if (!assignedSites.includes(siteId)) {
        res.status(403).json({ message: 'Not authorized to view advances for this site' });
        return;
      }
      query.siteId = siteId;
    } else {
      query.siteId = { $in: assignedSites };
    }
  } else if (siteId) {
    query.siteId = siteId;
  }

  try {
    const advanceLogs = await AdvanceEntry.find(query)
      .populate('workerId', 'name role')
      .populate('siteId', 'name')
      .populate('recordedBy', 'name role')
      .sort({ date: -1 });

    const formattedAdvanceLogs = advanceLogs.map(log => {
      let recordedByName;
      if (log.recordedBy) {
        recordedByName = log.recordedBy.name || 'Admin';
      } else {
        recordedByName = 'Admin';
      }

      const workerDisplayInfo = log.workerId 
        ? { _id: log.workerId._id, name: log.workerId.name, role: log.workerId.role }
        : { _id: log._id, name: `${log.temporaryWorkerName} (Temporary)`, role: 'Temporary' };

      return {
        ...log.toObject(),
        workerId: workerDisplayInfo,
        recordedBy: {
          name: recordedByName,
          role: log.recordedBy?.role || 'admin'
        }
      };
    });

    res.json(formattedAdvanceLogs);
  } catch (dbError) {
    res.status(500).json({ message: 'Server Error during advance logs fetch.', error: dbError.message });
  }
});

const updateAdvanceLog = asyncHandler(async (req, res) => {
  const {
    amount,
    date,
    reason
  } = req.body;

  const advance = await AdvanceEntry.findById(req.params.id);

  if (advance) {
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(advance.siteId.toString())) {
      res.status(403).json({
        message: 'Not authorized to update advance for this site'
      });
      return;
    }

    advance.amount = amount !== undefined ? amount : advance.amount;
    advance.date = date !== undefined ? date : advance.date;
    advance.reason = reason !== undefined ? reason : advance.reason;

    try {
      const updatedAdvance = await advance.save();
      res.json(updatedAdvance);
    } catch (dbError) {
      if (dbError.name === 'ValidationError') {
        const errors = Object.values(dbError.errors).map(err => err.message);
        res.status(400).json({ message: 'Validation Error', errors });
      } else {
        res.status(500).json({ message: 'Server error during advance update', error: dbError.message });
      }
    }
  } else {
    res.status(404).json({
      message: 'Advance entry not found'
    });
  }
});

const deleteAdvanceLog = asyncHandler(async (req, res) => {

  const advance = await AdvanceEntry.findById(req.params.id);

  if (advance) {
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(advance.siteId.toString())) {
      res.status(403).json({
        message: 'Not authorized to delete advance for this site'
      });
      return;
    }
    try {
      await advance.deleteOne();
      res.json({
        message: 'Advance entry removed'
      });
    } catch (dbError) {
      res.status(500).json({ message: 'Server error during advance deletion', error: dbError.message });
    }
  } else {
    res.status(404).json({
      message: 'Advance entry not found'
    });
  }
});

module.exports = {
  createAdvanceLog,
  getAdvanceLogs,
  updateAdvanceLog,
  deleteAdvanceLog,
};