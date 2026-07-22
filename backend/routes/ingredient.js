const express = require('express');
const {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient
} = require('../controllers/ingredient_controller');
const { protect, checkPermission, requireCanEditIngredients } = require('../middleware/auth');
const { requireSubscriptionWrites } = require('../middleware/subscriptionWriteGuard');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getIngredients)
  .post(requireSubscriptionWrites, checkPermission('canManageIngredients'), createIngredient);

router
  .route('/:id')
  .get(getIngredient)
  .put(requireSubscriptionWrites, requireCanEditIngredients, updateIngredient)
  .delete(requireSubscriptionWrites, checkPermission('canManageIngredients'), deleteIngredient);

module.exports = router;
