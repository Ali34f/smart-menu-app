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

// Get all staff - all authenticated roles can view (incl. platform admins in workspace context)
router.get(
  '/',
  authorize('owner', 'manager', 'staff', 'platform_admin', 'super_owner'),
  getStaff
);

// Add staff - Owner, Manager, Platform admin
router.post(
  '/',
  authorize('owner', 'manager', 'platform_admin', 'super_owner'),
  checkPermission('canManageStaff'),
  addStaff
);

// Update staff - Owner, Manager, Platform admin
router.put(
  '/:id',
  authorize('owner', 'manager', 'platform_admin', 'super_owner'),
  checkPermission('canManageStaff'),
  updateStaff
);

// Delete staff - Owner or Platform admin
router.delete(
  '/:id',
  authorize('owner', 'platform_admin', 'super_owner'),
  deleteStaff
);

module.exports = router;