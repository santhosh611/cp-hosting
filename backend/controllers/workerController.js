// construction new/backend/controllers/workerController.js
const asyncHandler = require('express-async-handler');
const Worker = require('../models/Worker');
const Site = require('../models/Site');
const AttendanceEntry = require('../models/AttendanceEntry');
const AdvanceEntry = require('../models/AdvanceEntry');
const SalaryLog = require('../models/SalaryLog');
const mongoose = require('mongoose'); // Ensure mongoose is imported

// @desc    Get all workers
// @route   GET /api/workers
// @access  Private (Admin/Supervisor)
const getWorkers = asyncHandler(async (req, res) => {
  let query = {};
  // Supervisors can only see workers assigned to their sites
  if (req.user.role === 'supervisor') {
    const assignedSites = req.user.assignedSites;
    if (assignedSites && assignedSites.length > 0) {
      // Find workers who have any assignedProjects matching the supervisor's assigned sites
      query['assignedProjects.siteId'] = {
        $in: assignedSites
      };
    } else {
      // If supervisor has no assigned sites, return no workers
      return res.json([]);
    }
  }

  const workers = await Worker.find(query);
  res.json(workers);
});

// @desc    Get single worker by ID
// @route   GET /api/workers/:id
// @access  Private (Admin/Supervisor)
const getWorkerById = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id);

  if (worker) {
    // If supervisor, ensure worker is assigned to one of their sites
    if (req.user.role === 'supervisor') {
      const isAssignedToSupervisorSite = worker.assignedProjects.some(
        project => req.user.assignedSites.includes(project.siteId.toString())
      );
      if (!isAssignedToSupervisorSite) {
        res.status(403).json({
          message: 'Not authorized to view this worker'
        });
        return;
      }
    }
    res.json(worker);
  } else {
    res.status(404).json({
      message: 'Worker not found'
    });
  }
});

// @desc    Create a new worker
// @route   POST /api/workers
// @access  Private (Admin only)
const createWorker = asyncHandler(async (req, res) => {
  const {
    name,
    role,
    baseSalary,
    assignedProjects
  } = req.body;

  // Get default salary from Role if baseSalary not provided
  let determinedBaseSalary = baseSalary;
  if (!determinedBaseSalary && role) {
    // Assuming Role model is correctly imported and accessible
    const Role = mongoose.model('Role'); // Dynamically get model to avoid circular dependency issues if any
    const roleData = await Role.findOne({
      roleName: role
    });
    if (roleData) {
      determinedBaseSalary = roleData.defaultSalary;
    }
  }

  if (!determinedBaseSalary) {
    res.status(400).json({
      message: 'Base salary or a valid role with default salary is required'
    });
    return;
  }

  const worker = await Worker.create({
    name,
    role,
    baseSalary: determinedBaseSalary,
    assignedProjects: [], // Initially empty, will be populated by project assignments
  });

  // Assign worker to projects and update sites if assignedProjects provided
  if (assignedProjects && assignedProjects.length > 0) {
    for (const projectAssignment of assignedProjects) {
      const site = await Site.findById(projectAssignment.siteId);
      if (site) {
        // Add to worker's assignedProjects
        worker.assignedProjects.push({
          siteId: site._id,
          siteName: site.name,
          projectSalary: projectAssignment.projectSalary || null,
        });

        // Add to site's assignedWorkers if not already there
        const isWorkerAssignedToSite = site.assignedWorkers.some(aw => aw.workerId.toString() === worker._id.toString());
        if (!isWorkerAssignedToSite) {
          site.assignedWorkers.push({
            workerId: worker._id,
            name: worker.name,
            role: worker.role,
            salaryOverride: projectAssignment.projectSalary || null,
          });
          await site.save(); // Save site updates
        }
      }
    }
    await worker.save(); // Save worker updates
  }

  res.status(201).json(worker);
});

