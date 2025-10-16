// backend/controllers/reportController.js
const asyncHandler = require('express-async-handler');
const Site = require('../models/Site');
const AttendanceEntry = require('../models/AttendanceEntry');
const MaterialEntry = require('../models/MaterialEntry');
const ActivityLog = require('../models/ActivityLog');
const AdvanceEntry = require('../models/AdvanceEntry');
const SalaryLog = require('../models/SalaryLog');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Rent = require('../models/Rent');
const StrangerWorker = require('../models/StrangerWorker');
const { generatePdfReport } = require('../utils/generatePdf');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');

// Helper to get total multiplier (attendance days) for a worker in a date range
const getWorkerAttendanceSummary = async (workerId, siteId, startDate, endDate) => {
  const matchQuery = {
    workerId: new mongoose.Types.ObjectId(workerId),
    siteId: new mongoose.Types.ObjectId(siteId),
    date: { $gte: startDate, $lte: endDate }
  };
  const result = await AttendanceEntry.aggregate([
    { $match: matchQuery },
    { $group: { _id: null, totalMultiplier: { $sum: '$multiplier' } } }
  ]);
  return result.length > 0 ? result[0].totalMultiplier : 0;
};


// @desc    Generate a report
// @route   GET /api/reports/generate
// @access  Private (Admin/Supervisor)
const generateReport = asyncHandler(async (req, res) => {
  const { siteId, startDate, endDate, format, reportType } = req.query;

  console.log('--- generateReport started ---');
  console.log('Received siteId:', siteId, 'startDate:', startDate, 'endDate:', endDate, 'format:', format, 'reportType:', reportType);

  let querySiteId = siteId;

  if (req.user.role === 'supervisor') {
    const assignedSites = req.user.assignedSites.map(id => id.toString());
    console.log('Supervisor assigned sites:', assignedSites);

    if (querySiteId) {
      if (!assignedSites.includes(querySiteId)) {
        console.log('Supervisor NOT authorized for requested siteId:', querySiteId);
        res.status(403).json({ message: 'Not authorized to generate report for this site' });
        return;
      }
      querySiteId = querySiteId;
      console.log('Supervisor authorized for specific siteId:', querySiteId);
    } else {
      querySiteId = { $in: assignedSites };
      console.log('Supervisor generating report for all assigned sites:', querySiteId);
    }
  } else {
      console.log('User is Admin. Querying with siteId:', querySiteId || 'all sites');
  }

  const reportStartDate = startDate ? new Date(startDate) : new Date('1970-01-01T00:00:00.000Z');
  const reportEndDate = endDate ? new Date(new Date(endDate).setUTCHours(23, 59, 59, 999)) : new Date();

  if (isNaN(reportStartDate.getTime()) || isNaN(reportEndDate.getTime())) {
    console.error('Invalid date received. Start:', startDate, 'End:', endDate);
    res.status(400).json({ message: 'Invalid start or end date.' });
    return;
  }
  console.log('Report Date Range:', reportStartDate.toISOString(), 'to', reportEndDate.toISOString());


  let siteQuery = {};
  if (querySiteId) {
    if (typeof querySiteId === 'string') {
      siteQuery._id = new mongoose.Types.ObjectId(querySiteId);
    } else if (typeof querySiteId === 'object' && querySiteId.$in) {
      siteQuery._id = { $in: querySiteId.$in.map(id => new mongoose.Types.ObjectId(id)) };
    }
  }
  console.log('Final Site Query:', JSON.stringify(siteQuery));

  const sites = await Site.find(siteQuery)
    .populate('assignedWorkers.workerId', 'name role baseSalary assignedProjects')
    .populate('supervisors', 'name');

  if (sites.length === 0) {
    console.log('No sites found for query:', JSON.stringify(siteQuery));
    res.status(404).json({ message: 'No sites found matching criteria or you are not authorized.' });
    return;
  }
  console.log('Found sites:', sites.map(s => s.name));

  const finalReportData = [];

  for (const site of sites) {
    console.log('Processing site:', site.name);
    const siteReport = {
      siteName: site.name,
      siteLocation: site.location,
      startDate: site.startDate,
      supervisors: site.supervisors.map(s => s.name),
      totalWorkersAssigned: site.assignedWorkers.length,
      materialSummary: [],
      activityLogs: [],
      advanceLogs: [],
      salaryCalculations: [],
      rentLogs: [],
    };

    const materials = await MaterialEntry.find({
      siteId: site._id,
      date: { $gte: reportStartDate, $lte: reportEndDate }
    }).populate('recordedBy', 'name role');

    let totalMaterialCost = 0;
    siteReport.materialSummary = materials.map(m => {
      const itemTotal = (m.quantity * m.pricePerUnit) + (m.flightCharge || 0);
      totalMaterialCost += itemTotal;
      return {
        material: m.material,
        brand: m.brand,
        quantity: m.quantity,
        unit: m.unit,
        pricePerUnit: m.pricePerUnit,
        flightCharge: m.flightCharge,
        totalCost: itemTotal,
        date: m.date,
        recordedBy: {
          name: m.recordedBy ? (m.recordedBy.name || 'Admin') : 'Admin',
          role: m.recordedBy?.role || 'admin'
        }
      };
    });

    const advances = await AdvanceEntry.find({
      siteId: site._id,
      date: { $gte: reportStartDate, $lte: reportEndDate }
    }).populate('workerId', 'name role').populate('recordedBy', 'name role');

    siteReport.advanceLogs = advances.map(a => ({
      workerName: a.workerId ? a.workerId.name : `${a.temporaryWorkerName} (Temporary)`,
      amount: a.amount,
      date: a.date,
      reason: a.reason,
      recordedBy: {
        name: a.recordedBy ? (a.recordedBy.name || 'Admin') : 'Admin',
        role: a.recordedBy?.role || 'admin'
      }
    }));

    const totalAdvanceGiven = advances.reduce((sum, a) => sum + a.amount, 0);

    const rents = await Rent.find({
      site: site._id,
      rentDate: { $gte: reportStartDate, $lte: reportEndDate }
    }).populate('createdBy', 'name role');

    siteReport.rentLogs = rents.map(r => ({
      rentDate: r.rentDate,
      amount: r.amount,
      toolsDescription: r.toolsDescription,
      createdBy: {
        name: r.createdBy ? (r.createdBy.name || 'Admin') : 'Admin',
        role: r.createdBy?.role || 'admin'
      }
    }));
    const totalRentCost = rents.reduce((sum, r) => sum + r.amount, 0);

    // --- Process Permanent Workers ---
    console.log('Fetching attendance and calculating salaries for permanent workers on site:', site.name);
    for (const workerAssignment of site.assignedWorkers) {
      if (!workerAssignment.workerId) {
          console.warn(`Worker ID missing for assignment in site ${site.name}:`, workerAssignment);
          continue;
      }
      const worker = workerAssignment.workerId;
      const totalAttendanceDays = await getWorkerAttendanceSummary(
          worker._id,
          site._id,
          reportStartDate,
          reportEndDate
      );

      const workerSpecificAdvance = advances.filter(adv =>
          adv.workerId?._id.toString() === worker._id.toString()
      ).reduce((sum, adv) => sum + adv.amount, 0);

      const dailyRateUsed = workerAssignment.salaryOverride || worker.baseSalary || 0;
      const grossSalary = totalAttendanceDays * dailyRateUsed;
      
      const advanceDeductedThisPeriod = Math.min(grossSalary, workerSpecificAdvance);
      let netSalary = grossSalary - advanceDeductedThisPeriod;

      if (totalAttendanceDays === 0 && dailyRateUsed > 0) {
          netSalary = dailyRateUsed;
      }

      if (totalAttendanceDays > 0) {
        siteReport.salaryCalculations.push({
            workerName: worker.name,
            workerRole: worker.role,
            totalAttendanceDays: totalAttendanceDays,
            dailyRateUsed: dailyRateUsed,
            grossSalary: grossSalary,
            totalAdvance: workerSpecificAdvance,
            netSalary: netSalary,
            workerId: worker._id
        });
      }
    }

    // --- Process Temporary Workers (Moved Outside the Permanent Worker Loop) ---
    console.log('Fetching temporary worker attendance for site:', site.name);
    const strangerWorkersAttendance = await StrangerWorker.find({
        siteId: site._id,
        date: { $gte: reportStartDate, $lte: reportEndDate }
    });

    const groupedStrangerWorkers = strangerWorkersAttendance.reduce((acc, worker) => {
        const key = `${worker.name.trim()}-${worker.role.trim()}`;
        if (!acc[key]) {
            acc[key] = {
                name: worker.name.trim(),
                role: worker.role.trim(),
                totalAttendanceDays: 0,
                dailyRate: worker.dailyRate,
            };
        }
        acc[key].totalAttendanceDays += worker.multiplier;
        return acc;
    }, {});

    for (const key in groupedStrangerWorkers) {
        const tempWorker = groupedStrangerWorkers[key];
        
        const tempWorkerSpecificAdvance = advances.filter(adv =>
            adv.temporaryWorkerName && adv.temporaryWorkerName.trim() === tempWorker.name
        ).reduce((sum, adv) => sum + adv.amount, 0);

        const grossSalary = tempWorker.totalAttendanceDays * tempWorker.dailyRate;
        const netSalary = grossSalary - tempWorkerSpecificAdvance;

        if (tempWorker.totalAttendanceDays > 0) {
          siteReport.salaryCalculations.push({
              workerName: `${tempWorker.name} (Temporary)`,
              workerRole: tempWorker.role,
              totalAttendanceDays: tempWorker.totalAttendanceDays,
              dailyRateUsed: tempWorker.dailyRate,
              grossSalary: grossSalary,
              totalAdvance: tempWorkerSpecificAdvance,
              netSalary: netSalary,
              workerId: null
          });
      }
    }
    console.log('Salary calculations complete for site:', site.name);
    
    const totalSalaryCost = siteReport.salaryCalculations.reduce((sum, s) => sum + s.netSalary, 0);

    const activities = await ActivityLog.find({
      siteId: site._id,
      date: { $gte: reportStartDate, $lte: reportEndDate }
    }).populate('supervisorId', 'name role');
    
    siteReport.activityLogs = activities.map(a => ({
      siteName: site.name, 
      date: a.date,
      message: a.message,
      supervisorId: {
        name: a.supervisorId ? (a.supervisorId.name || 'Admin') : 'Admin',
        role: a.supervisorId?.role || 'admin'
      }
    }));
    const totalActivityLogs = siteReport.activityLogs.length;

    siteReport.costSummary = {
        totalSalaryCost: totalSalaryCost,
        totalMaterialCost: totalMaterialCost,
        totalActivityLogs: totalActivityLogs,
        totalRentCost: totalRentCost,
        totalAdvanceGiven: totalAdvanceGiven,
        grandTotal: totalSalaryCost + totalMaterialCost + totalRentCost
    };

    finalReportData.push(siteReport);
  }

  if (format === 'pdf') {
    try {
      const displayEndDate = endDate ? new Date(endDate) : reportEndDate;
      const pdfBuffer = await generatePdfReport(finalReportData, reportStartDate, displayEndDate);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report_${siteId || 'all_sites'}_${reportStartDate.toISOString().slice(0,10)}.pdf`);
      res.send(pdfBuffer);
    } catch (pdfError) {
      console.error('Error during PDF generation:', pdfError);
      res.status(500).json({ message: 'Error generating PDF report.', error: pdfError.message });
    }
  } else if (format === 'xlsx') {
    // MODIFIED: Return JSON data for frontend to handle Excel generation
    const siteData = finalReportData.length > 0 ? finalReportData[0] : null;

    if (!siteData) {
        res.status(404).json({ message: 'No data found for the selected filters.' });
        return;
    }

    let data;
    switch (reportType) {
      case 'total_summary':
        // Calculate total advance deducted
        const totalAdvanceDeducted = siteData.salaryCalculations.reduce((sum, sal) => {
            return sum + (sal.totalAdvance || 0);
        }, 0);
        
       // Calculate salary cost with advance deducted
const totalSalaryCostWithAdvances = siteData.costSummary.totalSalaryCost + totalAdvanceDeducted;

// Calculate Grand Total plus advances
const grandTotalPlusAdvances = siteData.costSummary.grandTotal + totalAdvanceDeducted;

data = [
    { Category: 'Total Salary Cost', 'Total Cost': totalSalaryCostWithAdvances },
            { Category: 'Total Material Cost', 'Total Cost': siteData.costSummary.totalMaterialCost },
            { Category: 'Total Rent Cost', 'Total Cost': siteData.costSummary.totalRentCost },
            { Category: 'Grand Total', 'Total Cost': grandTotalPlusAdvances },
        ];
        break;
        case 'salary':
          // Calculate totals
          const salaryTotalAttendanceDays = siteData.salaryCalculations.reduce((sum, sal) => sum + sal.totalAttendanceDays, 0);
          const salaryTotalGrossSalary = siteData.salaryCalculations.reduce((sum, sal) => sum + sal.grossSalary, 0);
          const salaryTotalAdvanceDeducted = siteData.salaryCalculations.reduce((sum, sal) => sum + sal.totalAdvance, 0);
          const salaryTotalNetSalary = siteData.salaryCalculations.reduce((sum, sal) => sum + sal.netSalary, 0);
          
          data = siteData.salaryCalculations.map(sal => ({
              'Worker Name': sal.workerName,
              'Role': sal.workerRole,
              'Total Attendance Days': sal.totalAttendanceDays,
              'Daily Rate Used': sal.dailyRateUsed,
              'Gross Salary': sal.grossSalary,
              'Total Advance': sal.totalAdvance,
              'Net Salary': sal.netSalary
          }));
          
          // Add total row
          data.push({
              'Worker Name': 'Total',
              'Role': '',
              'Total Attendance Days': salaryTotalAttendanceDays,
              'Daily Rate Used': '',
              'Gross Salary': salaryTotalGrossSalary,
              'Total Advance': salaryTotalAdvanceDeducted,
              'Net Salary': salaryTotalNetSalary
          });
          break;
          case 'advances':
            // Calculate total amount
            const advancesTotalAmount = siteData.advanceLogs.reduce((sum, adv) => sum + adv.amount, 0);
            
            const sortedAdvanceLogs = [...siteData.advanceLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
            data = sortedAdvanceLogs.map(adv => ({
                'Worker Name': adv.workerName,
                'Amount': adv.amount,
                'Date': adv.date.toISOString().slice(0, 10),
                'Reason': adv.reason,
                'Recorded By': adv.recordedBy?.name || 'N/A'
            }));
            
            data.push({
                'Worker Name': 'Total',
                'Amount': advancesTotalAmount,
                'Date': '',
                'Reason': '',
                'Recorded By': ''
            });
            break;
            case 'rent':
              // Calculate total amount
              const rentTotalAmount = siteData.rentLogs.reduce((sum, rent) => sum + rent.amount, 0);
              
              const sortedRentLogs = [...siteData.rentLogs].sort((a, b) => new Date(b.rentDate) - new Date(a.rentDate));
              data = sortedRentLogs.map(rent => ({
                  'Date': rent.rentDate.toISOString().slice(0, 10),
                  'Description': rent.toolsDescription,
                  'Amount': rent.amount,
                  'Recorded By': rent.createdBy?.name || 'N/A'
              }));
              
              // Add total row
              data.push({
                  'Date': 'Total',
                  'Description': '',
                  'Amount': rentTotalAmount,
                  'Recorded By': ''
              });
              break;
        case 'attendance':
            const attendanceData = await AttendanceEntry.find({
                siteId: siteId,
                date: { $gte: reportStartDate, $lte: reportEndDate }
            }).populate('worker');
            data = attendanceData.map(entry => ({
                'Worker Name': entry.worker?.name,
                'Date': entry.date.toISOString().slice(0, 10),
                'Status': entry.status,
                'Multiplier': entry.multiplier,
                'Notes': entry.notes
            }));
            break;
            case 'materials':
              // Calculate totals
              const materialTotalQuantity = siteData.materialSummary.reduce((sum, mat) => sum + mat.quantity, 0);
              const materialTotalPrice = siteData.materialSummary.reduce((sum, mat) => sum + mat.pricePerUnit, 0);
              const materialTotalFlightCharge = siteData.materialSummary.reduce((sum, mat) => sum + (mat.flightCharge || 0), 0);
              const materialTotalCost = siteData.materialSummary.reduce((sum, mat) => sum + mat.totalCost, 0);
          
              const sortedMaterialSummary = [...siteData.materialSummary].sort((a, b) => new Date(b.date) - new Date(a.date));
              data = sortedMaterialSummary.map(mat => ({
                  'Material': mat.material,
                  'Brand': mat.brand,
                  'Quantity': mat.quantity,
                  'Unit': mat.unit,
                  'Price/Unit': mat.pricePerUnit,
                  'Flight Charge': mat.flightCharge,
                  'Total Cost': mat.totalCost,
                  'Date': mat.date.toISOString().slice(0, 10),
                  'Recorded By': mat.recordedBy?.name || 'N/A'
              }));
              
              // Add total row
              data.push({
                  'Material': 'Total',
                  'Brand': '',
                  'Quantity': materialTotalQuantity,
                  'Unit': '',
                  'Price/Unit': materialTotalPrice,
                  'Flight Charge': materialTotalFlightCharge,
                  'Total Cost': materialTotalCost,
                  'Date': '',
                  'Recorded By': ''
              });
              break;
        case 'activities':
          const sortedActivityLogs = [...siteData.activityLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
           data = sortedActivityLogs.map(act => ({
                'Site Name': siteData.siteName,
                'Date': act.date.toISOString().slice(0, 10),
                'Message': act.message,
                'Supervisor': act.supervisorId?.name || 'N/A'
            }));
            break;
        default:
            res.status(400).json({ message: 'Invalid report type for Excel.' });
            return;
    }
    res.json(data);

  } else {
    res.json({ message: 'Report generated successfully!', reportData: finalReportData });
  }
});

// @desc    Calculate and log weekly salaries for all workers across all sites
// @route   POST /api/reports/calculate-weekly-salaries
// @access  Private (Admin only)
const calculateAndLogWeeklySalaries = asyncHandler(async (req, res) => {
  const { startDate, endDate, siteId } = req.body;

  if (!startDate || !endDate) {
    res.status(400).json({ message: 'Start date and end date are required for salary calculation.' });
    return;
  }

  const startOfWeek = new Date(startDate);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  const endOfWeek = new Date(endDate);
  endOfWeek.setUTCHours(23, 59, 59, 999);

  let siteQuery = {};
  const siteIdsForQuery = [];

  if (siteId) {
    siteQuery._id = new mongoose.Types.ObjectId(siteId);
    siteIdsForQuery.push(new mongoose.Types.ObjectId(siteId));
  } else {
    // If no siteId, calculate for all sites
    const allSites = await Site.find({}).select('_id');
    allSites.forEach(s => siteIdsForQuery.push(s._id));
  }
  
  const deletionQuery = {
    date: { $gte: startOfWeek, $lte: endOfWeek }
  };
  if (siteIdsForQuery.length > 0) {
    deletionQuery.siteId = { $in: siteIdsForQuery };
  }
  await SalaryLog.deleteMany(deletionQuery);

  const sites = await Site.find(siteQuery)
    .populate('assignedWorkers.workerId', 'name baseSalary assignedProjects');

  const salaryLogsToSave = [];
  let calculatedSalaries = [];

  let recordedById;
  if (req.user._id === 'dev_admin_id' || req.user._id === 'dev_supervisor_id') {
      recordedById = new mongoose.Types.ObjectId('60a7b1b3c9f2b1001a4e2d3c');
  } else {
      recordedById = req.user._id;
  }


  for (const site of sites) {
    for (const workerAssignment of site.assignedWorkers) {
      const worker = workerAssignment.workerId;
      if (!worker) continue;

      const totalAttendanceDays = await getWorkerAttendanceSummary(
        worker._id,
        site._id,
        startOfWeek,
        endOfWeek
      );

      const workerAdvances = await AdvanceEntry.find({
        workerId: worker._id,
        siteId: site._id,
        date: { $gte: startOfWeek, $lte: endOfWeek }
      });
      const totalAdvanceDeducted = workerAdvances.reduce((sum, adv) => sum + adv.amount, 0);

      const dailyRate = workerAssignment.salaryOverride || worker.baseSalary || 0;
      const grossSalary = totalAttendanceDays * dailyRate;
      const netSalary = grossSalary - totalAdvanceDeducted;
      
      if (grossSalary > 0) {
        salaryLogsToSave.push({
          workerId: worker._id,
          siteId: site._id,
          date: startOfWeek,
          weekStart: startOfWeek,
          weekEnd: endOfWeek,
          totalAttendanceDays: totalAttendanceDays,
          dailyRateUsed: dailyRate,
          grossSalary: grossSalary,
          totalAdvanceDeducted: totalAdvanceDeducted,
          netSalary: netSalary,
          paid: false,
          paymentDate: null,
          recordedBy: recordedById,
        });
      }
    }
  }

  const strangerQuery = {
    date: { $gte: startOfWeek, $lte: endOfWeek }
  };
  if (siteIdsForQuery.length > 0) {
    strangerQuery.siteId = { $in: siteIdsForQuery };
  }

  const strangerWorkers = await StrangerWorker.find(strangerQuery);

  const groupedStrangerWorkers = strangerWorkers.reduce((acc, worker) => {
    const key = `${worker.name}-${worker.siteId}-${worker.role}-${worker.dailyRate}`;
    if (!acc[key]) {
      acc[key] = {
        siteId: worker.siteId,
        name: worker.name,
        role: worker.role,
        dailyRate: worker.dailyRate,
        totalAttendanceDays: 0,
        shiftDetails: [],
      };
    }
    acc[key].totalAttendanceDays += worker.multiplier;
    acc[key].shiftDetails.push({ date: worker.date, shiftType: worker.shiftType, multiplier: worker.multiplier });
    return acc;
  }, {});
  
  for (const groupKey in groupedStrangerWorkers) {
    const workerData = groupedStrangerWorkers[groupKey];
    
    const tempWorkerAdvances = await AdvanceEntry.find({
      temporaryWorkerName: workerData.name,
      siteId: workerData.siteId,
      date: { $gte: startOfWeek, $lte: endOfWeek }
    });
    const totalAdvanceDeducted = tempWorkerAdvances.reduce((sum, adv) => sum + adv.amount, 0);

    const grossSalary = workerData.totalAttendanceDays * workerData.dailyRate;
    const netSalary = grossSalary - totalAdvanceDeducted;
    
    if (grossSalary > 0) {
      salaryLogsToSave.push({
        temporaryWorkerName: workerData.name,
        temporaryWorkerRole: workerData.role,
        siteId: workerData.siteId,
        date: startOfWeek,
        weekStart: startOfWeek,
        weekEnd: endOfWeek,
        totalAttendanceDays: workerData.totalAttendanceDays,
        dailyRateUsed: workerData.dailyRate,
        grossSalary: grossSalary,
        totalAdvanceDeducted: totalAdvanceDeducted,
        netSalary: netSalary,
        paid: false,
        paymentDate: null,
        recordedBy: recordedById,
        shiftDetails: workerData.shiftDetails
      });
    }
  }


  if (salaryLogsToSave.length > 0) {
    try {
      await SalaryLog.insertMany(salaryLogsToSave, { ordered: false });
    } catch (e) {
      if (e.code !== 11000) {
        throw e;
      }
    }
  }

  res.status(200).json({
    message: 'Weekly salaries calculated and logged successfully.',
    calculatedSalaries: calculatedSalaries
  });
});


// @desc    Get Salary Logs (for Admin/Supervisor)
// @route   GET /api/reports/salary-logs
// @access  Private (Admin/Supervisor)
const getSalaryLogs = asyncHandler(async (req, res) => {
  const { siteId, workerId, startDate, endDate, paidStatus } = req.query;
  let query = {};

  if (siteId) {
    query.siteId = siteId;
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }
  if (paidStatus !== undefined && paidStatus !== null && paidStatus !== '') {
    query.paid = paidStatus === 'true';
  }

  query.grossSalary = { $gt: 0 };

  if (req.user.role === 'supervisor') {
    const assignedSites = req.user.assignedSites.map(id => id.toString());
    if (query.siteId && !assignedSites.includes(query.siteId.toString())) {
      res.status(403).json({ message: 'Not authorized to view salary logs for this site' });
      return;
    }
    if (!query.siteId) {
      query.siteId = { $in: assignedSites };
    }
  }
  
  if (workerId) {
      const worker = await Worker.findById(workerId);
      if (worker) {
        query.$or = [
          { workerId: workerId },
          { temporaryWorkerName: worker.name }
        ];
      } else {
        query.workerId = workerId;
      }
  }

  const salaryLogs = await SalaryLog.find(query)
    .populate('workerId', 'name role')
    .populate('siteId', 'name')
    .populate('recordedBy', 'name role')
    .sort({ updatedAt: -1 });

  const formattedSalaryLogs = salaryLogs.map(log => {
    let workerName;
    let workerRole;

    if (log.workerId) {
        workerName = log.workerId.name || 'N/A Worker';
        workerRole = log.workerId.role || 'N/A Role';
    } else {
        workerName = `${log.temporaryWorkerName} (Temporary)`;
        workerRole = log.temporaryWorkerRole || 'N/A';
    }

    return {
      ...log.toObject(),
      workerId: { 
        ...(log.workerId?.toObject() || {}),
        name: workerName, 
        role: workerRole 
      },
      recordedBy: {
        name: log.recordedBy?.role === 'admin' ? 'Admin' : log.recordedBy?.name || 'N/A',
        role: log.recordedBy?.role || 'N/A'
      }
    };
  });

  res.json(formattedSalaryLogs);
});

// @desc    Update Salary Log Paid Status
// @route   PUT /api/reports/salary-logs/:id/paid
// @access  Private (Admin only)
const updateSalaryLogPaidStatus = asyncHandler(async (req, res) => {
  const { paid, paymentDate } = req.body;
  const salaryLogId = req.params.id;

  const salaryLog = await SalaryLog.findById(salaryLogId);

  if (!salaryLog) {
    res.status(404).json({ message: 'Salary log not found' });
    return;
  }

  try {
    salaryLog.paid = paid;
    salaryLog.paymentDate = paid ? (paymentDate || new Date()) : null;

    let recordedById;
    if (req.user._id === 'dev_admin_id' || req.user._id === 'dev_supervisor_id') {
        recordedById = new mongoose.Types.ObjectId('60a7b1b3c9f2b1001a4e2d3c');
    } else {
        recordedById = req.user._id;
    }

    if (!salaryLog.recordedBy || salaryLog.recordedBy.toString() === '60a7b1b3c9f2b1001a4e2d3c') {
        salaryLog.recordedBy = recordedById;
    }

    const updatedSalaryLog = await salaryLog.save();
    res.json({ message: 'Salary log updated successfully', updatedSalaryLog });
  } catch (error) {
    console.error('Error saving updated salary log:', error);
    res.status(500).json({ message: 'Failed to update salary log paid status.', error: error.message });
  }
});


module.exports = {
  generateReport,
  calculateAndLogWeeklySalaries,
  getSalaryLogs,
  updateSalaryLogPaidStatus,
};
