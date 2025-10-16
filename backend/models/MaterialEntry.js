// construction new/backend/models/MaterialEntry.js
const mongoose = require('mongoose');

const MaterialEntrySchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  material: {
    type: String,
    required: true,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  pricePerUnit: {
    type: Number,
    // Removed 'min: 0' and 'default' to allow explicit null for optional field
    // Mongoose will store 'null' if client sends null or an empty string is converted to null
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  flightCharge: {
    type: Number,
    // Removed 'min: 0' and 'default' to allow explicit null for optional field
  },
  date: {
    type: Date,
    required: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('MaterialEntry', MaterialEntrySchema);