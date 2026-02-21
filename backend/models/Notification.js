const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'menu_item_created',
        'menu_item_updated',
        'menu_item_deleted',
        'availability_changed',
        'staff_invited',
        'staff_updated',
        'staff_deleted',
        'invitation_accepted'
      ]
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

notificationSchema.index({ restaurantId: 1, createdAt: -1 });
notificationSchema.index({ restaurantId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
