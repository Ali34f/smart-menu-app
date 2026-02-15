const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'User must be associated with a restaurant']
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
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff'],
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
    default: true // Owners and directly registered users have it true by default
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
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

// Set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.role === 'owner') {
    this.permissions = {
      canManageMenu: true,
      canManageIngredients: true,
      canManageAllergens: true,
      canViewReports: true,
      canManageStaff: true
    };
    // Owners always have invitation accepted
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
      canManageMenu: true,
      canManageIngredients: true,
      canManageAllergens: true,
      canViewReports: false,
      canManageStaff: false
    };
  }
  next();
});

module.exports = mongoose.model('User', userSchema);