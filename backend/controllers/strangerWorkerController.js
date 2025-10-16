// construction new/backend/controllers/strangerWorkerController.js
const asyncHandler = require('express-async-handler');
const StrangerWorker = require('../models/StrangerWorker');
const Site = require('../models/Site');
const mongoose = require('mongoose');

const getMultiplier = (shiftType) => {
    switch (shiftType) {
        case 'Full Day': return 1.0;
        case 'One-and-a-Half Day': return 1.5;
        case 'Half Day Morning': return 0.5;
        case 'Half Day Evening': return 0.5;
        default: return 0;
    }
};

// @desc    Add a new stranger worker entry
// @route   POST /api/stranger-workers
// @access  Private (Admin, Supervisor)
const addStrangerWorker = asyncHandler(async (req, res) => {
  const { siteId, name, role, dailyRate, date, shiftType } = req.body;

  if (!siteId || !name || !role || !dailyRate || !date || !shiftType) {
    res.status(400);
    throw new Error('Please provide siteId, name, role, dailyRate, date, and shiftType.');
  }

  const site = await Site.findById(siteId);
  if (!site) {
    res.status(404);
    throw new Error('Site not found.');
  }

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(siteId)) {
    res.status(403);
    throw new Error('Not authorized to add stranger workers for this site.');
  }
  
  const multiplier = getMultiplier(shiftType);

  const newStrangerWorker = await StrangerWorker.create({
    siteId,
    name,
    role,
    dailyRate,
    date: new Date(date).setUTCHours(0, 0, 0, 0),
    recordedBy: req.user._id,
    shiftType,
    multiplier,
  });

  const populatedWorker = await StrangerWorker.findById(newStrangerWorker._id)
    .populate('recordedBy', 'name role');

  res.status(201).json(populatedWorker);
});

// @desc    Get stranger worker entries for a site
// @route   GET /api/stranger-workers
// @access  Private (Admin, Supervisor)
const getStrangerWorkers = asyncHandler(async (req, res) => {
  const { siteId, date } = req.query;

  if (!siteId) {
    res.status(400);
    throw new Error('Please provide a siteId to fetch stranger workers.');
  }

  const site = await Site.findById(siteId);
  if (!site) {
    res.status(404);
    throw new Error('Site not found.');
  }

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(siteId)) {
    res.status(403);
    throw new Error('Not authorized to view stranger workers for this site.');
  }

  const queryOptions = { siteId };
  if (date) {
    queryOptions.date = new Date(date).setUTCHours(0, 0, 0, 0);
  }

  const strangerWorkers = await StrangerWorker.find(queryOptions)
    .populate('recordedBy', 'name role');

  for (const worker of strangerWorkers) {
    if (!worker.recordedBy) {
      worker.recordedBy = { name: 'Admin', role: 'admin' };
    }
  }

  res.json(strangerWorkers);
});

// @desc    Update a stranger worker entry
// @route   PUT /api/stranger-workers/:id
// @access  Private (Admin, Supervisor)
const updateStrangerWorker = asyncHandler(async (req, res) => {
  const { name, role, dailyRate, shiftType } = req.body;
  const strangerWorker = await StrangerWorker.findById(req.params.id);

  if (!strangerWorker) {
    res.status(404);
    throw new Error('Temporary worker entry not found.');
  }

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(strangerWorker.siteId.toString())) {
    res.status(403);
    throw new Error('Not authorized to update temporary workers for this site.');
  }
  
  if (req.user.role !== 'admin' && strangerWorker.recordedBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this entry.');
  }

  strangerWorker.name = name || strangerWorker.name;
  strangerWorker.role = role || strangerWorker.role;
  strangerWorker.dailyRate = dailyRate || strangerWorker.dailyRate;
  
  if (shiftType) {
      strangerWorker.shiftType = shiftType;
      strangerWorker.multiplier = getMultiplier(shiftType);
  }

  const updatedWorker = await strangerWorker.save();
  res.json(updatedWorker);
});

// @desc    Delete a stranger worker entry
// @route   DELETE /api/stranger-workers/:id
// @access  Private (Admin, Supervisor)
const deleteStrangerWorker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const strangerWorker = await StrangerWorker.findById(id);

  if (!strangerWorker) {
    res.status(404);
    throw new Error('Temporary worker entry not found.');
  }

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(strangerWorker.siteId.toString())) {
    res.status(403);
    throw new Error('Not authorized to delete temporary workers for this site.');
  }

  await strangerWorker.deleteOne();
  res.json({ message: 'Temporary worker entry removed successfully.' });
});

module.exports = {
  addStrangerWorker,
  getStrangerWorkers,
  updateStrangerWorker,
  deleteStrangerWorker,
};