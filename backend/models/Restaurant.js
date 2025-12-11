const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a restaurant name'],
    trim: true,
    maxlength: [100, 'Restaurant name cannot be more than 100 characters']
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
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{10,15}$/, 'Please add a valid phone number']
  },
  cuisineType: {
    type: String,
    required: [true, 'Please specify cuisine type'],
    enum: [
      'Indian',
      'Italian',
      'Chinese',
      'Japanese',
      'Thai',
      'Mexican',
      'American',
      'British',
      'Mediterranean',
      'Middle Eastern',
      'French',
      'Spanish',
      'Other'
    ]
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please add a street address']
    },
    city: {
      type: String,
      required: [true, 'Please add a city']
    },
    postcode: {
      type: String,
      required: [true, 'Please add a postcode'],
      uppercase: true,
      match: [
        /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i,
        'Please add a valid UK postcode'
      ]
    },
    country: {
      type: String,
      default: 'United Kingdom'
    }
  },
  logo: {
    type: String,
    default: null
  },
  businessRegistrationNumber: {
    type: String,
    default: null
  },
  vatNumber: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  qrCode: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Generate QR code URL before saving
restaurantSchema.pre('save', function(next) {
  if (!this.qrCode) {
    // This will be the public menu URL for customers
    this.qrCode = `https://smartmenu.app/menu/${this._id}`;
  }
  next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);