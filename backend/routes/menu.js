const express = require('express');
const {
  getMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getMenuItemsByCategory,
  toggleAvailability
} = require('../controllers/menu_controller');
const { protect, checkPermission } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router
  .route('/')
  .get(getMenuItems)
  .post(checkPermission('canManageMenu'), createMenuItem);

router
  .route('/:id')
  .get(getMenuItem)
  .put(checkPermission('canManageMenu'), updateMenuItem)
  .delete(checkPermission('canManageMenu'), deleteMenuItem);

router.get('/category/:category', getMenuItemsByCategory);
router.patch('/:id/toggle', toggleAvailability);

module.exports = router;