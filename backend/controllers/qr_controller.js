const QRCode = require('qrcode');
const Restaurant = require('../models/Restaurant');

const getFrontendBaseUrl = (req) => {
  const envUrl = process.env.FRONTEND_URL;
  const requestedBaseUrl = req.query.publicBaseUrl;
  const origin = req.get('origin');
  const fallback = 'http://localhost:3000';

  const isSafeHttpUrl = (value) => {
    if (typeof value !== 'string') return false;
    return /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(value);
  };

  if (isSafeHttpUrl(requestedBaseUrl)) {
    return requestedBaseUrl.replace(/\/$/, '');
  }

  return (envUrl || origin || fallback).replace(/\/$/, '');
};

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

    const publicMenuUrl = `${getFrontendBaseUrl(req)}/public/menu/${restaurant._id}`;

    if (restaurant.qrCode !== publicMenuUrl) {
      restaurant.qrCode = publicMenuUrl;
      await restaurant.save();
    }

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(publicMenuUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.status(200).json({
      success: true,
      qrCodeUrl: publicMenuUrl,
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

    const publicMenuUrl = `${getFrontendBaseUrl(req)}/public/menu/${restaurant._id}`;

    if (restaurant.qrCode !== publicMenuUrl) {
      restaurant.qrCode = publicMenuUrl;
      await restaurant.save();
    }

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(publicMenuUrl, {
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