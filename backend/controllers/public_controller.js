const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Allergen = require('../models/Allergens');
const PublicOrder = require('../models/PublicOrder');

const todayKey = () => new Date().toISOString().slice(0, 10);

// Labels used as dynamic $inc path segments — Mongo rejects '.' and '$' in keys.
const safeMongoKey = (s) =>
  String(s || '')
    .trim()
    .replace(/\./g, '·')
    .replace(/\$/g, '＄')
    .slice(0, 120) || 'unknown';

exports.getPublicMenu = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId).select(
      'name cuisineType address tableCount logo welcomeMessage businessHours menuCategories'
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // lean() so we can rewrite image strings in place for the client.
    let menuItems = await MenuItem.find({
      restaurantId,
      isAvailable: true
    })
    .populate('allergens', 'name icon')
    .sort({ category: 1, name: 1 })
    .lean();

    // Same-origin uploads: keep path only. True externals: leave full URL.
    menuItems = menuItems.map((doc) => {
      if (doc.image && typeof doc.image === 'string') {
        try {
          if (doc.image.startsWith('http')) {
            const parsed = new URL(doc.image);
            const pathname = parsed.pathname || '';
            if (pathname.startsWith('/uploads/')) {
              doc.image = pathname;
            }
          } else if (!doc.image.startsWith('/')) {
            doc.image = doc.image.startsWith('uploads/')
              ? `/${doc.image}`
              : doc.image;
          }
        } catch (_) {}
      }
      return doc;
    });

    const today = todayKey();
    await Restaurant.updateOne(
      { _id: restaurantId },
      { $inc: { [`dailyScans.${today}`]: 1 } }
    );

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

exports.filterMenuByAllergens = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { allergenIds } = req.body;

    if (!allergenIds || !Array.isArray(allergenIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide allergen IDs as array'
      });
    }

    // Only castable ids — $in on ObjectId refs throws on random strings.
    const exclude = allergenIds
      .filter(Boolean)
      .map((id) => String(id).trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const baseQuery = { restaurantId, isAvailable: true };
    // Safe dishes: allergen array must not hit anything in exclude ($nin on the field would not mean that).
    const query =
      exclude.length > 0
        ? { ...baseQuery, $nor: [{ allergens: { $in: exclude } }] }
        : baseQuery;

    let menuItems = await MenuItem.find(query)
      .populate('allergens', 'name icon')
      .sort({ category: 1, name: 1 })
      .lean();

    menuItems = menuItems.map((doc) => {
      if (doc.image && typeof doc.image === 'string') {
        try {
          if (doc.image.startsWith('http')) {
            const parsed = new URL(doc.image);
            const pathname = parsed.pathname || '';
            if (pathname.startsWith('/uploads/')) {
              doc.image = pathname;
            }
          } else if (!doc.image.startsWith('/')) {
            doc.image = doc.image.startsWith('uploads/')
              ? `/${doc.image}`
              : doc.image;
          }
        } catch (_) {}
      }
      return doc;
    });

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

exports.trackAllergenFilterEvent = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { allergenIds } = req.body || {};

    if (!Array.isArray(allergenIds) || allergenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide allergen IDs as a non-empty array'
      });
    }

    const normalizedIds = [...new Set(allergenIds.filter(Boolean).map((id) => String(id)))];
    if (!normalizedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid allergen IDs'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId).select('allergenFilterUsage');
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    const allergens = await Allergen.find({ _id: { $in: normalizedIds } }).select('name').lean();
    if (!allergens.length) {
      return res.status(200).json({
        success: true,
        updated: 0
      });
    }

    if (!restaurant.allergenFilterUsage || typeof restaurant.allergenFilterUsage.get !== 'function') {
      restaurant.allergenFilterUsage = new Map();
    }

    for (const allergen of allergens) {
      const key = String(allergen.name || '').trim();
      if (!key) continue;
      const current = Number(restaurant.allergenFilterUsage.get(key) || 0);
      restaurant.allergenFilterUsage.set(key, current + 1);
    }

    await restaurant.save({ validateBeforeSave: false });

    const today = todayKey();
    const inc = { [`dailyFilteredViews.${today}`]: 1 };
    for (const allergen of allergens) {
      const k = safeMongoKey(allergen.name);
      inc[`dailyAllergenUsage.${today}.${k}`] = 1;
    }
    await Restaurant.updateOne({ _id: restaurantId }, { $inc: inc });

    res.status(200).json({
      success: true,
      updated: allergens.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking allergen filter event',
      error: error.message
    });
  }
};

exports.trackPublicVisit = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const isFirstVisitToday = req.body?.isFirstVisitToday === true;
    if (!isFirstVisitToday) {
      return res.status(200).json({ success: true, counted: 0 });
    }
    const restaurant = await Restaurant.findById(restaurantId).select('_id');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const today = todayKey();
    await Restaurant.updateOne(
      { _id: restaurantId },
      { $inc: { [`dailyUniqueVisitors.${today}`]: 1 } }
    );
    res.status(200).json({ success: true, counted: 1 });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording visit',
      error: error.message
    });
  }
};

