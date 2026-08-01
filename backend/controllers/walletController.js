// backend/controllers/walletController.js
const asyncHandler = require('express-async-handler');
const SiteFund = require('../models/SiteFund');
const Site = require('../models/Site');
const MaterialEntry = require('../models/MaterialEntry');
const AdvanceEntry = require('../models/AdvanceEntry');
const AttendanceEntry = require('../models/AttendanceEntry');
const Rent = require('../models/Rent');
const SalaryLog = require('../models/SalaryLog');
const mongoose = require('mongoose');

// @desc    Get wallet summary with site expenses
// @route   GET /api/wallet/summary
// @access  Private/Admin
const getWalletSummary = asyncHandler(async (req, res) => {
  try {
    // Get all site funds grouped by site
    const siteFunds = await SiteFund.find({ isActive: true })
      .populate('siteId', 'name location')
      .populate('allocatedBy', 'name')
      .sort({ siteId: 1, paymentNumber: 1 });

    // Group funds by site and calculate totals
    const siteGroups = {};
    siteFunds.forEach(fund => {
      // Skip orphaned funds whose site was deleted
      if (!fund.siteId || !fund.siteId._id) return;

      const siteId = fund.siteId._id.toString();
      if (!siteGroups[siteId]) {
        siteGroups[siteId] = {
          siteId: fund.siteId,
          payments: [],
          totalAllocatedAmount: 0,
          threshold: fund.threshold,
          thresholdType: fund.thresholdType || 'percentage',
        };
      }
      siteGroups[siteId].payments.push(fund);
      siteGroups[siteId].totalAllocatedAmount += fund.amount;
      // Use the latest payment's threshold settings for the site
      siteGroups[siteId].threshold = fund.threshold;
      siteGroups[siteId].thresholdType = fund.thresholdType || 'percentage';
    });


    // Calculate expenses for each site
    const siteExpensePromises = Object.values(siteGroups).map(async (siteGroup) => {
      const siteId = siteGroup.siteId._id;
      
      // Calculate material expenses
      const materialExpenses = await MaterialEntry.aggregate([
        { $match: { siteId: siteId } },
        { $group: { _id: null, total: { $sum: { $add: ['$total', { $ifNull: ['$flightCharge', 0] }] } } } }
      ]);
      const totalMaterialExpenses = materialExpenses[0]?.total || 0;

      // Calculate advance expenses
      const advanceExpenses = await AdvanceEntry.aggregate([
        { $match: { siteId: siteId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalAdvanceExpenses = advanceExpenses[0]?.total || 0;

      // Calculate rent expenses
      const rentExpenses = await Rent.aggregate([
        { $match: { site: siteId } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalRentExpenses = rentExpenses[0]?.total || 0;

      // Calculate salary expenses using the correct method (same as admin dashboard)
      // This replaces the old SalaryLog aggregation method
      let totalSalaryExpenses = 0;
      
      // Get the site data with assigned workers
      const siteData = await Site.findById(siteId)
        .populate('assignedWorkers.workerId', 'name role baseSalary assignedProjects');
      
      if (siteData) {
        // Helper function to get attendance summary for a worker
        const getWorkerAttendanceSummary = async (workerId, siteId) => {
          const result = await AttendanceEntry.aggregate([
            { 
              $match: { 
                workerId: workerId,
                siteId: siteId
              } 
            },
            { $group: { _id: null, totalMultiplier: { $sum: '$multiplier' } } }
          ]);
          return result.length > 0 ? result[0].totalMultiplier : 0;
        };

        // Calculate salary costs for permanent workers in this site
        for (const workerAssignment of siteData.assignedWorkers) {
          if (!workerAssignment.workerId) continue;
          
          const worker = workerAssignment.workerId;
          const totalAttendanceDays = await getWorkerAttendanceSummary(worker._id, siteId);
          
          // Get worker-specific advances for this site
          const workerAdvances = await AdvanceEntry.find({
            workerId: worker._id,
            siteId: siteId
          });
          const totalAdvanceDeducted = workerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
          
          const dailyRate = workerAssignment.salaryOverride || worker.baseSalary || 0;
          const grossSalary = totalAttendanceDays * dailyRate;
          const netSalary = grossSalary - totalAdvanceDeducted;
          
          if (grossSalary > 0) {
            totalSalaryExpenses += netSalary;
          }
        }

        // Calculate salary costs for temporary workers in this site
        const StrangerWorker = require('../models/StrangerWorker');
        const strangerWorkers = await StrangerWorker.find({ siteId: siteId });
        
        const groupedStrangerWorkers = strangerWorkers.reduce((acc, worker) => {
          const key = `${worker.name.trim()}-${worker.role.trim()}-${worker.dailyRate}`;
          if (!acc[key]) {
            acc[key] = {
              name: worker.name.trim(),
              role: worker.role.trim(),
              dailyRate: worker.dailyRate,
              totalAttendanceDays: 0,
            };
          }
          acc[key].totalAttendanceDays += worker.multiplier;
          return acc;
        }, {});

        for (const groupKey in groupedStrangerWorkers) {
          const tempWorker = groupedStrangerWorkers[groupKey];
          
          const tempWorkerAdvances = await AdvanceEntry.find({
            temporaryWorkerName: tempWorker.name,
            siteId: siteId
          });
          const totalAdvanceDeducted = tempWorkerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
          
          const grossSalary = tempWorker.totalAttendanceDays * tempWorker.dailyRate;
          const netSalary = grossSalary - totalAdvanceDeducted;
          
          if (grossSalary > 0) {
            totalSalaryExpenses += netSalary;
          }
        }
      }

      const totalExpenses = totalMaterialExpenses + totalAdvanceExpenses + totalRentExpenses + totalSalaryExpenses;
      const remainingBalance = siteGroup.totalAllocatedAmount - totalExpenses;
      const usagePercentage = siteGroup.totalAllocatedAmount > 0 ? (totalExpenses / siteGroup.totalAllocatedAmount) * 100 : 0;
      
      // Check threshold based on type
      let isThresholdExceeded = false;
      if (siteGroup.thresholdType === 'percentage') {
        isThresholdExceeded = usagePercentage >= siteGroup.threshold;
      } else if (siteGroup.thresholdType === 'cash') {
        isThresholdExceeded = totalExpenses >= siteGroup.threshold;
      }

      return {
        _id: siteGroup.siteId._id,
        siteId: siteGroup.siteId,
        totalAllocatedAmount: siteGroup.totalAllocatedAmount,
        threshold: siteGroup.threshold,
        thresholdType: siteGroup.thresholdType,
        payments: siteGroup.payments,
        expenses: {
          material: totalMaterialExpenses,
          advance: totalAdvanceExpenses,
          rent: totalRentExpenses,
          salary: totalSalaryExpenses,
          total: totalExpenses,
        },
        remainingBalance,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        isThresholdExceeded,
      };
    });

    const sitesWithExpenses = await Promise.all(siteExpensePromises);

    // Calculate overall totals
    const overallTotals = sitesWithExpenses.reduce((acc, site) => {
      acc.totalFunds += site.totalAllocatedAmount;
      acc.totalExpenses += site.expenses.total;
      acc.totalRemaining += site.remainingBalance;
      return acc;
    }, { totalFunds: 0, totalExpenses: 0, totalRemaining: 0 });

    res.json({
      sites: sitesWithExpenses,
      totals: overallTotals,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get detailed expense breakdown for a specific site
// @route   GET /api/wallet/site/:siteId/breakdown
// @access  Private/Admin
const getSiteExpenseBreakdown = asyncHandler(async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // Validate siteId
    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }

    // Get site fund information
    const siteFund = await SiteFund.findOne({ siteId, isActive: true })
      .populate('siteId', 'name location')
      .populate('allocatedBy', 'name');

    if (!siteFund) {
      return res.status(404).json({ message: 'Site fund not found' });
    }

    // Get detailed breakdown - fetch all records
    const [materials, advances, rents, salaries] = await Promise.all([
      MaterialEntry.find({ siteId })
        .populate('recordedBy', 'name')
        .sort({ date: -1 }),
      AdvanceEntry.find({ siteId })
        .populate('workerId', 'name')
        .populate('recordedBy', 'name')
        .sort({ date: -1 }),
      Rent.find({ site: siteId })
        .populate('createdBy', 'name')
        .sort({ rentDate: -1 }),
      SalaryLog.find({ siteId })
        .populate('workerId', 'name')
        .sort({ date: -1 }),
    ]);

    // Calculate totals for each category
    const materialTotal = materials.reduce((sum, item) => sum + (item.total || 0) + (item.flightCharge || 0), 0);
    const advanceTotal = advances.reduce((sum, item) => sum + (item.amount || 0), 0);
    const rentTotal = rents.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // Calculate salary total using the correct method (same as admin dashboard)
    // Instead of using SalaryLog aggregation, calculate based on attendance
    let salaryTotal = 0;
    
    // Get the site data with assigned workers
    const siteData = await Site.findById(siteId)
      .populate('assignedWorkers.workerId', 'name role baseSalary assignedProjects');
    
    if (siteData) {
      // Helper function to get attendance summary for a worker
      const getWorkerAttendanceSummary = async (workerId, siteId) => {
        const result = await AttendanceEntry.aggregate([
          { 
            $match: { 
              workerId: workerId,
              siteId: siteId
            } 
          },
          { $group: { _id: null, totalMultiplier: { $sum: '$multiplier' } } }
        ]);
        return result.length > 0 ? result[0].totalMultiplier : 0;
      };

      // Calculate salary costs for permanent workers in this site
      for (const workerAssignment of siteData.assignedWorkers) {
        if (!workerAssignment.workerId) continue;
        
        const worker = workerAssignment.workerId;
        const totalAttendanceDays = await getWorkerAttendanceSummary(worker._id, siteId);
        
        // Get worker-specific advances for this site
        const workerAdvances = await AdvanceEntry.find({
          workerId: worker._id,
          siteId: siteId
        });
        const totalAdvanceDeducted = workerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
        
        const dailyRate = workerAssignment.salaryOverride || worker.baseSalary || 0;
        const grossSalary = totalAttendanceDays * dailyRate;
        const netSalary = grossSalary - totalAdvanceDeducted;
        
        if (grossSalary > 0) {
          salaryTotal += netSalary;
        }
      }

      // Calculate salary costs for temporary workers in this site
      const StrangerWorker = require('../models/StrangerWorker');
      const strangerWorkers = await StrangerWorker.find({ siteId: siteId });
      
      const groupedStrangerWorkers = strangerWorkers.reduce((acc, worker) => {
        const key = `${worker.name.trim()}-${worker.role.trim()}-${worker.dailyRate}`;
        if (!acc[key]) {
          acc[key] = {
            name: worker.name.trim(),
            role: worker.role.trim(),
            dailyRate: worker.dailyRate,
            totalAttendanceDays: 0,
          };
        }
        acc[key].totalAttendanceDays += worker.multiplier;
        return acc;
      }, {});

      for (const groupKey in groupedStrangerWorkers) {
        const tempWorker = groupedStrangerWorkers[groupKey];
        
        const tempWorkerAdvances = await AdvanceEntry.find({
          temporaryWorkerName: tempWorker.name,
          siteId: siteId
        });
        const totalAdvanceDeducted = tempWorkerAdvances.reduce((sum, adv) => sum + adv.amount, 0);
        
        const grossSalary = tempWorker.totalAttendanceDays * tempWorker.dailyRate;
        const netSalary = grossSalary - totalAdvanceDeducted;
        
        if (grossSalary > 0) {
          salaryTotal += netSalary;
        }
      }
    }

    const totalExpenses = materialTotal + advanceTotal + rentTotal + salaryTotal;
    const remainingBalance = siteFund.totalAllocatedAmount - totalExpenses;
    const usagePercentage = siteFund.totalAllocatedAmount > 0 ? (totalExpenses / siteFund.totalAllocatedAmount) * 100 : 0;
    
    // Check threshold based on type
    let isThresholdExceeded = false;
    if (siteFund.thresholdType === 'percentage') {
      isThresholdExceeded = usagePercentage >= siteFund.threshold;
    } else if (siteFund.thresholdType === 'cash') {
      isThresholdExceeded = totalExpenses >= siteFund.threshold;
    }

    res.json({
      siteFund: siteFund.toObject(),
      breakdown: {
        materials: {
          items: materials,
          total: materialTotal,
        },
        advances: {
          items: advances,
          total: advanceTotal,
        },
        rents: {
          items: rents,
          total: rentTotal,
        },
        salaries: {
          items: salaries,
          total: salaryTotal,
        },
      },
      summary: {
        totalAllocated: siteFund.totalAllocatedAmount,
        totalExpenses,
        remainingBalance,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        isThresholdExceeded,
        threshold: siteFund.threshold,
        thresholdType: siteFund.thresholdType || 'percentage',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Add funds to a site
// @route   POST /api/wallet/add-funds
// @access  Private/Admin
const addSiteFunds = asyncHandler(async (req, res) => {
  try {
    const { siteId, amount, threshold, thresholdType, description } = req.body;

    console.log('=== ADD FUNDS REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    console.log('User from request:', req.user);
    console.log('========================');

    // Validate required fields
    if (!siteId) {
      console.log('Validation failed: siteId is missing');
      return res.status(400).json({ message: 'Site ID is required', field: 'siteId' });
    }
    
    if (!amount && amount !== 0) {
      console.log('Validation failed: amount is missing');
      return res.status(400).json({ message: 'Amount is required', field: 'amount' });
    }
    
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      console.log('Validation failed: amount is invalid:', amount);
      return res.status(400).json({ message: 'Amount must be a positive number', field: 'amount' });
    }

    // Validate user authentication
    if (!req.user || !req.user._id) {
      console.log('Authentication failed: req.user is missing or invalid');
      return res.status(401).json({ message: 'User authentication required' });
    }

    // Validate siteId
    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      console.log('Validation failed: invalid siteId format:', siteId);
      return res.status(400).json({ message: 'Invalid site ID format', field: 'siteId' });
    }

    // Check if site exists
    const site = await Site.findById(siteId);
    if (!site) {
      console.log('Site not found:', siteId);
      return res.status(404).json({ message: 'Site not found', field: 'siteId' });
    }

    console.log('Site found:', site.name);
    
    // Debug: Check existing payments for this site
    const existingPayments = await SiteFund.find({ siteId, isActive: true })
      .select('paymentNumber amount')
      .sort({ paymentNumber: 1 });
    console.log('Existing payments for this site:', existingPayments);

    // Validate threshold and threshold type
    const thresholdTypeValue = thresholdType || 'percentage';
    const thresholdValue = threshold ? parseFloat(threshold) : (thresholdTypeValue === 'percentage' ? 80 : 0);
    
    console.log('=== THRESHOLD VALIDATION ===');
    console.log('thresholdType received:', thresholdType);
    console.log('thresholdTypeValue:', thresholdTypeValue);
    console.log('threshold received:', threshold);
    console.log('thresholdValue parsed:', thresholdValue);
    console.log('===============================');
    
    if (thresholdTypeValue === 'percentage') {
      if (isNaN(thresholdValue) || thresholdValue < 0 || thresholdValue > 100) {
        console.log('Validation failed: invalid percentage threshold:', threshold);
        return res.status(400).json({ message: 'Percentage threshold must be between 0 and 100', field: 'threshold' });
      }
    } else if (thresholdTypeValue === 'cash') {
      if (isNaN(thresholdValue) || thresholdValue < 0) {
        console.log('Validation failed: invalid cash threshold:', threshold);
        return res.status(400).json({ message: 'Cash threshold must be a positive number', field: 'threshold' });
      }
    } else {
      console.log('Validation failed: invalid threshold type:', thresholdType);
      return res.status(400).json({ message: 'Threshold type must be either "percentage" or "cash"', field: 'thresholdType' });
    }

    // Use atomic operation to get next payment number and create payment
    console.log('Starting atomic payment creation process');
    
    let savedFund;
    
    // Try to create payment with atomic payment number generation
    try {
      // Use MongoDB transaction for atomic operation
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Get the highest payment number for this site within the transaction
          const maxPaymentResult = await SiteFund.aggregate([
            { $match: { siteId: new mongoose.Types.ObjectId(siteId) } }, // Remove isActive filter
            { $group: { _id: null, maxPayment: { $max: "$paymentNumber" } } }
          ], { session });
          
          const maxPayment = maxPaymentResult.length > 0 ? maxPaymentResult[0].maxPayment : 0;
          const nextPaymentNumber = (maxPayment || 0) + 1;
          console.log('Max payment found (atomic):', maxPayment);
          console.log('Next payment number (atomic):', nextPaymentNumber);
          
          // Create new site fund within the transaction
          const siteFund = new SiteFund({
            siteId,
            paymentNumber: nextPaymentNumber,
            amount: parseFloat(amount),
            threshold: thresholdValue,
            thresholdType: thresholdTypeValue,
            description: description || '',
            allocatedBy: req.user._id,
          });

          console.log('Creating SiteFund in transaction:', {
            siteId: siteFund.siteId,
            paymentNumber: siteFund.paymentNumber,
            amount: siteFund.amount
          });

          // Save within transaction
          const results = await siteFund.save({ session });
          savedFund = results;
          console.log('Successfully saved fund in transaction:', savedFund._id);
        });
        
      } finally {
        await session.endSession();
      }
      
    } catch (transactionError) {
      console.log('Transaction failed, falling back to simple retry mechanism');
      console.log('Transaction error:', transactionError.message);
      
      // Fallback to simple approach if transactions aren't supported
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          console.log(`Fallback attempt ${attempt}`);
          
          // Get current max payment number more reliably
          const maxPaymentResult = await SiteFund.aggregate([
            { $match: { siteId: new mongoose.Types.ObjectId(siteId) } }, // Remove isActive filter
            { $group: { _id: null, maxPayment: { $max: "$paymentNumber" } } }
          ]);
          
          const maxPayment = maxPaymentResult.length > 0 ? maxPaymentResult[0].maxPayment : 0;
          const nextPaymentNumber = (maxPayment || 0) + 1;
            
          console.log(`Attempt ${attempt} - Max payment found:`, maxPayment);
          console.log(`Attempt ${attempt} - Next payment number:`, nextPaymentNumber);
          
          // Create new site fund
          const siteFund = new SiteFund({
            siteId,
            paymentNumber: nextPaymentNumber,
            amount: parseFloat(amount),
            threshold: thresholdValue,
            thresholdType: thresholdTypeValue,
            description: description || '',
            allocatedBy: req.user._id,
          });

          savedFund = await siteFund.save();
          console.log(`Attempt ${attempt} successful:`, savedFund._id);
          break;
          
        } catch (saveError) {
          console.log(`Attempt ${attempt} failed:`, saveError.message);
          console.log(`Error code:`, saveError.code);
          console.log(`Error details:`, saveError);
          
          if (saveError.code === 11000) {
            if (attempt < 10) {
              // Add exponential backoff with jitter
              const delay = Math.min(1000, 50 * Math.pow(2, attempt - 1)) + Math.random() * 100;
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            } else {
              return res.status(400).json({ 
                message: 'Unable to create payment due to high concurrency. Please try again in a moment.',
                error: 'Max retries exceeded'
              });
            }
          } else {
            throw saveError;
          }
        }
      }
    }
    
    if (!savedFund) {
      return res.status(500).json({ 
        message: 'Failed to create payment after multiple attempts',
        error: 'Unknown error'
      });
    }
    
    // Populate the saved fund and return success response
    const populatedFund = await SiteFund.findById(savedFund._id)
      .populate('siteId', 'name location')
      .populate('allocatedBy', 'name');

    res.status(201).json({
      message: `Payment ${savedFund.paymentNumber} allocated successfully`,
      siteFund: populatedFund,
    });
  } catch (error) {
    console.error('Add funds error:', error);
    
    // Handle mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate payment number for this site. Please try again.',
        error: 'Duplicate key error'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Update site fund allocation
// @route   PUT /api/wallet/payment/:paymentId
// @access  Private/Admin
const updateSiteFunds = asyncHandler(async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, threshold, thresholdType, description } = req.body;

    // Validate paymentId
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ message: 'Invalid payment ID' });
    }

    // Find existing site fund
    const siteFund = await SiteFund.findById(paymentId);
    if (!siteFund) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Update fields
    if (amount !== undefined) siteFund.amount = amount;
    if (threshold !== undefined) siteFund.threshold = threshold;
    if (thresholdType !== undefined) siteFund.thresholdType = thresholdType;
    if (description !== undefined) siteFund.description = description;

    // Validate threshold based on type
    if (siteFund.thresholdType === 'percentage') {
      if (siteFund.threshold < 0 || siteFund.threshold > 100) {
        return res.status(400).json({ message: 'Percentage threshold must be between 0 and 100' });
      }
    } else if (siteFund.thresholdType === 'cash') {
      if (siteFund.threshold < 0) {
        return res.status(400).json({ message: 'Cash threshold must be a positive number' });
      }
    }

    const updatedFund = await siteFund.save();
    const populatedFund = await SiteFund.findById(updatedFund._id)
      .populate('siteId', 'name location')
      .populate('allocatedBy', 'name');

    res.json({
      message: 'Payment updated successfully',
      siteFund: populatedFund,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Delete site fund allocation
// @route   DELETE /api/wallet/payment/:paymentId
// @access  Private/Admin
const deleteSiteFunds = asyncHandler(async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log('\n=== DELETE PAYMENT REQUEST ===');
    console.log('Payment ID:', paymentId);
    console.log('User:', req.user?.name || req.user?._id);

    // Validate paymentId
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      console.log('Invalid payment ID format');
      return res.status(400).json({ message: 'Invalid payment ID' });
    }

    // Find existing site fund
    const siteFund = await SiteFund.findById(paymentId);
    if (!siteFund) {
      console.log('Payment not found in database');
      return res.status(404).json({ message: 'Payment not found' });
    }

    console.log('Found payment:', {
      id: siteFund._id,
      paymentNumber: siteFund.paymentNumber,
      amount: siteFund.amount,
      isActive: siteFund.isActive
    });

    // Soft delete by setting isActive to false
    siteFund.isActive = false;
    await siteFund.save();
    
    console.log('Payment successfully soft deleted');
    console.log('=== END DELETE REQUEST ===\n');

    res.json({
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get site payments
// @route   GET /api/wallet/site/:siteId/payments
// @access  Private/Admin
const getSitePayments = asyncHandler(async (req, res) => {
  try {
    const { siteId } = req.params;
    
    // Validate siteId
    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }

    // Get all payments for the site
    const payments = await SiteFund.find({ siteId, isActive: true })
      .populate('siteId', 'name location')
      .populate('allocatedBy', 'name')
      .sort({ paymentNumber: 1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get sites for fund allocation (all sites)
// @route   GET /api/wallet/sites-for-funds
// @access  Private/Admin
const getSitesForFunds = asyncHandler(async (req, res) => {
  try {
    // Get all sites (they can have multiple payments)
    const allSites = await Site.find({}).select('name location startDate');
    
    res.json(allSites);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Debug endpoint to check site fund data integrity
// @route   GET /api/wallet/debug/:siteId
// @access  Private/Admin
const debugSiteFunds = asyncHandler(async (req, res) => {
  try {
    const { siteId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(siteId)) {
      return res.status(400).json({ message: 'Invalid site ID' });
    }

    // Get all payments for this site
    const allPayments = await SiteFund.find({ siteId })
      .select('paymentNumber amount isActive createdAt')
      .sort({ paymentNumber: 1 });
    
    // Get active payments only
    const activePayments = await SiteFund.find({ siteId, isActive: true })
      .select('paymentNumber amount createdAt')
      .sort({ paymentNumber: 1 });

    // Get max payment number calculation (for all payments, not just active)
    const maxPaymentResult = await SiteFund.aggregate([
      { $match: { siteId: new mongoose.Types.ObjectId(siteId) } }, // Remove isActive filter
      { $group: { _id: null, maxPayment: { $max: "$paymentNumber" } } }
    ]);
    
    // Also get max for active payments only for comparison
    const maxActivePaymentResult = await SiteFund.aggregate([
      { $match: { siteId: new mongoose.Types.ObjectId(siteId), isActive: true } },
      { $group: { _id: null, maxPayment: { $max: "$paymentNumber" } } }
    ]);
    
    const maxPayment = maxPaymentResult.length > 0 ? maxPaymentResult[0].maxPayment : 0;
    const maxActivePayment = maxActivePaymentResult.length > 0 ? maxActivePaymentResult[0].maxPayment : 0;
    const nextPaymentNumber = (maxPayment || 0) + 1;

    res.json({
      siteId,
      allPayments,
      activePayments,
      maxPayment, // Max among all payments
      maxActivePayment, // Max among active payments only
      nextPaymentNumber,
      aggregationResult: maxPaymentResult,
      activeAggregationResult: maxActivePaymentResult
    });
  } catch (error) {
    res.status(500).json({ message: 'Debug error', error: error.message });
  }
});

module.exports = {
  getWalletSummary,
  getSiteExpenseBreakdown,
  addSiteFunds,
  updateSiteFunds,
  deleteSiteFunds,
  getSitePayments,
  getSitesForFunds,
  debugSiteFunds,
};
