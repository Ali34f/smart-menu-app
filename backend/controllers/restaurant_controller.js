const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Ingredient = require('../models/Ingredient');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const PublicOrder = require('../models/PublicOrder');
const User = require('../models/Users');
const {
  normalizeMenuCategoriesInput,
  getDefaultMenuCategoriesForCuisine
} = require('../utils/menuCategories');
const { publicSubscriptionPayload } = require('../config/plans');

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

// One row per weekday; anything that is not HH:MM falls back to 12:00–21:00.
const normalizeBusinessHours = (input = {}) => {
  const normalized = {};
  for (const day of DAY_KEYS) {
    const row = input?.[day] || {};
    const open = typeof row.open === 'string' && TIME_RE.test(row.open) ? row.open : '12:00';
    const close = typeof row.close === 'string' && TIME_RE.test(row.close) ? row.close : '21:00';
    normalized[day] = {
      enabled: Boolean(row.enabled),
      open,
      close
    };
  }
  return normalized;
};

exports.getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId)
      .select('name email phone cuisineType address welcomeMessage businessHours menuCategories subscription')
      .lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    const { subscription: _rawSubscription, ...profile } = restaurant;

    res.status(200).json({
      success: true,
      data: {
        ...profile,
        subscription: publicSubscriptionPayload(restaurant)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRestaurant = async (req, res, next) => {
  try {
    const { name, email, phone, cuisineType, welcomeMessage, businessHours, menuCategories } = req.body;

    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (name !== undefined) restaurant.name = name;
    if (email !== undefined) restaurant.email = email;
    if (phone !== undefined) restaurant.phone = phone;
    if (cuisineType !== undefined) restaurant.cuisineType = cuisineType;
    if (welcomeMessage !== undefined) restaurant.welcomeMessage = String(welcomeMessage || '').slice(0, 300);
    if (businessHours !== undefined) restaurant.businessHours = normalizeBusinessHours(businessHours);

    if (menuCategories !== undefined) {
      const role = String(req.user?.role || '').toLowerCase();
      // Staff can edit service details; category taxonomy is owner/manager (and platform).
      if (!['owner', 'manager', 'platform_admin', 'super_owner'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Only owners and managers can update menu categories'
        });
      }
      const normalized = normalizeMenuCategoriesInput(menuCategories);
      restaurant.menuCategories = normalized.length > 0 ? normalized : [];
    }

    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      data: {
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        cuisineType: restaurant.cuisineType,
        welcomeMessage: restaurant.welcomeMessage,
        businessHours: restaurant.businessHours,
        menuCategories: restaurant.menuCategories || []
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllRestaurantData = async (req, res, next) => {
  try {
    // Menu, ingredients, audit trails, guest orders — not the Restaurant doc or user accounts.
    const [menuResult, ingredientResult, activityResult, notificationResult, orderResult] = await Promise.all([
      MenuItem.deleteMany({ restaurantId: req.restaurantId }),
      Ingredient.deleteMany({ restaurantId: req.restaurantId }),
      Activity.deleteMany({ restaurantId: req.restaurantId }),
      Notification.deleteMany({ restaurantId: req.restaurantId }),
      PublicOrder.deleteMany({ restaurantId: req.restaurantId })
    ]);

    // Nuke rollup fields tied to the deleted rows so analytics do not show stale totals.
    await Restaurant.findByIdAndUpdate(req.restaurantId, {
      $set: {
        dailyScans: {},
        allergenFilterUsage: {}
      }
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant operational data deleted successfully',
      data: {
        menuItemsDeleted: menuResult.deletedCount || 0,
        ingredientsDeleted: ingredientResult.deletedCount || 0,
        activityDeleted: activityResult.deletedCount || 0,
        notificationsDeleted: notificationResult.deletedCount || 0,
        ordersDeleted: orderResult.deletedCount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateRestaurantAccount = async (req, res, next) => {
  try {
    await Promise.all([
      User.findByIdAndUpdate(req.user.id, { $set: { isActive: false } }),
      Restaurant.findByIdAndUpdate(req.restaurantId, { $set: { isActive: false } })
    ]);

    res.status(200).json({
      success: true,
      message: 'Account and restaurant have been deactivated'
    });
  } catch (error) {
    next(error);
  }
};
