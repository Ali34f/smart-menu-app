const User = require('../models/Users');
const Restaurant = require('../models/Restaurant');
const { createNotification } = require('../utils/notificationHelper');

const isPlatformAdminRole = (role) => role === 'platform_admin' || role === 'super_owner';
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const RESTAURANT_TEAM_ROLES = ['owner', 'manager', 'staff'];

const rolesActorMayAssign = (actorRole) => {
  if (isPlatformAdminRole(actorRole)) {
    return ['owner', 'manager', 'staff'];
  }
  if (actorRole === 'owner' || actorRole === 'manager') {
    return ['manager', 'staff'];
  }
  return [];
};

const assertMayAssignRole = (actorRole, targetRole) => {
  if (!RESTAURANT_TEAM_ROLES.includes(targetRole)) {
    return 'Invalid role for a restaurant team member.';
  }
  const allowed = rolesActorMayAssign(actorRole);
  if (!allowed.includes(targetRole)) {
    return `Your role cannot assign "${targetRole}". Owners and managers may only add managers and staff. Platform admins may add owners, managers, and staff.`;
  }
  return null;
};

exports.getStaff = async (req, res, next) => {
  try {
    let staff = [];

    // Platform admins: active workspace only, and exclude self. Others: full restaurant roster.
    if (isPlatformAdminRole(req.user.role)) {
      if (!req.restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Select an active restaurant workspace before viewing staff'
        });
      }
      // Find all users belonging to this restaurant 
      staff = await User.find({
        restaurantId: req.restaurantId,
        _id: { $ne: req.user.id }
      })
        .select('-password')
        .populate('restaurantId', 'name')
        .sort({ createdAt: -1 });
    } else {
      const userRestaurantId = req.user.restaurantId;

      if (!userRestaurantId) {
        return res.status(400).json({
          success: false,
          message: 'User does not have a restaurant assigned'
        });
      }

      staff = await User.find({
        restaurantId: userRestaurantId
      })
      .select('-password')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });
    }

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

exports.addStaff = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password || !role) {
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

    const assignErr = assertMayAssignRole(req.user.role, role);
    if (assignErr) {
      const status = assignErr.startsWith('Invalid') ? 400 : 403;
      return res.status(status).json({
        success: false,
        message: assignErr
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const staff = await User.create({
      restaurantId: req.restaurantId,
      name,
      email: normalizedEmail,
      password,
      role,
      invitationAccepted: false
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
    next(error);
  }
};

exports.updateStaff = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    const normalizedEmail = email ? normalizeEmail(email) : '';

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

    if (staff.role === 'owner') {
      if (!isPlatformAdminRole(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only a platform admin can modify an owner account'
        });
      }
      if (role && role !== 'owner') {
        return res.status(400).json({
          success: false,
          message: 'Owner role cannot be changed here. Contact platform support if you need to transfer ownership.'
        });
      }
      if (name) staff.name = name;
      if (normalizedEmail) staff.email = normalizedEmail;
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
      return res.status(200).json({
        success: true,
        data: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          isActive: staff.isActive
        }
      });
    }

    if (role) {
      const assignErr = assertMayAssignRole(req.user.role, role);
      if (assignErr) {
        const status = assignErr.startsWith('Invalid') ? 400 : 403;
        return res.status(status).json({ success: false, message: assignErr });
      }
    }

    if (name) staff.name = name;
    if (normalizedEmail) staff.email = normalizedEmail;
    if (role) staff.role = role;
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
    next(error);
  }
};

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

    // cant delete owner
    if (staff.role === 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete owner account'
      });
    }

    const deletedStaffName = staff.name;
    const targetRestaurantId = staff.restaurantId || req.restaurantId;

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
    next(error);
  }
};

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

    // Require their own password on accept — whatever was set at invite time is not meant to stay.
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
    next(error);
  }
};