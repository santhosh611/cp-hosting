// In backend/models/Rent.js

const mongoose = require('mongoose');

const rentSchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Site',
    },
    // --- CHANGE THIS ---
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Changed from true to false
      ref: 'Worker',
    },
    // --- END CHANGE ---
    amount: {
      type: Number,
      required: true,
    },
    toolsDescription: {
      type: String,
      required: true,
      trim: true,
    },
    rentDate: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Rent = mongoose.model('Rent', rentSchema);

module.exports = Rent;