const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const { getEffectivePermissions } = require('../utils/permissions');
const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';

const normalizeRole = (role) => String(role || '').toLowerCase().trim();

const MENU_EDITOR_ROLES = new Set(['owner', 'manager', 'staff', 'platform_admin', 'super_owner']);
const INGREDIENT_EDITOR_ROLES = MENU_EDITOR_ROLES;

// Role-first: some users never got granular flags; canEditMenu on the document is the fallback.
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

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user.permissions = getEffectivePermissions(req.user);

    // Tenant context: staff are fixed to restaurantId; platform roles may override with x-restaurant-id.
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