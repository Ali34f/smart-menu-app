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

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/public-orders', getPublicOrdersForStaff);
router.patch('/public-orders/:orderId', updatePublicOrderStatus);

router
  .route('/')
  .get(getMenuItems)
  .post(checkPermission('canManageMenu'), createMenuItem);

// Must be registered before `/:id` so "category" is not treated as an item id
router.get('/category/:category', getMenuItemsByCategory);

router
  .route('/:id')
  .get(getMenuItem)
  .put(requireCanEditMenu, updateMenuItem)
  .delete(checkPermission('canManageMenu'), deleteMenuItem);

router.patch('/:id/toggle', requireCanEditMenu, toggleAvailability);

module.exports = router;