const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  reactivate,
  forgotPassword,
  resetPassword,
  verifyTwoFactorLogin,
  getMe,
  logout,
  updateProfile,
  getMyRestaurants,
  switchRestaurant,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor
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
router.post('/reactivate', authLimiter, reactivate);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/verify-2fa-login', authLimiter, verifyTwoFactorLogin);
router.get('/me', protect, getMe);
router.get('/my-restaurants', protect, getMyRestaurants);
router.post('/switch-restaurant', protect, switchRestaurant);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);
router.post('/2fa/setup', protect, setupTwoFactor);
router.post('/2fa/enable', protect, enableTwoFactor);
router.post('/2fa/disable', protect, disableTwoFactor);

module.exports = router;