// construction new/backend/controllers/rentController.js
const Rent = require('../models/Rent.js');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Site = require('../models/Site.js');

// @desc    Create a new rent entry
// @route   POST /api/rent
// @access  Private/Admin, Supervisor
const createRentEntry = asyncHandler(async (req, res) => {
  const { site, amount, toolsDescription, rentDate } = req.body;

  // Authorization check for supervisors
  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(site)) {
    res.status(403);
    throw new Error('Not authorized to create rent entries for this site.');
  }

  if (!site || !amount || !toolsDescription || !rentDate) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }
  
  // Handle dev user IDs
  let createdBy;
  if (req.user._id === 'dev_admin_id' || req.user._id === 'dev_supervisor_id') {
      createdBy = new mongoose.Types.ObjectId('60a7b1b3c9f2b1001a4e2d3f'); // Use a static dummy ObjectId
  } else {
      createdBy = req.user._id;
  }

  try {
    const rent = new Rent({
      site,
      amount,
      toolsDescription,
      rentDate,
      createdBy: createdBy,
    });
    const createdRent = await rent.save();
    res.status(201).json(createdRent);
  } catch (error) {
    res.status(400);
    throw new Error(`Invalid data provided. Details: ${error.message}`);
  }
});

// @desc    Get rent entries with filters
// @route   GET /api/rent
// @access  Private/Admin, Supervisor
const getRentEntries = asyncHandler(async (req, res) => {
  const { siteId, startDate, endDate } = req.query;
  const filter = {};
  
  // Authorization: Admins can see all, supervisors only their assigned sites
  if (req.user.role === 'supervisor') {
    const assignedSites = req.user.assignedSites.map(id => id.toString());
    if (siteId) {
      if (!assignedSites.includes(siteId)) {
        res.status(403);
        throw new Error('Not authorized to view rent entries for this site.');
      }
      filter.site = siteId;
    } else {
      filter.site = { $in: assignedSites };
    }
  } else if (siteId) {
    filter.site = siteId;
  }
  
  if (startDate && endDate) {
    filter.rentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  const rentEntries = await Rent.find(filter).populate('site', 'name').populate('createdBy', 'name role');
  
  // Format recordedBy name for consistency
  const formattedRentEntries = rentEntries.map(entry => {
    const recordedByName = entry.createdBy ?
      (entry.createdBy.role === 'admin' ? 'Admin' : entry.createdBy.name || 'N/A') :
      'N/A';
    return {
      ...entry.toObject(),
      createdBy: {
        name: recordedByName,
        role: entry.createdBy?.role || 'N/A'
      }
    };
  });
  
  res.json(formattedRentEntries);
});

// @desc    Get a single rent entry by ID
// @route   GET /api/rent/:id
// @access  Private
const getRentById = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id).populate('site', 'name');

  // Authorization check for supervisors
  if (req.user.role === 'supervisor' && rent && !req.user.assignedSites.includes(rent.site.toString())) {
    res.status(403);
    throw new Error('Not authorized to view this rent entry.');
  }

  if (rent) {
    res.json(rent);
  } else {
    res.status(404);
    throw new Error('Rent entry not found');
  }
});

// @desc    Update a rent entry
// @route   PUT /api/rent/:id
// @access  Private/Admin, Supervisor
const updateRentEntry = asyncHandler(async (req, res) => {
  const { amount, toolsDescription, rentDate } = req.body;
  const rent = await Rent.findById(req.params.id);

  if (rent) {
    // Authorization check for supervisors
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(rent.site.toString())) {
      res.status(403);
      throw new Error('Not authorized to update rent entries for this site.');
    }
    
    // Admin can update any log. Supervisor can only update their own logs.
    if (req.user.role !== 'admin' && rent.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this rent entry.');
    }

    rent.amount = amount !== undefined ? amount : rent.amount;
    rent.toolsDescription = toolsDescription !== undefined ? toolsDescription : rent.toolsDescription;
    rent.rentDate = rentDate !== undefined ? rentDate : rent.rentDate;
    
    const updatedRent = await rent.save();
    res.json(updatedRent);
  } else {
    res.status(404);
    throw new Error('Rent entry not found');
  }
});

// @desc    Delete a rent entry
// @route   DELETE /api/rent/:id
// @access  Private/Admin, Supervisor
const deleteRentEntry = asyncHandler(async (req, res) => {
  const rent = await Rent.findById(req.params.id);

  if (rent) {
    // Authorization check for supervisors
    if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(rent.site.toString())) {
      res.status(403);
      throw new Error('Not authorized to delete rent entries for this site.');
    }

    // Admin can delete any log. Supervisor can only delete their own logs.
    if (req.user.role !== 'admin' && rent.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to delete this rent entry.');
    }

    await rent.deleteOne();
    res.json({ message: 'Rent entry removed' });
  } else {
    res.status(404);
    throw new Error('Rent entry not found');
  }
});

module.exports = {
  createRentEntry,
  getRentEntries,
  getRentById,
  updateRentEntry,
  deleteRentEntry,
};