const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Ingredient must belong to a restaurant']
  },
  name: {
    type: String,
    required: [true, 'Please add an ingredient name'],
    trim: true,
    maxlength: [100, 'Ingredient name cannot be more than 100 characters']
  },
  category: {
    type: String,
    enum: ['Protein', 'Dairy', 'Grains', 'Vegetables', 'Fruits', 'Spices', 'Oils', 'Other'],
    default: 'Other'
  },
  allergens: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Allergen'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Create compound index to prevent duplicate ingredients per restaurant
ingredientSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);