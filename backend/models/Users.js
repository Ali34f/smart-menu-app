const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Platform roles are cross-tenant; other roles must belong to a restaurant.
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() {
      return this.role !== 'super_owner' && this.role !== 'platform_admin';
    }
  },
  managedRestaurantIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant'
    }],
    default: []
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['platform_admin', 'super_owner', 'owner', 'manager', 'staff'],
    default: 'staff'
  },
  permissions: {
    canManageMenu: {
      type: Boolean,
      default: true
    },
    canManageIngredients: {
      type: Boolean,
      default: true
    },
    canManageAllergens: {
      type: Boolean,
      default: true
    },
    canViewReports: {
      type: Boolean,
      default: false
    },
    canManageStaff: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },
  invitationAccepted: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },
  twoFactorTempSecret: {
    type: String,
    default: null,
    select: false
  },
  reactivationToken: String,
  reactivationTokenExpire: Date
}, {
  timestamps: true
});

// Only touch bcrypt when the password field changed (other presaves run on every save).
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      restaurantId: this.restaurantId,
      role: this.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

// Permission flags always follow the role on save (staff invites still set invitationAccepted in code).
userSchema.pre('save', function(next) {
  if (this.role === 'owner') {
    this.permissions = {
      canManageMenu: true,
      canManageIngredients: true,
      canManageAllergens: true,
      canViewReports: true,
      canManageStaff: true
    };
    this.invitationAccepted = true;
  } else if (this.role === 'manager') {
    this.permissions = {
      canManageMenu: true,
      canManageIngredients: true,
      canManageAllergens: true,
      canViewReports: true,
      canManageStaff: true
    };
  } else if (this.role === 'staff') {
    this.permissions = {
      canManageMenu: false,
      canManageIngredients: false,
      canManageAllergens: true,
      canViewReports: false,
      canManageStaff: false
    };
  } else if (this.role === 'super_owner' || this.role === 'platform_admin') {
    this.permissions = {
      canManageMenu: true,
      canManageIngredients: true,
      canManageAllergens: true,
      canViewReports: true,
      canManageStaff: true
    };
    this.invitationAccepted = true;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);