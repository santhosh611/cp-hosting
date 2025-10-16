// construction new/backend/routes/strangerWorkerRoutes.js
const express = require('express');
const {
  addStrangerWorker,
  getStrangerWorkers,
  deleteStrangerWorker,
  updateStrangerWorker, // Import the new update function
} = require('../controllers/strangerWorkerController');
const {
  protect,
  authorizeRoles
} = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .post(protect, authorizeRoles('admin', 'supervisor'), addStrangerWorker)
  .get(protect, authorizeRoles('admin', 'supervisor'), getStrangerWorkers);

router.route('/:id')
  .put(protect, authorizeRoles('admin', 'supervisor'), updateStrangerWorker) // Add the PUT route for updates
  .delete(protect, authorizeRoles('admin', 'supervisor'), deleteStrangerWorker);

module.exports = router;