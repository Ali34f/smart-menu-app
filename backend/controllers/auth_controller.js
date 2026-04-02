const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const { getDefaultMenuCategoriesForCuisine } = require('../utils/menuCategories');
const QRCode = require('qrcode');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { getEffectivePermissions } = require('../utils/permissions');
const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';
const normalizeRole = (role) => (isPlatformAdminRole(role) ? 'platform_admin' : role);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const signShortToken = (payload) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'smart-menu-secret')
    .update(JSON.stringify(payload))
    .digest('hex');

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
      menuCategories: getDefaultMenuCategoriesForCuisine(cuisineType),
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

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Deactivated users can reactivate with valid credentials
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Use the reactivate option to restore access.',
        requiresReactivation: true
      });
    }

    // 2FA challenge flow
    if (user.twoFactorEnabled) {
      const ts = Date.now();
      const challengeToken = Buffer.from(
        JSON.stringify({
          uid: String(user._id),
          ts,
          sig: signShortToken({ uid: String(user._id), ts })
        }),
        'utf8'
      ).toString('base64url');
      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        message: 'Enter your 2FA code to complete login',
        challengeToken,
        user: {
          email: user.email,
          name: user.name,
          role: normalizeRole(user.role)
        }
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
        invitationAccepted: user.invitationAccepted,
        twoFactorEnabled: Boolean(user.twoFactorEnabled)
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
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
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

// @desc    Reactivate account using valid credentials
// @route   POST /api/auth/reactivate
// @access  Public
exports.reactivate = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    user.isActive = true;
    await user.save();
    if (user.restaurantId) {
      await Restaurant.findByIdAndUpdate(user.restaurantId, { $set: { isActive: true } });
    }
    return res.status(200).json({ success: true, message: 'Account reactivated. Please sign in.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Request a password reset token (dev returns token link)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!isNonEmptyString(email)) {
      return res.status(400).json({ success: false, message: 'Please provide email' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    // Do not leak user existence
    if (!user) {
      return res.status(200).json({ success: true, message: 'If this account exists, a reset link has been prepared.' });
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const frontendBase = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;
    return res.status(200).json({
      success: true,
      message: 'Password reset requested',
      // In production integrate email provider and omit this field
      data: { resetUrl }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password by token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!isNonEmptyString(token) || !isNonEmptyString(password)) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (password.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const hashed = hashToken(token.trim());
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpire: { $gt: new Date() }
    }).select('+password');
    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset token is invalid or expired' });
    }
    user.password = password.trim();
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    return res.status(200).json({ success: true, message: 'Password reset successful. Please sign in.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Start 2FA setup (returns QR + secret)
// @route   POST /api/auth/2fa/setup
// @access  Private
exports.setupTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorSecret +twoFactorTempSecret');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const generated = speakeasy.generateSecret({ name: `Smart Menu (${user.email})` });
    const secret = generated.base32;
    const otpauth = generated.otpauth_url;
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    user.twoFactorTempSecret = secret;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      success: true,
      data: {
        otpauthUrl: otpauth,
        qrDataUrl,
        manualKey: secret
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enable 2FA after verifying code
// @route   POST /api/auth/2fa/enable
// @access  Private
exports.enableTwoFactor = async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!isNonEmptyString(code)) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }
    const user = await User.findById(req.user.id).select('+twoFactorSecret +twoFactorTempSecret');
    if (!user || !user.twoFactorTempSecret) {
      return res.status(400).json({ success: false, message: '2FA setup not initialized' });
    }
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: code.trim().replace(/\s+/g, ''),
      window: 2
    });
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = null;
    user.twoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Disable 2FA
// @route   POST /api/auth/2fa/disable
// @access  Private
exports.disableTwoFactor = async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!isNonEmptyString(code)) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }
    const user = await User.findById(req.user.id).select('+twoFactorSecret');
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA is not enabled' });
    }
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code.trim().replace(/\s+/g, ''),
      window: 2
    });
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid 2FA code' });
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorTempSecret = null;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: '2FA disabled' });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete login with 2FA challenge token + code
// @route   POST /api/auth/verify-2fa-login
// @access  Public
exports.verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { challengeToken, code } = req.body || {};
    if (!isNonEmptyString(challengeToken) || !isNonEmptyString(code)) {
      return res.status(400).json({ success: false, message: 'Challenge token and code are required' });
    }
    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(challengeToken, 'base64url').toString('utf8'));
    } catch (_) {
      return res.status(400).json({ success: false, message: 'Invalid challenge token' });
    }
    const { uid, ts, sig } = parsed || {};
    if (!uid || !ts || !sig) return res.status(400).json({ success: false, message: 'Invalid challenge token' });
    if (Date.now() - Number(ts) > 10 * 60 * 1000) {
      return res.status(400).json({ success: false, message: 'Challenge expired. Please login again.' });
    }
    const expected = signShortToken({ uid, ts });
    if (expected !== sig) return res.status(400).json({ success: false, message: 'Invalid challenge token' });

    let userQuery = User.findById(uid).select('+twoFactorSecret');
    if (typeof userQuery.populate === 'function') {
      userQuery = userQuery.populate('restaurantId', 'name qrCode');
      if (typeof userQuery.populate === 'function') {
        userQuery = userQuery.populate('managedRestaurantIds', 'name qrCode');
      }
    }
    const user = await userQuery;
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, message: '2FA is not enabled for this account' });
    }
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Use the reactivate option to restore access.',
        requiresReactivation: true
      });
    }
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code.trim().replace(/\s+/g, ''),
      window: 2
    });
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid 2FA code' });

    user.lastLogin = Date.now();
    await user.save();
    const token = user.getSignedJwtToken();
    const managedRestaurants = (user.managedRestaurantIds || []).map((r) => ({
      id: r._id,
      name: r.name,
      qrCode: r.qrCode
    }));
    const activeRestaurant = user.restaurantId || user.managedRestaurantIds?.[0] || null;
    return res.status(200).json({
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
        invitationAccepted: user.invitationAccepted,
        twoFactorEnabled: Boolean(user.twoFactorEnabled)
      }
    });
  } catch (error) {
    next(error);
  }
};