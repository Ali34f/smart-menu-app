const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Menu item must belong to a restaurant']
  },
  name: {
    type: String,
    required: [true, 'Please add a dish name'],
    trim: true,
    maxlength: [100, 'Dish name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    trim: true,
    maxlength: [100, 'Category name is too long']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price cannot be negative']
  },
  image: {
    type: String,
    default: null
  },
  ingredients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient'
  }],
  allergens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Allergen'
  }],
  /** Staff explicitly confirmed the dish was reviewed and contains none of the standard listed allergens. */
  confirmedNoAllergens: {
    type: Boolean,
    default: false
  },
  dietaryInfo: {
    vegetarian: {
      type: Boolean,
      default: false
    },
    vegan: {
      type: Boolean,
      default: false
    },
    glutenFree: {
      type: Boolean,
      default: false
    },
    dairyFree: {
      type: Boolean,
      default: false
    },
    halal: {
      type: Boolean,
      default: false
    },
    kosher: {
      type: Boolean,
      default: false
    }
  },
  nutritionalInfo: {
    calories: {
      type: Number,
      min: 0
    },
    protein: {
      type: Number,
      min: 0
    },
    carbs: {
      type: Number,
      min: 0
    },
    fat: {
      type: Number,
      min: 0
    },
    fiber: {
      type: Number,
      min: 0
    },
    sugar: {
      type: Number,
      min: 0
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  // Estimated prep time in minutes (optional).
  preparationTime: {
    type: Number,
    default: null
  },
  spiceLevel: {
    type: String,
    enum: ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'],
    default: 'None'
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

menuItemSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

menuItemSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('MenuItem', menuItemSchema);