// construction new/backend/models/StrangerWorker.js

const mongoose = require('mongoose');

const strangerWorkerSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  dailyRate: {
    type: Number,
    required: true,
    min: 0,
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
  shiftType: {
    type: String,
    enum: ['Full Day', 'One-and-a-Half Day', 'Half Day Morning', 'Half Day Evening', 'Absent', 'Leave'],
    required: true,
  },
  multiplier: {
    type: Number,
    required: true,
    min: 0,
  },
}, { timestamps: true });

const StrangerWorker = mongoose.model('StrangerWorker', strangerWorkerSchema);

module.exports = StrangerWorker;