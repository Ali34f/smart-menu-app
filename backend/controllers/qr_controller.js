const QRCode = require('qrcode');
const Restaurant = require('../models/Restaurant');

// @desc    Generate QR code image
// @route   GET /api/qr/generate
// @access  Private
exports.generateQRImage = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(restaurant.qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.status(200).json({
      success: true,
      qrCodeUrl: restaurant.qrCode,
      qrCodeImage: qrCodeDataUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating QR code',
      error: error.message
    });
  }
};

// @desc    Download QR code as PNG
// @route   GET /api/qr/download
// @access  Private
exports.downloadQR = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(restaurant.qrCode, {
      width: 300,
      margin: 2
    });

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `attachment; filename="${restaurant.name}-qr-code.png"`);
    res.send(qrCodeBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading QR code',
      error: error.message
    });
  }
};