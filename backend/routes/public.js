const express = require('express');
const router = express.Router();
const {
  getPublicMenu,
  filterMenuByAllergens,
  trackAllergenFilterEvent,
  trackPublicVisit,
  trackSessionDuration,
  trackMenuItemView,
  getAllergens,
  serveImage,
  createPublicOrder,
  getPublicOrderById
} = require('../controllers/public_controller');

// No authentication required for these routes!
router.get('/order/:orderId', getPublicOrderById);
router.get('/menu/:restaurantId', getPublicMenu);
router.post('/menu/:restaurantId/filter', filterMenuByAllergens);
router.post('/menu/:restaurantId/filter-event', trackAllergenFilterEvent);
router.post('/menu/:restaurantId/visit', trackPublicVisit);
router.post('/menu/:restaurantId/session-duration', trackSessionDuration);
router.post('/menu/:restaurantId/item-view', trackMenuItemView);
router.post('/menu/:restaurantId/order', createPublicOrder);
router.get('/allergens', getAllergens);
router.get('/serve-image', serveImage);

module.exports = router;