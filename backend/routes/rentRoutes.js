// construction new/backend/routes/rentRoutes.js
const express = require('express');
const router = express.Router();
const {
  createRentEntry,
  getRentEntries,
  getRentById,
  updateRentEntry,
  deleteRentEntry,
} = require('../controllers/rentController.js');
const { protect, authorizeRoles } = require('../middleware/authMiddleware.js');

// All rent routes now require both admin and supervisor authorization
router.route('/')
  .post(protect, authorizeRoles('admin', 'supervisor'), createRentEntry)
  .get(protect, authorizeRoles('admin', 'supervisor'), getRentEntries);

router.route('/:id')
  .get(protect, authorizeRoles('admin', 'supervisor'), getRentById)
  .put(protect, authorizeRoles('admin', 'supervisor'), updateRentEntry)
  .delete(protect, authorizeRoles('admin', 'supervisor'), deleteRentEntry);

module.exports = router;