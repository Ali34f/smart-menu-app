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
  reactivationTokenExpire: Date,
  /** HR / payroll fields — visible only to owner, manager, and platform admins in API responses. */
  staffProfile: {
    age: {
      type: Number,
      min: [16, 'Age must be at least 16'],
      max: [100, 'Please enter a valid age'],
      default: null
    },
    gender: {
      type: String,
      default: undefined,
      validate: {
        validator(v) {
          if (v === null || v === undefined || v === '') return true;
          return ['female', 'male', 'non_binary', 'prefer_not_say', 'other'].includes(String(v).toLowerCase());
        },
        message: 'Invalid gender value'
      }
    },
    /** Workplace job title (e.g. Chef, Server) — separate from dashboard permission role */
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [80, 'Job title cannot exceed 80 characters'],
      default: null
    },
    /** Gross hourly pay in GBP (numeric pounds, e.g. 12.50) */
    hourlyRate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
      default: null
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number is too long'],
      default: null
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: [80, 'Emergency contact name is too long'],
      default: null
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Emergency phone is too long'],
      default: null
    },
    startDate: {
      type: Date,
      default: null
    },
    /** Visible only to managers/owners/admins — keep short */
    notesInternal: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: null
    },
    /** Employment & payroll (UK-oriented; optional on invite) */
    contractType: {
      type: String,
      trim: true,
      maxlength: [32, 'Contract type is invalid'],
      default: null
    },
    addressLine1: {
      type: String,
      trim: true,
      maxlength: [120, 'Address line is too long'],
      default: null
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: [120, 'Address line is too long'],
      default: null
    },
    townCity: {
      type: String,
      trim: true,
      maxlength: [80, 'Town or city is too long'],
      default: null
    },
    county: {
      type: String,
      trim: true,
      maxlength: [80, 'County is too long'],
      default: null
    },
    postcode: {
      type: String,
      trim: true,
      maxlength: [16, 'Postcode is too long'],
      default: null
    },
    niNumber: {
      type: String,
      trim: true,
      maxlength: [16, 'National Insurance number is too long'],
      default: null
    },
    taxCode: {
      type: String,
      trim: true,
      maxlength: [16, 'Tax code is too long'],
      default: null
    },
    paymentFrequency: {
      type: String,
      trim: true,
      maxlength: [24, 'Payment frequency is invalid'],
      default: null
    },
    /** Typical contracted hours (optional; supports payroll estimates) */
    hoursPerWeek: {
      type: Number,
      min: [0, 'Hours per week cannot be negative'],
      max: [168, 'Hours per week cannot exceed 168'],
      default: null
    },
    bankAccountHolderName: {
      type: String,
      trim: true,
      maxlength: [120, 'Account name is too long'],
      default: null
    },
    /** UK format: 6 digits, may be stored without dashes */
    bankSortCode: {
      type: String,
      trim: true,
      maxlength: [10, 'Sort code is too long'],
      default: null
    },
    bankAccountNumber: {
      type: String,
      trim: true,
      maxlength: [18, 'Account number is too long'],
      default: null
    }
  }
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