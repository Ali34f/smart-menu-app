const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const PublicOrder = require('../models/PublicOrder');
const { logActivityHelper } = require('./activity_controller');
const { createNotification } = require('../utils/notificationHelper');

exports.getMenuItems = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find({ restaurantId: req.restaurantId })
      .populate('ingredients', 'name')
      .populate('allergens', 'name icon')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    next(error);
  }
};

exports.getMenuItem = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    })
      .populate('ingredients', 'name category allergens')
      .populate('allergens', 'name icon description');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

exports.createMenuItem = async (req, res, next) => {
  try {
    req.body.restaurantId = req.restaurantId;

    const menuItem = await MenuItem.create(req.body);

    await menuItem.populate('ingredients allergens');

    await logActivityHelper(
      req.restaurantId,
      req.user.id,
      req.user.name || req.user.email.split('@')[0],
      'menu_item_created',
      menuItem.name
    );

    await createNotification({
      restaurantId: req.restaurantId,
      type: 'menu_item_created',
      title: 'New menu item added',
      message: `${req.user.name || req.user.email} added "${menuItem.name}" to the menu.`,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

exports.updateMenuItem = async (req, res, next) => {
  try {
    let menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('ingredients allergens');

    // Log activity 
    await logActivityHelper(
      req.restaurantId,
      req.user.id,
      req.user.name || req.user.email.split('@')[0],
      'menu_item_updated',
      menuItem.name
    );

    await createNotification({
      restaurantId: req.restaurantId,
      type: 'menu_item_updated',
      title: 'Menu item updated',
      message: `${req.user.name || req.user.email} updated "${menuItem.name}".`,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMenuItem = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    const itemName = menuItem.name;
    await menuItem.deleteOne();

    await logActivityHelper(
      req.restaurantId,
      req.user.id,
      req.user.name || req.user.email.split('@')[0],
      'menu_item_deleted',
      itemName
    );

    await createNotification({
      restaurantId: req.restaurantId,
      type: 'menu_item_deleted',
      title: 'Menu item removed',
      message: `${req.user.name || req.user.email} deleted "${itemName}" from the menu.`,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

exports.getMenuItemsByCategory = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find({
      restaurantId: req.restaurantId,
      category: req.params.category
    })
      .populate('ingredients', 'name')
      .populate('allergens', 'name icon')
      .sort('name');

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleAvailability = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    await logActivityHelper(
      req.restaurantId,
      req.user.id,
      req.user.name || req.user.email.split('@')[0],
      'availability_changed',
      menuItem.name
    );

    await createNotification({
      restaurantId: req.restaurantId,
      type: 'availability_changed',
      title: 'Menu item availability changed',
      message: `${req.user.name || req.user.email} marked "${menuItem.name}" as ${menuItem.isAvailable ? 'active' : 'inactive'}.`,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: `Menu item ${menuItem.isAvailable ? 'activated' : 'deactivated'}`,
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Public-order lifecycle; query filter skips unknown values, PATCH rejects them.
const STAFF_ORDER_STATUSES = new Set([
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
]);

exports.getPublicOrdersForStaff = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant context required' });
    }
    const statusQ = (req.query.status || '').toString().trim().toLowerCase();
    const filter = { restaurantId: req.restaurantId };
    if (statusQ && STAFF_ORDER_STATUSES.has(statusQ)) {
      filter.status = statusQ;
    }
    const orders = await PublicOrder.find(filter).sort({ createdAt: -1 }).limit(150).lean();
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders.map((o) => ({
        orderId: o._id,
        orderNumber: String(o._id).slice(-6).toUpperCase(),
        status: o.status,
        tableNumber: o.tableNumber,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        paymentReference: o.paymentReference,
        totalAmount: o.totalAmount,
        items: o.items || [],
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePublicOrderStatus = async (req, res, next) => {
  try {
    if (!req.restaurantId) {
      return res.status(400).json({ success: false, message: 'Restaurant context required' });
    }
    const { orderId } = req.params;
    const nextStatus = String(req.body?.status || '').trim().toLowerCase();
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order' });
    }
    if (!STAFF_ORDER_STATUSES.has(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        allowed: [...STAFF_ORDER_STATUSES]
      });
    }
    const order = await PublicOrder.findOne({
      _id: orderId,
      restaurantId: req.restaurantId
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.status = nextStatus;
    await order.save();
    res.status(200).json({
      success: true,
      message: 'Order updated',
      data: {
        orderId: order._id,
        orderNumber: String(order._id).slice(-6).toUpperCase(),
        status: order.status,
        tableNumber: order.tableNumber,
        totalAmount: order.totalAmount,
        updatedAt: order.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};