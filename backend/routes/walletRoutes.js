// backend/routes/walletRoutes.js
const express = require('express');
const {
  getWalletSummary,
  getSiteExpenseBreakdown,
  addSiteFunds,
  updateSiteFunds,
  deleteSiteFunds,
  getSitePayments,
  getSitesForFunds,
  debugSiteFunds,
} = require('../controllers/walletController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are admin-only for now
router.use(protect);
router.use(authorizeRoles('admin'));

// Get wallet summary with all sites
router.get('/summary', getWalletSummary);

// Get sites for fund allocation
router.get('/sites-for-funds', getSitesForFunds);

// Get site payments
router.get('/site/:siteId/payments', getSitePayments);

// Get detailed expense breakdown for a specific site
router.get('/site/:siteId/breakdown', getSiteExpenseBreakdown);

// Add funds to a site
router.post('/add-funds', addSiteFunds);

// Update specific payment
router.put('/payment/:paymentId', updateSiteFunds);

// Delete specific payment
router.delete('/payment/:paymentId', deleteSiteFunds);

// Debug endpoint to check site fund data
router.get('/debug/:siteId', debugSiteFunds);

module.exports = router;
