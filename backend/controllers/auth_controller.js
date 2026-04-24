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
const getChallengeSigningSecret = () => {
  if (!isNonEmptyString(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET is required for login challenge signing');
  }
  return process.env.JWT_SECRET.trim();
};
const signShortToken = (payload) =>
  crypto
    .createHmac('sha256', getChallengeSigningSecret())
    .update(JSON.stringify(payload))
    .digest('hex');

exports.register = async (req, res, next) => {
  try {
    const {
      restaurantName,
      restaurantEmail,
      restaurantPhone,
      cuisineType,
      street,
      city,
      postcode,
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

    const restaurantExists = await Restaurant.findOne({ email: normalizedRestaurantEmail });
    if (restaurantExists) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant with this email already exists'
      });
    }

    const userExists = await User.findOne({ email: normalizedOwnerEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

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

    // Default deep link until someone regenerates QR with their real frontend base.
    const qrCodeUrl = `https://smartmenu.app/menu/${restaurant._id}`;
    restaurant.qrCode = qrCodeUrl;
    await restaurant.save();

    // Every platform role can open the new venue without maintaining a manual list.
    await User.updateMany(
      { role: { $in: ['platform_admin', 'super_owner'] } },
      { $addToSet: { managedRestaurantIds: restaurant._id } }
    );

    const user = await User.create({
      restaurantId: restaurant._id,
      name: ownerName,
      email: normalizedOwnerEmail,
      password: ownerPassword,
      role: 'owner',
      invitationAccepted: true
    });

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
        qrCode: restaurant.qrCode
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Require real strings so Mongo query operators cannot be passed through JSON bodies.
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

    let userQuery = User.findOne({ email: normalizedEmail }).select('+password');
    // Unit tests stub findOne without a full populate chain — call it only if present.
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

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is deactivated. Use the reactivate option to restore access.',
        requiresReactivation: true
      });
    }

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

    user.lastLogin = Date.now();
    await user.save();

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

exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

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

    if (name) {
      user.name = name;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password is required to change password'
        });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

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
      // Full directory for platform roles; new signups show up without touching managedRestaurantIds.
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

    // Remember the pick so protect() and /me line up on the next request.
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

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!isNonEmptyString(email)) {
      return res.status(400).json({ success: false, message: 'Please provide email' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    // Same outcome whether the email exists — don't help attackers enumerate accounts.
    if (!user) {
      return res.status(200).json({ success: true, message: 'If this account exists, a reset link has been prepared.' });
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const frontendBase = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;
    const allowDebugResetUrl = process.env.ALLOW_INSECURE_PASSWORD_RESET_DEBUG === 'true';
    return res.status(200).json({
      success: true,
      message: 'Password reset requested',
      ...(allowDebugResetUrl ? { data: { resetUrl } } : {})
    });
  } catch (error) {
    next(error);
  }
};

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
    // Same pattern as login — tests often stub findById without .populate.
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