// @desc    Update a worker
// @route   PUT /api/workers/:id
// @access  Private (Admin only)
const updateWorker = asyncHandler(async (req, res) => {
  const {
    name,
    role,
    baseSalary,
    assignedProjects
  } = req.body;

  const worker = await Worker.findById(req.params.id);

  if (worker) {
    // Old supervisors to remove from sites and workers to remove from projects
    const oldAssignedProjects = [...worker.assignedProjects];

    // Update worker fields
    worker.name = name || worker.name;
    worker.role = role || worker.role;
    worker.baseSalary = baseSalary || worker.baseSalary;

    // Handle assignedProjects update
    if (assignedProjects !== undefined) { // Check if assignedProjects array was provided in the request
      // Projects to remove from worker's assignedProjects (and from Sites)
      const projectsToRemove = oldAssignedProjects.filter(ap => !assignedProjects.some(newAp => newAp.siteId === ap.siteId.toString()));
      for (const projectAssignment of projectsToRemove) {
        await Site.updateMany({
          _id: projectAssignment.siteId
        }, {
          $pull: {
            assignedWorkers: {
              workerId: worker._id
            }
          }
        });
      }

      // Prepare the new assignedProjects array for the worker
      const newAssignedProjectsForWorker = [];
      for (const newProjectAssignment of assignedProjects) {
        const site = await Site.findById(newProjectAssignment.siteId);
        if (site) {
          // Add to worker's assignedProjects
          newAssignedProjectsForWorker.push({
            siteId: site._id,
            siteName: site.name,
            projectSalary: newProjectAssignment.projectSalary || null,
          });

          // Add/Update to site's assignedWorkers
          const existingSiteWorkerIndex = site.assignedWorkers.findIndex(aw => aw.workerId.toString() === worker._id.toString());
          if (existingSiteWorkerIndex !== -1) {
            // Update existing assignment (e.g., salary override, name, role)
            site.assignedWorkers[existingSiteWorkerIndex].name = worker.name; // Use worker.name (updated above)
            site.assignedWorkers[existingSiteWorkerIndex].role = worker.role; // Use worker.role (updated above)
            site.assignedWorkers[existingSiteWorkerIndex].salaryOverride = newProjectAssignment.projectSalary || null;
          } else {
            // Add new worker assignment to site
            site.assignedWorkers.push({
              workerId: worker._id,
              name: worker.name,
              role: worker.role,
              salaryOverride: newProjectAssignment.projectSalary || null,
            });
          }
          await site.save(); // Save site updates
        }
      }
      worker.assignedProjects = newAssignedProjectsForWorker; // Assign the newly constructed array
    }

    const updatedWorker = await worker.save();
    res.json(updatedWorker);
  } else {
    res.status(404).json({
      message: 'Worker not found'
    });
  }
});

// @desc    Delete a worker
// @route   DELETE /api/workers/:id
// @access  Private (Admin only)
const deleteWorker = asyncHandler(async (req, res) => {
  console.log(`[deleteWorker] Attempting to delete worker with ID: ${req.params.id}`);

  const worker = await Worker.findById(req.params.id);

  if (worker) {
    console.log(`[deleteWorker] Found worker: ${worker.name} (${worker._id}). Initiating cascading deletes.`);

    try {
      // Remove worker from all assigned projects/sites
      console.log(`[deleteWorker] Updating sites to pull worker ID: ${worker._id}`);
      await Site.updateMany(
        { 'assignedWorkers.workerId': worker._id },
        { $pull: { assignedWorkers: { workerId: worker._id } } }
      );
      console.log('[deleteWorker] Removed worker from all assigned sites.');
    } catch (error) {
      console.error(`[deleteWorker] Error removing worker from sites: ${error.message}`);
      // Decide if you want to stop here or continue. For now, we'll continue.
    }

    try {
      // Delete all associated attendance entries
      console.log(`[deleteWorker] Deleting attendance entries for worker ID: ${worker._id}`);
      await AttendanceEntry.deleteMany({ workerId: worker._id });
      console.log('[deleteWorker] Deleted associated attendance entries.');
    } catch (error) {
      console.error(`[deleteWorker] Error deleting attendance entries: ${error.message}`);
    }

    try {
      // Delete all associated advance entries
      console.log(`[deleteWorker] Deleting advance entries for worker ID: ${worker._id}`);
      await AdvanceEntry.deleteMany({ workerId: worker._id });
      console.log('[deleteWorker] Deleted associated advance entries.');
    } catch (error) {
      console.error(`[deleteWorker] Error deleting advance entries: ${error.message}`);
    }

    try {
      // Delete all associated salary logs
      console.log(`[deleteWorker] Deleting salary logs for worker ID: ${worker._id}`);
      await SalaryLog.deleteMany({ workerId: worker._id });
      console.log('[deleteWorker] Deleted associated salary logs.');
    } catch (error) {
      console.error(`[deleteWorker] Error deleting salary logs: ${error.message}`);
    }

    try {
      await worker.deleteOne(); // Finally delete the worker document itself
      console.log(`[deleteWorker] Worker ${worker.name} (ID: ${worker._id}) removed successfully.`);
      res.json({ message: 'Worker removed' });
    } catch (error) {
      console.error(`[deleteWorker] Error deleting worker document: ${error.message}`);
      res.status(500).json({ message: 'Failed to delete worker document.', error: error.message });
    }

  } else {
    console.warn(`[deleteWorker] Worker with ID ${req.params.id} not found.`);
    res.status(404).json({ message: 'Worker not found' });
  }
});

module.exports = {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
};