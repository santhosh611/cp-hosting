// construction new/backend/controllers/activityController.js
const asyncHandler = require('express-async-handler');
const ActivityLog = require('../models/ActivityLog');
const Site = require('../models/Site');
const User = require('../models/User'); // Ensure User model is imported
const mongoose = require('mongoose');

// @desc    Log daily activity
// @route   POST /api/activities/log
// @access  Private (Supervisor/Admin)
const createActivity = asyncHandler(async (req, res) => { // Changed from logActivity to createActivity for consistency
  const { siteId, message, date } = req.body;

  console.log('--- createActivity START ---');
  console.log('Received body:', { siteId, message, date });
  console.log('User ID:', req.user._id, 'Role:', req.user.role);

  const site = await Site.findById(siteId);
  if (!site) {
    console.warn(`[createActivity] Site not found for ID: ${siteId}`);
    res.status(404).json({ message: 'Site not found' });
    return;
  }
  console.log(`[createActivity] Site found: ${site.name}`);

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(siteId)) {
    console.warn(`[createActivity] Supervisor (${req.user._id}) not authorized for site: ${siteId}`);
    res.status(403).json({ message: 'Not authorized to log activity for this site' });
    return;
  }

  // CRITICAL FIX: Handle dev user IDs for supervisorId field
  let actualSupervisorId;
  if (req.user._id === 'dev_admin_id' || req.user._id === 'dev_supervisor_id') {
      actualSupervisorId = new mongoose.Types.ObjectId('60a7b1b3c9f2b1001a4e2d3f'); // Use a static dummy ObjectId
      console.log(`[createActivity] Using dummy supervisorId for dev user: ${actualSupervisorId.toString()}`);
  } else {
      actualSupervisorId = req.user._id; // Use the actual user's ObjectId
      console.log(`[createActivity] Using actual supervisorId: ${actualSupervisorId.toString()}`);
  }

  try {
    const activityLog = await ActivityLog.create({
      siteId,
      supervisorId: actualSupervisorId, // Use the determined ID
      date: date || Date.now(),
      message,
    });
    console.log(`[createActivity] Activity log created successfully: ${activityLog._id}`);
    res.status(201).json(activityLog);
  } catch (dbError) {
    console.error(`[createActivity] Database error creating activity log: ${dbError.message}`);
    console.error(`[createActivity] DB Error Details:`, dbError); // Log full error details
    if (dbError.name === 'ValidationError') {
      const errors = Object.values(dbError.errors).map(err => err.message);
      res.status(400).json({ message: 'Validation Error', errors });
    } else {
      res.status(500).json({ message: 'Server error during activity logging', error: dbError.message });
    }
  }
  console.log('--- createActivity END ---');
});

// @desc    Get activity logs (filtered by site, date range)
// @route   GET /api/activities
// @access  Private (Admin/Supervisor)
const getActivityLogs = asyncHandler(async (req, res) => {
  const { siteId, startDate, endDate } = req.query;
  let query = {};

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
        res.status(403).json({ message: 'Not authorized to view activity logs for this site' });
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
    const activityLogs = await ActivityLog.find(query)
      .populate('siteId', 'name')
      .populate('supervisorId', 'name role');

    // --- START OF CORRECTION ---
    const formattedActivityLogs = activityLogs.map(log => {
      let supervisorName;
      if (log.supervisorId) {
        // Case 1: Supervisor was found. Use their name, or default to 'Admin' if the name is blank.
        supervisorName = log.supervisorId.name || 'Admin';
      } else {
        // Case 2: Supervisor was NOT found (the dev admin case). Default to 'Admin'.
        supervisorName = 'Admin';
      }

      return {
        ...log.toObject(),
        supervisorId: {
          name: supervisorName,
          role: log.supervisorId?.role || 'admin' // Default role to admin if not found
        }
      };
    });
    // --- END OF CORRECTION ---

    res.json(formattedActivityLogs);
  } catch (dbError) {
    console.error(`[getActivityLogs] Database error fetching activity logs: ${dbError.message}`);
    res.status(500).json({ message: 'Server Error during activity logs fetch.', error: dbError.message });
  }
});

