const express = require('express');
const router = express.Router();
const { generateQRImage, downloadQR } = require('../controllers/qr_controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/generate', generateQRImage);
router.get('/download', downloadQR);

module.exports = router;