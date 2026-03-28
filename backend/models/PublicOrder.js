const mongoose = require('mongoose');

const publicOrderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const publicOrderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true
    },
    tableNumber: {
      type: Number,
      required: true,
      min: 1
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending_cash', 'paid_demo'],
      required: true
    },
    paymentReference: {
      type: String,
      default: null
    },
    items: {
      type: [publicOrderItemSchema],
      default: []
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'placed'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublicOrder', publicOrderSchema);
