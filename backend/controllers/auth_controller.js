const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const QRCode = require('qrcode');

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

    // Check if restaurant email already exists
    const restaurantExists = await Restaurant.findOne({ email: restaurantEmail });
    if (restaurantExists) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant with this email already exists'
      });
    }

    // Check if owner email already exists
    const userExists = await User.findOne({ email: ownerEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create restaurant
    const restaurant = await Restaurant.create({
      name: restaurantName,
      email: restaurantEmail,
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

    // Create owner user account
    const user = await User.create({
      restaurantId: restaurant._id,
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
      role: 'owner'
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
        role: user.role,
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

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user (include password field)
    const user = await User.findOne({ email }).select('+password').populate('restaurantId', 'name qrCode');

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

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        restaurantId: user.restaurantId._id,
        restaurantName: user.restaurantId.name,
        qrCode: user.restaurantId.qrCode,
        profilePicture: user.profilePicture
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
    const user = await User.findById(req.user.id).populate('restaurantId', 'name email logo qrCode');

    res.status(200).json({
      success: true,
      data: user
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