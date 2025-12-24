const express = require('express');
const router = express.Router();
const {
  getPublicMenu,
  filterMenuByAllergens,
  getAllergens
} = require('../controllers/public_controller');

// No authentication required for these routes!
router.get('/menu/:restaurantId', getPublicMenu);
router.post('/menu/:restaurantId/filter', filterMenuByAllergens);
router.get('/allergens', getAllergens);

module.exports = router;