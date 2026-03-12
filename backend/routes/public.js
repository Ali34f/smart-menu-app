const express = require('express');
const router = express.Router();
const {
  getPublicMenu,
  filterMenuByAllergens,
  getAllergens,
  serveImage
} = require('../controllers/public_controller');

// No authentication required for these routes!
router.get('/menu/:restaurantId', getPublicMenu);
router.post('/menu/:restaurantId/filter', filterMenuByAllergens);
router.get('/allergens', getAllergens);
router.get('/serve-image', serveImage);

module.exports = router;