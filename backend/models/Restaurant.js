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
  },
  dailyScans: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → count of distinct browser-day visits (client reports first visit of day). */
  dailyUniqueVisitors: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → sum of session duration seconds reported when guests leave the menu. */
  dailySessionSeconds: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → number of session-end samples (for average time). */
  dailySessionSamples: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → public orders placed (conversions). */
  dailyOrders: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → times a guest applied an allergen filter. */
  dailyFilteredViews: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → { sanitizedAllergenName: count } for range charts. */
  dailyAllergenUsage: {
    type: Object,
    default: {}
  },
  /** YYYY-MM-DD → { menuItemId: view count } for top dishes in a date range. */
  menuItemViewsByDay: {
    type: Object,
    default: {}
  },
  allergenFilterUsage: {
    type: Map,
    of: Number,
    default: {}
  },
  tableCount: {
    type: Number,
    default: 20,
    min: [1, 'Table count must be at least 1'],
    max: [500, 'Table count cannot exceed 500']
  },
  welcomeMessage: {
    type: String,
    default: 'Welcome to our menu. We are glad to have you here.',
    maxlength: [300, 'Welcome message cannot exceed 300 characters']
  },
  /** Ordered list of menu section names (public menu + staff dropdowns). Empty = use cuisine defaults. */
  menuCategories: {
    type: [String],
    default: undefined
  },
  businessHours: {
    monday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    },
    tuesday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    },
    wednesday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    },
    thursday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    },
    friday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    },
    saturday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    },
    sunday: {
      enabled: { type: Boolean, default: true },
      open: { type: String, default: '12:00' },
      close: { type: String, default: '21:00' }
    }
  }
}, {
  timestamps: true
});

// Generate QR code URL before saving
restaurantSchema.pre('save', function(next) {
  if (!this.qrCode) {
    // This will be the public menu URL for customers
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    this.qrCode = `${baseUrl}/public/menu/${this._id}`;
  }
  next();
});

module.exports = mongoose.model('Restaurant', restaurantSchema);