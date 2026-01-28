const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: [
      'menu_item_created',
      'menu_item_updated',
      'menu_item_deleted',
      'availability_changed',
      'allergen_updated',
      'price_updated'
    ],
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  emoji: {
    type: String,
    default: '📝'
  },
  details: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
activitySchema.index({ restaurantId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
