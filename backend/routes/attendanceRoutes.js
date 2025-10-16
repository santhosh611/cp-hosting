// construction new/backend/routes/attendanceRoutes.js
const express = require('express');
const {
  markAttendance,
  getAttendanceEntries,
  getAttendanceOverview, // Ensure this is imported for the overview route
  updateAttendanceEntry, // Corrected name to match controller
  deleteAttendanceEntry // Corrected name to match controller
} = require('../controllers/attendanceController');
const {
  protect,
  authorizeRoles
} = require('../middleware/authMiddleware');
const router = express.Router();

// Routes for attendance entries
router.route('/')
  .post(protect, authorizeRoles('admin', 'supervisor'), markAttendance) // Allow Admin to mark attendance
  .get(protect, authorizeRoles('admin', 'supervisor'), getAttendanceEntries); // Allow Admin to get attendance

router.route('/overview') // Specific route for attendance overview (Admin only)
  .get(protect, authorizeRoles('admin'), getAttendanceOverview);

router.route('/:id')
  .put(protect, authorizeRoles('admin', 'supervisor'), updateAttendanceEntry) // Allow Admin to update attendance
  .delete(protect, authorizeRoles('admin', 'supervisor'), deleteAttendanceEntry); // Allow Admin to delete attendance

module.exports = router;