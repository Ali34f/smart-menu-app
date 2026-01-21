const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  updateProfile
} = require('../controllers/auth_controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);

module.exports = router;