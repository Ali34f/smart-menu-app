const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const QRCode = require('qrcode');
const { getEffectivePermissions } = require('../utils/permissions');
const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';
const normalizeRole = (role) => (isPlatformAdminRole(role) ? 'platform_admin' : role);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// @desc    Register restaurant and owner account
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const {
      // Restaurant details
      restaurantName,
      restaurantEmail,
      restaurantPhone,
      cuisineType,
      street,
      city,
      postcode,
      // Owner details
      ownerName,
      ownerEmail,
      ownerPassword
    } = req.body;

    if (
      !isNonEmptyString(restaurantName) ||
      !isNonEmptyString(restaurantEmail) ||
      !isNonEmptyString(restaurantPhone) ||
      !isNonEmptyString(cuisineType) ||
      !isNonEmptyString(street) ||
      !isNonEmptyString(city) ||
      !isNonEmptyString(postcode) ||
      !isNonEmptyString(ownerName) ||
      !isNonEmptyString(ownerEmail) ||
      !isNonEmptyString(ownerPassword)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields as valid text values'
      });
    }

    const normalizedRestaurantEmail = restaurantEmail.trim().toLowerCase();
    const normalizedOwnerEmail = ownerEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedRestaurantEmail) || !isValidEmail(normalizedOwnerEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid email addresses'
      });
    }

    // Check if restaurant email already exists
    const restaurantExists = await Restaurant.findOne({ email: normalizedRestaurantEmail });
    if (restaurantExists) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant with this email already exists'
      });
    }

    // Check if owner email already exists
    const userExists = await User.findOne({ email: normalizedOwnerEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name: restaurantName,
      email: normalizedRestaurantEmail,
      phone: restaurantPhone,
      cuisineType,
      address: {
        street,
        city,
        postcode
      }
    });

    // 🆕 GENERATE QR CODE (auto-generated as requested by supervisor)
    const qrCodeUrl = `https://smartmenu.app/menu/${restaurant._id}`;
    restaurant.qrCode = qrCodeUrl;
    await restaurant.save();

    // New restaurants appear immediately for platform admins (managed workspaces)
    await User.updateMany(
      { role: { $in: ['platform_admin', 'super_owner'] } },
      { $addToSet: { managedRestaurantIds: restaurant._id } }
    );

    // Create owner user account
    const user = await User.create({
      restaurantId: restaurant._id,
      name: ownerName,
      email: normalizedOwnerEmail,
      password: ownerPassword,
      role: 'owner',
      invitationAccepted: true // Owners don't need to accept invitations
    });

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Restaurant and owner account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        permissions: getEffectivePermissions(user),
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        qrCode: restaurant.qrCode // 🆕 Include QR code in response
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password and block object-based injections
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check for user (include password field)
    let userQuery = User.findOne({ email: normalizedEmail }).select('+password');
    if (typeof userQuery.populate === 'function') {
      userQuery = userQuery.populate('restaurantId', 'name qrCode');
      if (typeof userQuery.populate === 'function') {
        userQuery = userQuery.populate('managedRestaurantIds', 'name qrCode');
      }
    }
    const user = await userQuery;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your restaurant manager.'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT token
    const token = user.getSignedJwtToken();

    const managedRestaurants = (user.managedRestaurantIds || []).map((r) => ({
      id: r._id,
      name: r.name,
      qrCode: r.qrCode
    }));
    const activeRestaurant = user.restaurantId || user.managedRestaurantIds?.[0] || null;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        permissions: getEffectivePermissions(user),
        restaurantId: activeRestaurant?._id || null,
        restaurantName: activeRestaurant?.name || '',
        qrCode: activeRestaurant?.qrCode || '',
        managedRestaurants,
        profilePicture: user.profilePicture,
        invitationAccepted: user.invitationAccepted
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('restaurantId', 'name email logo qrCode')
      .populate('managedRestaurantIds', 'name email logo qrCode');

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        permissions: getEffectivePermissions(user),
        isActive: user.isActive,
        invitationAccepted: user.invitationAccepted,
        profilePicture: user.profilePicture,
        restaurantId: user.restaurantId,
        managedRestaurantIds: user.managedRestaurantIds
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update name if provided
    if (name) {
      user.name = name;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Set new password
      user.password = newPassword;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get restaurants current user can access
// @route   GET /api/auth/my-restaurants
// @access  Private
exports.getMyRestaurants = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('managedRestaurantIds', 'name qrCode isActive')
      .populate('restaurantId', 'name qrCode isActive');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let restaurants = [];
    if (isPlatformAdminRole(user.role)) {
      // All restaurants in the system — stays in sync when new venues register (no stale managed list)
      const allRestaurants = await Restaurant.find({})
        .select('name qrCode isActive')
        .sort({ name: 1 })
        .lean();
      restaurants = allRestaurants.map((r) => ({
        id: r._id,
        name: r.name,
        qrCode: r.qrCode,
        isActive: r.isActive
      }));
    } else if (user.restaurantId) {
      restaurants = [{
        id: user.restaurantId._id,
        name: user.restaurantId.name,
        qrCode: user.restaurantId.qrCode,
        isActive: user.restaurantId.isActive
      }];
    }

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate and switch active restaurant context for current session
// @route   POST /api/auth/switch-restaurant
// @access  Private
exports.switchRestaurant = async (req, res, next) => {
  try {
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId is required'
      });
    }

    const user = await User.findById(req.user.id).populate('managedRestaurantIds', 'name qrCode');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!isPlatformAdminRole(user.role)) {
      const ownRestaurantId = user.restaurantId?.toString();
      if (!ownRestaurantId || ownRestaurantId !== restaurantId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this restaurant'
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          id: user.restaurantId,
          name: null,
          qrCode: null
        }
      });
    }

    const target = await Restaurant.findById(restaurantId).select('name qrCode');
    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // Keep currently selected context on user record for convenience.
    if (!user.restaurantId || user.restaurantId.toString() !== target._id.toString()) {
      user.restaurantId = target._id;
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        id: target._id,
        name: target.name,
        qrCode: target.qrCode
      }
    });
  } catch (error) {
    next(error);
  }
};