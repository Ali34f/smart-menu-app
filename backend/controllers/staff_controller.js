const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');

// @desc    Get all staff for restaurant
// @route   GET /api/staff
// @access  Private (Owner, Manager, Staff)
exports.getStaff = async (req, res, next) => {
  try {
    // Check if the logged-in user is Mohammed Khan (super owner)
    // Check for both "mohammed khan" and just "mohammed" to be more flexible
    const isMohammedKhan = req.user.name.toLowerCase().includes('mohammed') ||
                          req.user.email.toLowerCase().includes('mohammed');

    let staff = [];

    if (isMohammedKhan) {
      // Mohammed Khan sees himself + all staff from all restaurants
      // First, get Mohammed Khan's own record
      const mohammedKhan = await User.findById(req.user.id)
        .select('-password');

      // Get all staff from all restaurants (excluding Mohammed Khan)
      const allStaff = await User.find({
        _id: { $ne: req.user.id }
      })
      .select('-password')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });

      // Add Mohammed Khan at the beginning
      staff = mohammedKhan ? [mohammedKhan, ...allStaff] : allStaff;
    } else {
      // Regular restaurant owners/managers see their restaurant's staff
      // Use the user's restaurantId directly from the user document
      const userRestaurantId = req.user.restaurantId;

      if (!userRestaurantId) {
        return res.status(400).json({
          success: false,
          message: 'User does not have a restaurant assigned'
        });
      }

      // Find all users belonging to this restaurant
      staff = await User.find({
        restaurantId: userRestaurantId
      })
      .select('-password')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });
    }

    // Count pending invitations for this restaurant
    const pendingInvitations = await User.countDocuments({
      restaurantId: req.user.restaurantId,
      invitationAccepted: false
    });

    res.status(200).json({
      success: true,
      count: staff.length,
      pendingInvitations,
      data: staff
    });
  } catch (error) {
    console.error('Error in getStaff:', error);
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

    // Create new staff member with invitation pending
    const staff = await User.create({
      restaurantId: req.restaurantId,
      name,
      email,
      password,
      role,
      invitationAccepted: false // New invites need to be accepted
    });

    res.status(201).json({
      success: true,
      data: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurantId: staff.restaurantId,
        invitationAccepted: staff.invitationAccepted
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

    // Check if the logged-in user is Mohammed Khan (super owner)
    const isMohammedKhan = req.user.name.toLowerCase().includes('mohammed') ||
                          req.user.email.toLowerCase().includes('mohammed');

    // Find staff member
    let staff;

    if (isMohammedKhan) {
      // Mohammed Khan can update any staff from any restaurant
      staff = await User.findById(req.params.id);
    } else {
      // Regular owners/managers can only update staff from their own restaurant
      staff = await User.findOne({
        _id: req.params.id,
        restaurantId: req.restaurantId
      });
    }

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
    // Check if the logged-in user is Mohammed Khan (super owner)
    const isMohammedKhan = req.user.name.toLowerCase().includes('mohammed') ||
                          req.user.email.toLowerCase().includes('mohammed');

    let staff;

    if (isMohammedKhan) {
      // Mohammed Khan can delete any staff from any restaurant
      staff = await User.findById(req.params.id);
    } else {
      // Regular owners can only delete staff from their own restaurant
      staff = await User.findOne({
        _id: req.params.id,
        restaurantId: req.restaurantId
      });
    }

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

    // Hard delete - completely remove from database
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting staff',
      error: error.message
    });
  }
};

// @desc    Accept invitation
// @route   POST /api/staff/accept-invitation
// @access  Private
exports.acceptInvitation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.invitationAccepted) {
      return res.status(400).json({
        success: false,
        message: 'Invitation already accepted'
      });
    }

    user.invitationAccepted = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        id: user._id,
        invitationAccepted: user.invitationAccepted
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accepting invitation',
      error: error.message
    });
  }
};