exports.trackSessionDuration = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    let sec = Number(req.body?.durationSeconds);
    if (!Number.isFinite(sec) || sec <= 0) {
      return res.status(200).json({ success: true, counted: 0 });
    }
    sec = Math.min(Math.floor(sec), 86400);
    const restaurant = await Restaurant.findById(restaurantId).select('_id');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const today = todayKey();
    await Restaurant.updateOne(
      { _id: restaurantId },
      {
        $inc: {
          [`dailySessionSeconds.${today}`]: sec,
          [`dailySessionSamples.${today}`]: 1
        }
      }
    );
    res.status(200).json({ success: true, counted: 1 });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording session',
      error: error.message
    });
  }
};

exports.trackMenuItemView = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItemId = String(req.body?.menuItemId || '').trim();
    if (!menuItemId) {
      return res.status(400).json({ success: false, message: 'menuItemId required' });
    }
    const item = await MenuItem.findOne({
      _id: menuItemId,
      restaurantId
    }).select('_id');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }
    await MenuItem.updateOne({ _id: menuItemId }, { $inc: { views: 1 } });
    const today = todayKey();
    const idKey = safeMongoKey(menuItemId);
    await Restaurant.updateOne(
      { _id: restaurantId },
      { $inc: { [`menuItemViewsByDay.${today}.${idKey}`]: 1 } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording item view',
      error: error.message
    });
  }
};

exports.serveImage = (req, res, next) => {
  try {
    let requestedPath = req.query.path || req.query.p;
    if (!requestedPath || typeof requestedPath !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing path' });
    }
    requestedPath = requestedPath.replace(/^\/+/, '');
    if (!requestedPath.startsWith('uploads/') && requestedPath !== 'uploads') {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(__dirname, '..', requestedPath);
    const resolved = path.normalize(filePath);
    // Reject path traversal (path must stay under uploads/).
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

exports.createPublicOrder = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { tableNumber, paymentMethod, items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one item' });
    }

    const table = Number(tableNumber);
    if (!Number.isInteger(table) || table < 1) {
      return res.status(400).json({ success: false, message: 'Please provide a valid table number' });
    }

    const method = String(paymentMethod || '').toLowerCase();
    if (method !== 'cash' && method !== 'card') {
      return res.status(400).json({ success: false, message: 'Payment method must be cash or card' });
    }

    const restaurant = await Restaurant.findById(restaurantId).select('name tableCount');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const maxTables = Number(restaurant.tableCount) > 0 ? Number(restaurant.tableCount) : 20;
    if (table > maxTables) {
      return res.status(400).json({
        success: false,
        message: `Table number must be between 1 and ${maxTables}`
      });
    }

    const normalized = items
      .map((line) => ({
        menuItemId: String(line?.menuItemId || line?.itemId || ''),
        quantity: Number(line?.quantity || 0)
      }))
      .filter((line) => line.menuItemId && Number.isFinite(line.quantity) && line.quantity > 0);

    if (!normalized.length) {
      return res.status(400).json({ success: false, message: 'Order items are invalid' });
    }

    const ids = normalized.map((line) => line.menuItemId);
    const menuDocs = await MenuItem.find({
      _id: { $in: ids },
      restaurantId,
      isAvailable: true
    }).select('name price');

    const menuMap = new Map(menuDocs.map((m) => [String(m._id), m]));
    const orderItems = [];
    for (const line of normalized) {
      const doc = menuMap.get(line.menuItemId);
      if (!doc) {
        return res.status(400).json({ success: false, message: 'One or more selected items are unavailable' });
      }
      const qty = Math.max(1, Math.floor(line.quantity));
      const unitPrice = Number(doc.price || 0);
      orderItems.push({
        menuItemId: doc._id,
        name: doc.name,
        unitPrice,
        quantity: qty,
        lineTotal: Number((unitPrice * qty).toFixed(2))
      });
    }

    const totalAmount = Number(orderItems.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
    // Card path is demo-only; cash stays pending until staff marks it.
    const paymentStatus = method === 'card' ? 'paid_demo' : 'pending_cash';
    const paymentReference =
      method === 'card'
        ? `DEMO-${Date.now().toString(36).toUpperCase()}`
        : null;

    const order = await PublicOrder.create({
      restaurantId,
      tableNumber: table,
      paymentMethod: method,
      paymentStatus,
      paymentReference,
      items: orderItems,
      totalAmount,
      status: 'placed'
    });

    const day = todayKey();
    await Restaurant.updateOne(
      { _id: restaurantId },
      { $inc: { [`dailyOrders.${day}`]: 1 } }
    );

    res.status(201).json({
      success: true,
      message: method === 'card' ? 'Demo card payment approved' : 'Order placed - pay cash at staff desk',
      data: {
        orderId: order._id,
        orderNumber: String(order._id).slice(-6).toUpperCase(),
        status: order.status,
        tableNumber: order.tableNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentReference: order.paymentReference,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

const serializePublicOrder = (order) => ({
  orderId: order._id,
  orderNumber: String(order._id).slice(-6).toUpperCase(),
  restaurantId: order.restaurantId,
  status: order.status,
  tableNumber: order.tableNumber,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  paymentReference: order.paymentReference,
  totalAmount: order.totalAmount,
  items: (order.items || []).map((i) => ({
    name: i.name,
    quantity: i.quantity,
    lineTotal: i.lineTotal,
    unitPrice: i.unitPrice
  })),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt
});

exports.getPublicOrderById = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order' });
    }
    const order = await PublicOrder.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({
      success: true,
      data: serializePublicOrder(order)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};