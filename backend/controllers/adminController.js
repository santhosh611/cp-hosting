// construction/backend/controllers/adminController.js
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Site = require('../models/Site');
const Worker = require('../models/Worker');
const AttendanceEntry = require('../models/AttendanceEntry');
const AdvanceEntry = require('../models/AdvanceEntry');
const MaterialEntry = require('../models/MaterialEntry');
const ActivityLog = require('../models/ActivityLog');
const SalaryLog = require('../models/SalaryLog');
const Rent = require('../models/Rent');
const StrangerWorker = require('../models/StrangerWorker');
const mongoose = require('mongoose');

// @desc    Get Admin Dashboard Overall Summary
// @route   GET /api/admin/dashboard-summary
// @access  Private/Admin
const getAdminDashboardSummary = asyncHandler(async (req, res) => {
  const totalProjects = await Site.countDocuments();
  const totalWorkers = await Worker.countDocuments();

  const supervisorsList = await User.find({ role: 'supervisor' })
    .select('name username email assignedSites')
    .populate('assignedSites', 'name');
  const totalSupervisors = supervisorsList.length;

  // MODIFIED: Include flightCharge in totalMaterialCost calculation
  const totalMaterialCostResult = await MaterialEntry.aggregate([{
    $group: {
      _id: null,
      total: {
        $sum: { $add: ['$total', { $ifNull: ['$flightCharge', 0] }] } // Add flightCharge, default to 0 if null
      }
    }
  }]);
  const totalMaterialCost = totalMaterialCostResult.length > 0 ? totalMaterialCostResult[0].total : 0;

  // FIXED: Calculate total salary cost the same way as reports
  // Get all sites with their assigned workers
  const sites = await Site.find({})
    .populate('assignedWorkers.workerId', 'name role baseSalary assignedProjects');

  let totalSalaryCost = 0;

  // Helper function to get attendance summary for a worker
  const getWorkerAttendanceSummary = async (workerId, siteId) => {
    const result = await AttendanceEntry.aggregate([
      { 
        $match: { 
          workerId: workerId,
          siteId: siteId
        } 
      },
      { $group: { _id: null, totalMultiplier: { $sum: '$multiplier' } } }
    ]);
    return result.length > 0 ? result[0].totalMultiplier : 0;
  };

  // Calculate salary costs for all permanent workers
  for (const site of sites) {
    for (const workerAssignment of site.assignedWorkers) {
      if (!workerAssignment.workerId) continue;
      
      const worker = workerAssignment.workerId;
      const totalAttendanceDays = await getWorkerAttendanceSummary(worker._id, site._id);
      
      // Get worker-specific advances
      const workerAdvances = await AdvanceEntry.find({
        workerId: worker._id,
        siteId: site._id
      });
      const totalAdvanceDeducted = workerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
      
      const dailyRate = workerAssignment.salaryOverride || worker.baseSalary || 0;
      const grossSalary = totalAttendanceDays * dailyRate;
      const netSalary = grossSalary - totalAdvanceDeducted;
      
      if (grossSalary > 0) {
        totalSalaryCost += netSalary;
      }
    }
  }

  // Calculate salary costs for temporary workers
  const StrangerWorker = require('../models/StrangerWorker');
  const strangerWorkers = await StrangerWorker.find({});
  
  const groupedStrangerWorkers = strangerWorkers.reduce((acc, worker) => {
    const key = `${worker.name.trim()}-${worker.siteId}-${worker.role.trim()}-${worker.dailyRate}`;
    if (!acc[key]) {
      acc[key] = {
        siteId: worker.siteId,
        name: worker.name.trim(),
        role: worker.role.trim(),
        dailyRate: worker.dailyRate,
        totalAttendanceDays: 0,
      };
    }
    acc[key].totalAttendanceDays += worker.multiplier;
    return acc;
  }, {});

  for (const groupKey in groupedStrangerWorkers) {
    const tempWorker = groupedStrangerWorkers[groupKey];
    
    const tempWorkerAdvances = await AdvanceEntry.find({
      temporaryWorkerName: tempWorker.name,
      siteId: tempWorker.siteId
    });
    const totalAdvanceDeducted = tempWorkerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
    
    const grossSalary = tempWorker.totalAttendanceDays * tempWorker.dailyRate;
    const netSalary = grossSalary - totalAdvanceDeducted;
    
    if (grossSalary > 0) {
      totalSalaryCost += netSalary;
    }
  }

  // Calculate total advance amount
  const totalAdvanceResult = await AdvanceEntry.aggregate([{
    $group: {
      _id: null,
      total: {
        $sum: '$amount'
      }
    }
  }]);
  const totalAdvance = totalAdvanceResult.length > 0 ? totalAdvanceResult[0].total : 0;

  // Calculate total rent amount
  const totalRentResult = await Rent.aggregate([{
    $group: {
      _id: null,
      total: {
        $sum: '$amount'
      }
    }
  }]);
  const totalRent = totalRentResult.length > 0 ? totalRentResult[0].total : 0;

  const overallTotalCost = totalMaterialCost + totalSalaryCost + totalRent + totalAdvance; // Include rent and advance in overall cost

  const recentActivities = await ActivityLog.find({})
    .sort({
      date: -1
    })
    .limit(5)
    .populate('siteId', 'name')
    .populate('supervisorId', 'name');


  res.json({
    totalProjects,
    totalWorkers,
    totalSupervisors,
    supervisorsList,
    totalMaterialCost,
    totalSalaryCost,
    totalAdvance,
    totalRent,
    overallTotalCost,
    recentActivities,
  });
});


