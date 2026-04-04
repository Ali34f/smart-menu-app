const express = require('express');
const router = express.Router();
const {
  generateQRImage,
  downloadQR,
  getScanAnalytics,
  getAllergenFilterAnalytics,
  getRestaurantReports
} = require('../controllers/qr_controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/generate', generateQRImage);
router.get('/download', downloadQR);
router.get('/analytics', getScanAnalytics);
router.get('/reports', getRestaurantReports);
router.get('/allergen-analytics', getAllergenFilterAnalytics);

module.exports = router;