const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  getMe,
  logout,
  updateProfile,
  getMyRestaurants,
  switchRestaurant
} = require('../controllers/auth_controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

const parsedAuthMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '', 10);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(parsedAuthMax) && parsedAuthMax > 0 ? parsedAuthMax : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.get('/my-restaurants', protect, getMyRestaurants);
router.post('/switch-restaurant', protect, switchRestaurant);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);

module.exports = router;