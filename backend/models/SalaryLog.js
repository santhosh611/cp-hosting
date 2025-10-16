const mongoose = require('mongoose');

const salaryLogSchema = mongoose.Schema({
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: false, // Can be null for temporary workers
  },
  temporaryWorkerName: {
    type: String,
  },
  temporaryWorkerRole: {
    type: String,
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  weekStart: {
    type: Date,
    required: true,
  },
  weekEnd: {
    type: Date,
    required: true,
  },
  totalAttendanceDays: { // Sum of multipliers
    type: Number,
    required: true,
  },
  shiftDetails: [{ // Array to store details like { date: Date, shiftType: String, multiplier: Number }
    date: Date,
    shiftType: String,
    multiplier: Number
  }],
  dailyRateUsed: { // The daily rate used for this calculation (baseSalary or projectSalary)
    type: Number,
    required: true,
  },
  grossSalary: { // totalAttendanceDays * dailyRateUsed
    type: Number,
    required: true,
  },
  totalAdvanceDeducted: {
    type: Number,
    default: 0,
  },
  netSalary: { // grossSalary - totalAdvanceDeducted
    type: Number,
    required: true,
  },
  paid: {
    type: Boolean,
    default: false,
  },
  paymentDate: {
    type: Date,
    default: null,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// MODIFIED: This index now only applies to documents with a valid workerId.
salaryLogSchema.index(
  { workerId: 1, siteId: 1, date: 1 },
  { unique: true, partialFilterExpression: { workerId: { $exists: true, $ne: null } } }
);

// MODIFIED: This new index ensures uniqueness for temporary workers.
salaryLogSchema.index(
  { temporaryWorkerName: 1, siteId: 1, date: 1 },
  { unique: true, partialFilterExpression: { temporaryWorkerName: { $exists: true, $ne: null } } }
);


const SalaryLog = mongoose.model('SalaryLog', salaryLogSchema);

module.exports = SalaryLog;