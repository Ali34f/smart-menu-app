const express = require('express');
const router = express.Router();
const {
  getStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  acceptInvitation
} = require('../controllers/staff_controller');

const { protect, authorize, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Accept invitation MUST come before /:id routes - otherwise Express may match
// POST /accept-invitation to PUT /:id with id="accept-invitation"
router.post('/accept-invitation', acceptInvitation);

// Get all staff - Owner and Manager can view
router.get('/', authorize('owner', 'manager'), getStaff);

// Add staff - Owner and Manager can add
router.post('/', authorize('owner', 'manager'), checkPermission('canManageStaff'), addStaff);

// Update staff - Owner and Manager can update
router.put('/:id', authorize('owner', 'manager'), checkPermission('canManageStaff'), updateStaff);

// Delete staff - Only Owner can delete
router.delete('/:id', authorize('owner'), deleteStaff);

module.exports = router;