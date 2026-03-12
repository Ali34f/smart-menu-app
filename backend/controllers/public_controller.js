const path = require('path');
const fs = require('fs');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Allergen = require('../models/Allergens');

// @desc    Get public menu by restaurant ID (for QR code scan)
// @route   GET /api/public/menu/:restaurantId
// @access  Public (no authentication)
exports.getPublicMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    // Get restaurant info
    const restaurant = await Restaurant.findById(restaurantId).select('name cuisineType address');

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Get menu items (only active ones); .lean() for plain objects with all fields including image
    let menuItems = await MenuItem.find({
      restaurantId,
      isAvailable: true
    })
    .populate('allergens', 'name icon')
    .sort({ category: 1, name: 1 })
    .lean();

    // Normalize image to path like "/uploads/filename" for frontend
    menuItems = menuItems.map((doc) => {
      if (doc.image && typeof doc.image === 'string') {
        try {
          if (doc.image.startsWith('http')) {
            doc.image = new URL(doc.image).pathname; // e.g. /uploads/xyz.jpg
          } else if (!doc.image.startsWith('/')) {
            doc.image = '/' + doc.image;
          }
        } catch (_) {
          doc.image = (doc.image || '').replace(/^https?:\/\/[^/]+/, '') || doc.image;
        }
      }
      return doc;
    });

    // Record a scan for today (for analytics)
    const today = new Date().toISOString().slice(0, 10);
    if (!restaurant.dailyScans) restaurant.dailyScans = {};
    restaurant.dailyScans[today] = (restaurant.dailyScans[today] || 0) + 1;
    await restaurant.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      restaurant,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching menu',
      error: error.message
    });
  }
};

// @desc    Get filtered menu by allergens
// @route   POST /api/public/menu/:restaurantId/filter
// @access  Public
exports.filterMenuByAllergens = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { allergenIds } = req.body; // Array of allergen IDs to exclude

    if (!allergenIds || !Array.isArray(allergenIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide allergen IDs as array'
      });
    }

    // Get menu items that DON'T contain the specified allergens
    const menuItems = await MenuItem.find({
      restaurantId,
      isAvailable: true,
      allergens: { $nin: allergenIds } // $nin = "not in"
    })
    .populate('allergens', 'name icon')
    .sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error filtering menu',
      error: error.message
    });
  }
};

// @desc    Serve an uploaded image (for public menu; use so requests can send ngrok header)
// @route   GET /api/public/serve-image
// @access  Public
exports.serveImage = (req, res, next) => {
  try {
    let requestedPath = req.query.path || req.query.p;
    if (!requestedPath || typeof requestedPath !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing path' });
    }
    requestedPath = requestedPath.replace(/^\/+/, ''); // strip leading slashes
    if (!requestedPath.startsWith('uploads/') && requestedPath !== 'uploads') {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(__dirname, '..', requestedPath);
    const resolved = path.normalize(filePath);
    if (!resolved.startsWith(path.normalize(uploadsDir))) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.sendFile(resolved);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error serving image', error: err.message });
  }
};

// @desc    Get all allergens (for filter UI)
// @route   GET /api/public/allergens
// @access  Public
exports.getAllergens = async (req, res, next) => {
  try {
    const allergens = await Allergen.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: allergens.length,
      data: allergens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching allergens',
      error: error.message
    });
  }
};