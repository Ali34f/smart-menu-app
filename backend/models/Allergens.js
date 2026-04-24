const mongoose = require('mongoose');

// Global list (not scoped by restaurant); menu items reference these ids.
const allergenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an allergen name'],
    unique: true,
    trim: true
  },
  icon: {
    type: String,
    default: '⚠️'
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  category: {
    type: String,
    enum: ['major', 'common', 'other'],
    default: 'major'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Allergen', allergenSchema);