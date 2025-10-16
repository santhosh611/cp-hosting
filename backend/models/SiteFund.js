const mongoose = require('mongoose');

const siteFundSchema = mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    required: true,
  },
  paymentNumber: {
    type: Number,
    required: true,
    default: 1,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  threshold: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 80,
  },
  thresholdType: {
    type: String,
    enum: ['percentage', 'cash'],
    default: 'percentage',
  },
  thresholdCash: {
    type: Number,
    min: 0,
    default: null,
  },
  description: {
    type: String,
    trim: true,
  },
  allocatedDate: {
    type: Date,
    default: Date.now,
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Virtual field to calculate total expenses
siteFundSchema.virtual('totalExpenses').get(function() {
  return this.materialExpenses + this.advanceExpenses + this.rentExpenses + this.salaryExpenses;
});

// Virtual field to calculate remaining balance
siteFundSchema.virtual('remainingBalance').get(function() {
  return this.amount - this.totalExpenses;
});

// Virtual field to calculate usage percentage
siteFundSchema.virtual('usagePercentage').get(function() {
  return this.amount > 0 ? (this.totalExpenses / this.amount) * 100 : 0;
});

// Virtual field to check if threshold is exceeded
siteFundSchema.virtual('isThresholdExceeded').get(function() {
  return this.usagePercentage >= this.threshold;
});

// Create compound index for unique siteId + paymentNumber combination
siteFundSchema.index({ siteId: 1, paymentNumber: 1 }, { unique: true });

// Include virtual fields when converting to JSON
siteFundSchema.set('toJSON', { virtuals: true });
siteFundSchema.set('toObject', { virtuals: true });

const SiteFund = mongoose.model('SiteFund', siteFundSchema);

module.exports = SiteFund;
