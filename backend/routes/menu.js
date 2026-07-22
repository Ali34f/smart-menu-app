const express = require('express');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemsByCategory,
  toggleAvailability,
  getPublicOrdersForStaff,
  updatePublicOrderStatus
} = require('../controllers/menu_controller');
const { protect, checkPermission, requireCanEditMenu } = require('../middleware/auth');
const { requireSubscriptionWrites } = require('../middleware/subscriptionWriteGuard');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/public-orders', getPublicOrdersForStaff);
router.patch('/public-orders/:orderId', requireSubscriptionWrites, updatePublicOrderStatus);

router
  .route('/')
  .get(getMenuItems)
  .post(requireSubscriptionWrites, checkPermission('canManageMenu'), createMenuItem);

// Must be registered before `/:id` so "category" is not treated as an item id
router.get('/category/:category', getMenuItemsByCategory);

router
  .route('/:id')
  .get(getMenuItem)
  .put(requireSubscriptionWrites, requireCanEditMenu, updateMenuItem)
  .delete(requireSubscriptionWrites, checkPermission('canManageMenu'), deleteMenuItem);

router.patch('/:id/toggle', requireSubscriptionWrites, requireCanEditMenu, toggleAvailability);

module.exports = router;