// construction new/backend/models/AttendanceEntry.js
const mongoose = require('mongoose');

const attendanceEntrySchema = mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    // Ensure only one entry per worker per site per day (could use unique compound index)
  },
  shiftType: { // Changed from previous multiplier logic to store actual shift type
    type: String,
    enum: ['Full Day', 'One-and-a-Half Day', 'Half Day Morning', 'Half Day Evening', 'Absent', 'Leave'], // Added Absent and Leave
    required: true,
  },
  multiplier: { // Will be calculated based on shiftType
    type: Number,
    required: true,
    min: 0,
  },
  status: { // NEW: To store 'Present', 'Absent', 'Leave' etc.
    type: String,
    enum: ['Present', 'Absent', 'Leave'],
    required: true,
    default: 'Present'
  },
  checkInTime: { // Optional: for detailed attendance tracking
    type: String, // Or Date, depending on granularity needed
  },
  checkOutTime: { // Optional: for detailed attendance tracking
    type: String, // Or Date
  },
  recordedBy: { // ADDED THIS FIELD: To track who logged the attendance
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // It should be required if every entry needs an originator
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound unique index to prevent duplicate attendance entries for the same worker on the same site on the same day
attendanceEntrySchema.index({
  workerId: 1,
  siteId: 1,
  date: 1
}, {
  unique: true
});

const AttendanceEntry = mongoose.model('AttendanceEntry', attendanceEntrySchema);

module.exports = AttendanceEntry;