const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');

// @desc    Get all staff for restaurant
// @route   GET /api/staff
// @access  Private (Owner, Manager)
exports.getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ 
      restaurantId: req.restaurantId,
      _id: { $ne: req.user.id } // Exclude current user
    })
    .select('-password')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching staff',
      error: error.message
    });
  }
};

// @desc    Add new staff member
// @route   POST /api/staff
// @access  Private (Owner, Manager with permission)
exports.addStaff = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role'
      });
    }

    // Check if role is valid
    const validRoles = ['manager', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only manager or staff allowed'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new staff member
    const staff = await User.create({
      restaurantId: req.restaurantId,
      name,
      email,
      password,
      role
    });

    res.status(201).json({
      success: true,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurantId: staff.restaurantId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding staff',
      error: error.message
    });
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Owner, Manager with permission)
exports.updateStaff = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;

    // Find staff member
    let staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Don't allow changing owner role
    if (staff.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify owner account'
      });
    }

    // Update fields
    if (name) staff.name = name;
    if (email) staff.email = email;
    if (role && ['manager', 'staff'].includes(role)) staff.role = role;
    if (typeof isActive === 'boolean') staff.isActive = isActive;

    await staff.save();

    res.status(200).json({
      success: true,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating staff',
      error: error.message
    });
  }
};

// @desc    Delete/Deactivate staff member
// @route   DELETE /api/staff/:id
// @access  Private (Owner only)
exports.deleteStaff = async (req, res, next) => {
  try {
    const staff = await User.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Don't allow deleting owner
    if (staff.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete owner account'
      });
    }

    // Soft delete - just deactivate
    staff.isActive = false;
    await staff.save();

    res.status(200).json({
      success: true,
      message: 'Staff member deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting staff',
      error: error.message
    });
  }
};