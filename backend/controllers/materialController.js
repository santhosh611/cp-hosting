// construction new/backend/controllers/materialController.js
const asyncHandler = require('express-async-handler');
const MaterialEntry = require('../models/MaterialEntry');
const Site = require('../models/Site');
const User = require('../models/User');
const mongoose = require('mongoose');


// @desc    Log a new material entry
// @route   POST /api/materials
// @access  Private (Supervisor/Admin)
const createMaterialLog = asyncHandler(async (req, res) => {
  // Destructure request body, providing defaults for optional fields.
  const {
    siteId,
    material = 'N/A',
    brand = 'N/A',
    quantity,
    unit,
    pricePerUnit,
    date,
    flightCharge
  } = req.body;

  // --- START OF CORRECTION ---
  // Correctly parse numeric inputs and remove redundant code.
  const numQuantity = parseFloat(quantity);
  const numPricePerUnit = pricePerUnit ? parseFloat(pricePerUnit) : 0;
  const numFlightCharge = flightCharge ? parseFloat(flightCharge) : 0;

  // Server-side validation for the parsed quantity.
  if (isNaN(numQuantity) || numQuantity <= 0) {
    res.status(400);
    throw new Error('Quantity must be a valid positive number.');
  }

  // Calculate total using the correctly parsed numbers. This is the single declaration.
  const calculatedTotal = numQuantity * numPricePerUnit;


  const site = await Site.findById(siteId);
  if (!site) {
    res.status(404).json({ message: 'Site not found' });
    return;
  }

  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(siteId)) {
    res.status(403).json({ message: 'Not authorized to log materials for this site' });
    return;
  }

  let actualRecordedBy;

  // Handle the special 'dev_admin_id', which is not a valid ObjectId, to prevent the crash.
  if (req.user._id === 'dev_admin_id') {
    // WORKAROUND: This is a placeholder ID. For a permanent solution,
    // replace this with a real admin user's ObjectId from your database.
    actualRecordedBy = '685fdcc3e654af2be21a1e57';
  } else {
    // For all other real users, use their actual _id.
    actualRecordedBy = req.user._id;
  }

  try {
    const materialEntry = await MaterialEntry.create({
      siteId,
      material,
      brand,
      quantity: numQuantity,         // Use correctly parsed quantity
      unit,
      pricePerUnit: numPricePerUnit, // Use correctly parsed price
      total: calculatedTotal,        // Use the single calculated total
      flightCharge: numFlightCharge, // Use correctly parsed flight charge
      date: new Date(date).setUTCHours(0, 0, 0, 0),
      recordedBy: actualRecordedBy,
    });
    console.log('MaterialEntry created successfully:', materialEntry._id);
    res.status(201).json(materialEntry);
  } catch (dbError) {
    console.error('Database error creating MaterialEntry:', dbError.message);
    if (dbError.name === 'ValidationError') {
      const errors = Object.values(dbError.errors).map(err => err.message);
      res.status(400).json({ message: 'Validation Error', errors });
    } else {
      res.status(500).json({ message: 'Server Error during material creation', error: dbError.message });
    }
  }
});

// @desc    Get material entries
// @route   GET /api/materials
// @access  Private (Admin/Supervisor)
const getMaterialLogs = asyncHandler(async (req, res) => {
  const { siteId, material, startDate, endDate } = req.query;
  let query = {};

  if (material) {
    query.material = { $regex: material, $options: 'i' };
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
        res.status(403).json({ message: 'Not authorized to view material logs for this site' });
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
    const materialLogs = await MaterialEntry.find(query)
      .populate('siteId', 'name')
      .populate('recordedBy', 'name role')
      .sort({ date: -1 });

   
    const formattedMaterialLogs = materialLogs.map(log => {
        let recordedByName;

        if (log.recordedBy) {
            // Case 1: User was found successfully.
            // If they have a name, use it. Otherwise, default to 'Admin'.
            recordedByName = log.recordedBy.name || 'Admin';
        } else {
            // Case 2: User was NOT found (population returned null).
            // This is our special case for the dev admin.
            recordedByName = 'Admin';
        }


        return {
            ...log.toObject(),
            recordedBy: {
                name: recordedByName,
                role: log.recordedBy?.role || 'admin' // Default role to admin if not found
            }
        };
    });

    res.json(formattedMaterialLogs);
  } catch (dbError) {
    console.error('Database error fetching material logs:', dbError.message);
    res.status(500).json({ message: 'Server Error during material logs fetch.', error: dbError.message });
  }
});

