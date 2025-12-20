const express = require('express');
const router = express.Router();
const {
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/staff_controller');

const { protect, authorize, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all staff - Owner and Manager can view
router.get('/', authorize('owner', 'manager'), getStaff);

// Add staff - Owner and Manager can add
router.post('/', authorize('owner', 'manager'), checkPermission('canManageStaff'), addStaff);

// Update staff - Owner and Manager can update
router.put('/:id', authorize('owner', 'manager'), checkPermission('canManageStaff'), updateStaff);

// Delete staff - Only Owner can delete
router.delete('/:id', authorize('owner'), deleteStaff);

module.exports = router;