const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const { createNotification } = require('../utils/notificationHelper');

const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';

// @desc    Get all staff for restaurant
// @route   GET /api/staff
// @access  Private (Owner, Manager, Staff)
exports.getStaff = async (req, res, next) => {
  try {
    let staff = [];

    if (isPlatformAdminRole(req.user.role)) {
      // Platform admins: list only the active workspace restaurant's team (not yourself)
      if (!req.restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Select an active restaurant workspace before viewing staff'
        });
      }

      staff = await User.find({
        restaurantId: req.restaurantId,
        _id: { $ne: req.user.id }
      })
        .select('-password')
        .populate('restaurantId', 'name')
        .sort({ createdAt: -1 });
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

    // Count pending invitations for this restaurant (active workspace for platform admins)
    const pendingInvitations = await User.countDocuments({
      restaurantId: req.restaurantId,
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

    if (!req.restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'No restaurant context — select an active restaurant workspace first'
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

    await createNotification({
      restaurantId: req.restaurantId,
      type: 'staff_invited',
      title: 'New staff member invited',
      message: `${req.user.name || req.user.email} invited ${staff.name} as ${role}.`,
      createdBy: req.user.id
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

    // Find staff member
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

    const targetRestaurantId = staff.restaurantId || req.restaurantId;
    await staff.save();

    await createNotification({
      restaurantId: targetRestaurantId,
      type: 'staff_updated',
      title: 'Staff member updated',
      message: `${req.user.name || req.user.email} updated ${staff.name}'s profile.`,
      createdBy: req.user.id
    });

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

    const deletedStaffName = staff.name;
    const targetRestaurantId = staff.restaurantId || req.restaurantId;

    // Hard delete - completely remove from database
    await User.findByIdAndDelete(req.params.id);

    await createNotification({
      restaurantId: targetRestaurantId,
      type: 'staff_deleted',
      title: 'Staff member removed',
      message: `${req.user.name || req.user.email} removed ${deletedStaffName} from the team.`,
      createdBy: req.user.id
    });

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
    const { newPassword } = req.body || {};
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

    // Require a new password on first acceptance so temporary passwords
    // are not kept long term.
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password with at least 6 characters'
      });
    }

    user.password = newPassword.trim();
    user.invitationAccepted = true;
    await user.save();

    await createNotification({
      restaurantId: user.restaurantId,
      type: 'invitation_accepted',
      title: 'Invitation accepted',
      message: `${user.name} accepted their team invitation.`,
      createdBy: user._id
    });

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