// @desc    Update an activity log
// @route   PUT /api/activities/:id
// @access  Private (Admin/Supervisor)
const updateActivity = asyncHandler(async (req, res) => {
  const { message, date } = req.body;

  console.log('--- updateActivity START ---');
  console.log('Received body for update:', { message, date });
  console.log('Updating ID:', req.params.id);
  console.log('User ID:', req.user._id, 'Role:', req.user.role);

  const activityLog = await ActivityLog.findById(req.params.id);

  if (activityLog) {
    console.log(`[updateActivity] Found activity log: ${activityLog._id}`);
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(activityLog.siteId.toString())) {
      console.warn(`[updateActivity] Supervisor (${req.user._id}) not authorized to update activity log for site: ${activityLog.siteId.toString()}`);
      res.status(403).json({ message: 'Not authorized to update activity log for this site' });
      return;
    }
    // Admin can update any log. Supervisor can only update their own logs.
    if (req.user.role !== 'admin' && activityLog.supervisorId.toString() !== req.user._id.toString()) {
      console.warn(`[updateActivity] User (${req.user._id}) not authorized to update this specific activity log (not admin and not owner).`);
      res.status(403).json({ message: 'Not authorized to update this activity log' });
      return;
    }

    activityLog.message = message !== undefined ? message : activityLog.message;
    activityLog.date = date !== undefined ? date : activityLog.date;

    try {
      const updatedActivity = await activityLog.save();
      console.log(`[updateActivity] Activity log updated successfully: ${updatedActivity._id}`);
      res.json(updatedActivity);
    } catch (dbError) {
      console.error(`[updateActivity] Database error updating activity log: ${dbError.message}`);
      console.error(`[updateActivity] DB Error Details:`, dbError);
      if (dbError.name === 'ValidationError') {
        const errors = Object.values(dbError.errors).map(err => err.message);
        res.status(400).json({ message: 'Validation Error', errors });
      } else {
        res.status(500).json({ message: 'Server error during activity update', error: dbError.message });
      }
    }
  } else {
    console.warn(`[updateActivity] Activity log not found for ID: ${req.params.id}`);
    res.status(404).json({ message: 'Activity log not found' });
  }
  console.log('--- updateActivity END ---');
});

// @desc    Delete an activity log
// @route   DELETE /api/activities/:id
// @access  Private (Admin/Supervisor)
const deleteActivity = asyncHandler(async (req, res) => {
  console.log('--- deleteActivity START ---');
  console.log('Deleting ID:', req.params.id);
  console.log('User ID:', req.user._id, 'Role:', req.user.role);

  const activityLog = await ActivityLog.findById(req.params.id);

  if (activityLog) {
    console.log(`[deleteActivity] Found activity log: ${activityLog._id}`);
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(activityLog.siteId.toString())) {
      console.warn(`[deleteActivity] Supervisor (${req.user._id}) not authorized to delete activity log for site: ${activityLog.siteId.toString()}`);
      res.status(403).json({ message: 'Not authorized to delete activity log for this site' });
      return;
    }
    // Admin can delete any log. Supervisor can only delete their own logs.
    if (req.user.role !== 'admin' && activityLog.supervisorId.toString() !== req.user._id.toString()) {
      console.warn(`[deleteActivity] User (${req.user._id}) not authorized to delete this activity log (not admin and not owner).`);
      res.status(403).json({ message: 'Not authorized to delete this activity log' });
      return;
    }

    try {
      await activityLog.deleteOne();
      console.log(`[deleteActivity] Activity log removed successfully: ${req.params.id}`);
      res.json({ message: 'Activity log removed' });
    } catch (dbError) {
      console.error(`[deleteActivity] Database error deleting activity log: ${dbError.message}`);
      console.error(`[deleteActivity] DB Error Details:`, dbError);
      res.status(500).json({ message: 'Server error during activity deletion', error: dbError.message });
    }
  } else {
    console.warn(`[deleteActivity] Activity log not found for ID: ${req.params.id}`);
    res.status(404).json({ message: 'Activity log not found' });
  }
  console.log('--- deleteActivity END ---');
});

module.exports = {
  createActivity,
  getActivityLogs,
  updateActivity,
  deleteActivity,
};