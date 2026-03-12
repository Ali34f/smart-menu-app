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

const getPublicApiBaseUrl = (req) => {
  const requestedApiBaseUrl = req.query.publicApiBaseUrl;
  const envApiUrl = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL;
  const fallback = 'http://localhost:5002/api';

  const isSafeHttpUrl = (value) => {
    if (typeof value !== 'string') return false;
    return /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/.test(value);
  };

  if (isSafeHttpUrl(requestedApiBaseUrl)) {
    return requestedApiBaseUrl.replace(/\/$/, '');
  }

  if (isSafeHttpUrl(envApiUrl)) {
    return envApiUrl.replace(/\/$/, '');
  }

  return fallback;
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

    // Public menu URL will use same-origin /api by default (via frontend proxy),
    // so we no longer need to append apiBase.
    const publicMenuUrl = `${getFrontendBaseUrl(req)}/public/menu/${restaurant._id}`;

    if (restaurant.qrCode !== publicMenuUrl) {
      restaurant.qrCode = publicMenuUrl;
      await restaurant.save();
    }

    const width = Math.min(400, Math.max(200, parseInt(req.query.width, 10) || 300));
    const colorHex = typeof req.query.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(req.query.color)
      ? req.query.color
      : '#000000';

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(publicMenuUrl, {
      width,
      margin: 2,
      color: {
        dark: colorHex,
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

// @desc    Get daily scan counts for the last 7 days
// @route   GET /api/qr/analytics
// @access  Private
exports.getScanAnalytics = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId).select('dailyScans');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const dailyScans = restaurant.dailyScans || {};
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const count = dailyScans[dateKey] || 0;
      days.push({
        date: dateKey,
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        count: Number(count)
      });
    }
    // Summary for "QR Code Scans" cards: total scans in last 30 days
    const now = new Date();
    let totalScansLast30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      totalScansLast30 += Number(dailyScans[dateKey] || 0);
    }

    res.status(200).json({
      success: true,
      data: days,
      summary: {
        totalScansLast30
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};