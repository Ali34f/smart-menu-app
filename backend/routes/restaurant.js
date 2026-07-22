const express = require('express');
const {
  getRestaurant,
  updateRestaurant,
  deleteAllRestaurantData,
  deactivateRestaurantAccount
} = require('../controllers/restaurant_controller');
const { protect, authorize } = require('../middleware/auth');
const { requireSubscriptionWrites } = require('../middleware/subscriptionWriteGuard');

const router = express.Router();

router.use(protect);

router.get('/', getRestaurant);
router.put('/', requireSubscriptionWrites, updateRestaurant);
router.post('/danger/delete-data', authorize('owner', 'manager', 'platform_admin', 'super_owner'), deleteAllRestaurantData);
router.post('/danger/deactivate', authorize('owner', 'manager', 'platform_admin', 'super_owner'), deactivateRestaurantAccount);

module.exports = router;
