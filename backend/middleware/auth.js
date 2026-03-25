const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const { getEffectivePermissions } = require('../utils/permissions');
const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';

const normalizeRole = (role) => String(role || '').toLowerCase().trim();

/** Roles that may edit menu items in normal restaurant operations */
const MENU_EDITOR_ROLES = new Set(['owner', 'manager', 'staff', 'platform_admin', 'super_owner']);

/** Roles that may edit ingredients */
const INGREDIENT_EDITOR_ROLES = MENU_EDITOR_ROLES;

/**
 * Prefer this over checkPermission('canEditMenu') for menu updates — DB permission flags can be missing/legacy.
 */
exports.requireCanEditMenu = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (MENU_EDITOR_ROLES.has(role)) {
    return next();
  }
  if (req.user?.permissions?.canEditMenu) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to perform this action'
  });
};

exports.requireCanEditIngredients = (req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (INGREDIENT_EDITOR_ROLES.has(role)) {
    return next();
  }
  if (req.user?.permissions?.canEditIngredients) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'You do not have permission to perform this action'
  });
};

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check if authorization header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from "Bearer <token>"
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token
    req.user = await User.findById(decoded.id).select('-password');

    // Check if user exists and is active
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user.permissions = getEffectivePermissions(req.user);

    // Resolve active restaurant context.
    // - Regular users: always bound to their own restaurantId.
    // - super_owner: can pick via x-restaurant-id among managed restaurants.
    if (isPlatformAdminRole(req.user.role)) {
      const requestedRestaurantId = (req.headers['x-restaurant-id'] || '').toString().trim();
      const managedIds = (req.user.managedRestaurantIds || []).map((id) => id.toString());
      const fallbackRestaurantId = req.user.restaurantId ? req.user.restaurantId.toString() : managedIds[0];
      const activeRestaurantId = requestedRestaurantId || fallbackRestaurantId;

      if (!activeRestaurantId) {
        req.restaurantId = null;
        return next();
      }

      if (!mongoose.Types.ObjectId.isValid(activeRestaurantId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid restaurant context'
        });
      }

      // Platform admins can work in any restaurant that exists (new signups appear immediately)
      const restaurantExists = await Restaurant.findById(activeRestaurantId).select('_id').lean();
      if (!restaurantExists) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant not found'
        });
      }

      req.restaurantId = activeRestaurantId;
    } else {
      req.restaurantId = req.user.restaurantId;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check specific permissions
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.permissions || !req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to perform this action`
      });
    }
    next();
  };
};