const express = require('express');
const { getRestaurant, updateRestaurant } = require('../controllers/restaurant_controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getRestaurant);
router.put('/', updateRestaurant);

module.exports = router;