// @desc    Update a material entry
// @route   PUT /api/materials/:id
// @access  Private (Supervisor/Admin)
const updateMaterialLog = asyncHandler(async (req, res) => {
  const { material, brand, quantity, unit, pricePerUnit, date, flightCharge } = req.body;

  console.log('--- updateMaterialLog START ---');
  console.log('Received body for update:', { material, brand, quantity, unit, pricePerUnit, date, flightCharge });
  console.log('Updating ID:', req.params.id);
  console.log('User role:', req.user.role);

  const materialEntry = await MaterialEntry.findById(req.params.id);

  if (!materialEntry) {
    console.error('Material log not found for update:', req.params.id);
    res.status(404).json({ message: 'Material log not found' });
    return;
  }
  console.log('Found materialEntry:', materialEntry._id);

  // Authorization check
  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(materialEntry.siteId.toString())) {
    console.warn('Unauthorized attempt by supervisor to update material log for site:', materialEntry.siteId.toString());
    res.status(403).json({ message: 'Not authorized to update material log for this site' });
    return;
  }

  // Apply updates conditionally
  materialEntry.material = material !== undefined ? material : materialEntry.material;
  materialEntry.brand = brand !== undefined ? brand : materialEntry.brand;
  materialEntry.quantity = quantity !== undefined ? quantity : materialEntry.quantity;
  materialEntry.unit = unit !== undefined ? unit : materialEntry.unit;

  // Handle pricePerUnit: if explicitly sent as null, empty string or not a valid number, set to null.
  // Otherwise, if it's a number, update. If not sent (undefined), keep existing.
  if (pricePerUnit === null || pricePerUnit === '' || (typeof pricePerUnit !== 'number' && pricePerUnit !== undefined)) {
      materialEntry.pricePerUnit = null;
  } else if (typeof pricePerUnit === 'number') {
      materialEntry.pricePerUnit = pricePerUnit;
  }

  // Handle flightCharge: if explicitly sent as null, empty string or not a valid number, set to null.
  // Otherwise, if it's a number, update. If not sent (undefined), keep existing.
  if (flightCharge === null || flightCharge === '' || (typeof flightCharge !== 'number' && flightCharge !== undefined)) {
      materialEntry.flightCharge = null;
  } else if (typeof flightCharge === 'number') {
      materialEntry.flightCharge = flightCharge;
  }

  // Recalculate total based on updated quantity and pricePerUnit
  const updatedQuantity = materialEntry.quantity;
  const updatedPricePerUnit = materialEntry.pricePerUnit || 0;
  materialEntry.total = updatedQuantity * updatedPricePerUnit;

  materialEntry.date = date ? new Date(date).setUTCHours(0, 0, 0, 0) : materialEntry.date;

  console.log('Saving updated materialEntry:', materialEntry);
  try {
    const updatedMaterialEntry = await materialEntry.save();
    console.log('MaterialEntry updated successfully:', updatedMaterialEntry._id);
    res.json(updatedMaterialEntry);
  } catch (dbError) {
    console.error('Database error updating MaterialEntry:', dbError.message);
    if (dbError.name === 'ValidationError') {
      const errors = Object.values(dbError.errors).map(err => err.message);
      res.status(400).json({ message: 'Validation Error', errors });
    } else {
      res.status(500).json({ message: 'Server Error during material update', error: dbError.message });
    }
  }
  console.log('--- updateMaterialLog END ---');
});

// @desc    Delete a material entry
// @route   DELETE /api/materials/:id
// @access  Private (Admin/Supervisor)
const deleteMaterialLog = asyncHandler(async (req, res) => {
  console.log('--- deleteMaterialLog START ---');
  console.log('Deleting ID:', req.params.id);
  console.log('User role:', req.user.role);

  const materialEntry = await MaterialEntry.findById(req.params.id);

  if (!materialEntry) {
    console.error('Material log not found for deletion:', req.params.id);
    res.status(404).json({ message: 'Material log not found' });
    return;
  }
  console.log('Found materialEntry for deletion:', materialEntry._id);

  // Authorization check
  if (req.user.role === 'supervisor' && !req.user.assignedSites.includes(materialEntry.siteId.toString())) {
    console.warn('Unauthorized attempt by supervisor to delete material log for site:', materialEntry.siteId.toString());
    res.status(403).json({ message: 'Not authorized to delete material log for this site' });
    return;
  }

  try {
    await materialEntry.deleteOne(); // Use deleteOne()
    console.log('Material log removed successfully:', req.params.id);
    res.json({ message: 'Material log removed' });
  } catch (dbError) {
    console.error('Database error deleting MaterialEntry:', dbError.message);
    res.status(500).json({ message: 'Server Error during material deletion', error: dbError.message });
  }
  console.log('--- deleteMaterialLog END ---');
});

module.exports = {
  createMaterialLog,
  getMaterialLogs,
  updateMaterialLog,
  deleteMaterialLog,
};