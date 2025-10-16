const mongoose = require('mongoose');

const advanceEntrySchema = mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: false, // Can be null for temporary workers
  },
  temporaryWorkerName: { // Add field for temporary worker name
    type: String,
    required: false,
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: 'General advance',
  },
  recordedBy: { // To track who logged the advance
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, {
  timestamps: true,
});

// Add a validator to ensure either workerId or temporaryWorkerName is present
advanceEntrySchema.pre('validate', function(next) {
  if (!this.workerId && !this.temporaryWorkerName) {
    next(new Error('An advance entry must have either a regular worker or a temporary worker name.'));
  } else if (this.workerId && this.temporaryWorkerName) {
    next(new Error('An advance entry cannot have both a regular worker and a temporary worker name.'));
  } else {
    next();
  }
});


const AdvanceEntry = mongoose.model('AdvanceEntry', advanceEntrySchema);

module.exports = AdvanceEntry;