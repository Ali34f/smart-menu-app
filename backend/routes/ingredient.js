const express = require('express');
const {
  getIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient
} = require('../controllers/ingredient_controller');
const { protect, checkPermission, requireCanEditIngredients } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getIngredients)
  .post(checkPermission('canManageIngredients'), createIngredient);

router
  .route('/:id')
  .get(getIngredient)
  .put(requireCanEditIngredients, updateIngredient)
  .delete(checkPermission('canManageIngredients'), deleteIngredient);

module.exports = router;
