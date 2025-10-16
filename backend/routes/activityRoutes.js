// construction new/backend/routes/activityRoutes.js
const express = require('express');
const {
  createActivity, // Ensure this matches the controller export
  getActivityLogs,
  updateActivity,
  deleteActivity
} = require('../controllers/activityController');
const {
  protect,
  authorizeRoles
} = require('../middleware/authMiddleware');

const router = express.Router();

// Use the correct function name in the route
router.post('/', protect, authorizeRoles('admin', 'supervisor'), createActivity); // Changed from logActivity to createActivity
router.get('/', protect, authorizeRoles('admin', 'supervisor'), getActivityLogs);

router.route('/:id')
  .put(protect, authorizeRoles('admin', 'supervisor'), updateActivity)
  .delete(protect, authorizeRoles('admin', 'supervisor'), deleteActivity);

module.exports = router;