// @desc    Get Admin Dashboard Project-wise Summaries
// @route   GET /api/admin/project-summaries
// @access  Private/Admin
const getAdminProjectSummaries = asyncHandler(async (req, res) => {
    const projects = await Site.find({}).select('_id name location startDate')
        .populate('assignedWorkers.workerId', 'name role baseSalary assignedProjects');

    const projectSummaries = [];

    // Helper function to get attendance summary for a worker
    const getWorkerAttendanceSummary = async (workerId, siteId) => {
        const result = await AttendanceEntry.aggregate([
            { 
                $match: { 
                    workerId: workerId,
                    siteId: siteId
                } 
            },
            { $group: { _id: null, totalMultiplier: { $sum: '$multiplier' } } }
        ]);
        return result.length > 0 ? result[0].totalMultiplier : 0;
    };

    for (const project of projects) {
        const workersAssignedCount = await Worker.countDocuments({
            'assignedProjects.siteId': project._id
        });

        // MODIFIED: Include flightCharge in projectMaterialCost calculation
        const projectMaterialCostResult = await MaterialEntry.aggregate([
            { $match: { siteId: project._id } },
            { $group: { _id: null, total: { $sum: { $add: ['$total', { $ifNull: ['$flightCharge', 0] }] } } } }
        ]);
        const projectMaterialCost = projectMaterialCostResult.length > 0 ? projectMaterialCostResult[0].total : 0;

        // FIXED: Calculate project salary cost the same way as reports
        let projectSalaryCost = 0;

        // Calculate salary costs for permanent workers in this project
        for (const workerAssignment of project.assignedWorkers) {
            if (!workerAssignment.workerId) continue;
            
            const worker = workerAssignment.workerId;
            const totalAttendanceDays = await getWorkerAttendanceSummary(worker._id, project._id);
            
            // Get worker-specific advances for this project
            const workerAdvances = await AdvanceEntry.find({
                workerId: worker._id,
                siteId: project._id
            });
            const totalAdvanceDeducted = workerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
            
            const dailyRate = workerAssignment.salaryOverride || worker.baseSalary || 0;
            const grossSalary = totalAttendanceDays * dailyRate;
            const netSalary = grossSalary - totalAdvanceDeducted;
            
            if (grossSalary > 0) {
                projectSalaryCost += netSalary;
            }
        }

        // Calculate salary costs for temporary workers in this project
        const strangerWorkers = await StrangerWorker.find({ siteId: project._id });
        
        const groupedStrangerWorkers = strangerWorkers.reduce((acc, worker) => {
            const key = `${worker.name.trim()}-${worker.role.trim()}-${worker.dailyRate}`;
            if (!acc[key]) {
                acc[key] = {
                    name: worker.name.trim(),
                    role: worker.role.trim(),
                    dailyRate: worker.dailyRate,
                    totalAttendanceDays: 0,
                };
            }
            acc[key].totalAttendanceDays += worker.multiplier;
            return acc;
        }, {});

        for (const groupKey in groupedStrangerWorkers) {
            const tempWorker = groupedStrangerWorkers[groupKey];
            
            const tempWorkerAdvances = await AdvanceEntry.find({
                temporaryWorkerName: tempWorker.name,
                siteId: project._id
            });
            const totalAdvanceDeducted = tempWorkerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
            
            const grossSalary = tempWorker.totalAttendanceDays * tempWorker.dailyRate;
            const netSalary = grossSalary - totalAdvanceDeducted;
            
            if (grossSalary > 0) {
                projectSalaryCost += netSalary;
            }
        }

        // Calculate project advance amount
        const projectAdvanceResult = await AdvanceEntry.aggregate([
            { $match: { siteId: project._id } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const projectAdvance = projectAdvanceResult.length > 0 ? projectAdvanceResult[0].total : 0;

        // Calculate project rent amount
        const projectRentResult = await Rent.aggregate([
            { $match: { site: project._id } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const projectRent = projectRentResult.length > 0 ? projectRentResult[0].total : 0;

        const projectOverallCost = projectMaterialCost + projectSalaryCost + projectRent + projectAdvance;

        projectSummaries.push({
            _id: project._id,
            name: project.name,
            location: project.location,
            startDate: project.startDate,
            totalWorkers: workersAssignedCount,
            totalMaterialCost: projectMaterialCost,
            totalSalaryCost: projectSalaryCost,
            totalAdvance: projectAdvance,
            totalRent: projectRent,
            overallCost: projectOverallCost,
        });
    }

    res.json(projectSummaries);
});


// @desc    Manage supervisor assignments to projects
// @route   PUT /api/admin/supervisors/:id/assign-sites
// @access  Private/Admin
const assignSitesToSupervisor = asyncHandler(async (req, res) => {
  const {
    siteIds
  } = req.body;
  const supervisorId = req.params.id;

  const supervisor = await User.findById(supervisorId);

  if (!supervisor) {
    res.status(404).json({
      message: 'Supervisor not found'
    });
    return;
  }

  if (supervisor.role !== 'supervisor') {
    res.status(400).json({
      message: 'User is not a supervisor'
    });
    return;
  }

  const existingSites = await Site.find({
    _id: {
      $in: siteIds
    }
  });
  if (existingSites.length !== siteIds.length) {
    res.status(400).json({
      message: 'One or more site IDs are invalid'
    });
    return;
  }

  supervisor.assignedSites = siteIds;
  await supervisor.save();

  await Site.updateMany({
    supervisors: supervisorId,
    _id: {
      $nin: siteIds
    }
  }, {
    $pull: {
      supervisors: supervisorId
    }
  });
  await Site.updateMany({
    _id: {
      $in: siteIds
    },
    supervisors: {
      $ne: supervisorId
    }
  }, {
    $push: {
      supervisors: supervisorId
    }
  });

  res.json({
    message: 'Supervisor assigned to sites successfully',
    supervisor: supervisor
  });
});

module.exports = {
  getAdminDashboardSummary,
  getAdminProjectSummaries,
  assignSitesToSupervisor,
};
