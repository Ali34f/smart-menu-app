const MenuItem = require('../models/MenuItem');
const { logActivityHelper } = require('./activity_controller');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get all menu items for restaurant
// @route   GET /api/menu
// @access  Private
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

// @desc    Get single menu item
// @route   GET /api/menu/:id
// @access  Private
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

// @desc    Create new menu item
// @route   POST /api/menu
// @access  Private (canManageMenu permission)
exports.createMenuItem = async (req, res, next) => {
  try {
    // Add restaurant ID to request body
    req.body.restaurantId = req.restaurantId;

    const menuItem = await MenuItem.create(req.body);

    // Populate allergens and ingredients
    await menuItem.populate('ingredients allergens');

    // Log activity
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

// @desc    Update menu item
// @route   PUT /api/menu/:id
// @access  Private (canManageMenu permission)
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

// @desc    Delete menu item
// @route   DELETE /api/menu/:id
// @access  Private (canManageMenu permission)
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

    // Log activity
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

// @desc    Get menu items by category
// @route   GET /api/menu/category/:category
// @access  Private
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

// @desc    Toggle menu item availability
// @route   PATCH /api/menu/:id/toggle
// @access  Private
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

    // Log activity
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