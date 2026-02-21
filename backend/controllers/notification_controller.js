const Notification = require('../models/Notification');

// @desc    Get latest notifications for restaurant
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    if (!req.restaurantId) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    const notifications = await Notification.find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    if (!req.restaurantId) {
      return res.status(200).json({
        success: true,
        data: { unreadCount: 0 }
      });
    }

    const unreadCount = await Notification.countDocuments({
      restaurantId: req.restaurantId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching unread notification count',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
exports.markAllNotificationsRead = async (req, res) => {
  try {
    if (!req.restaurantId) {
      return res.status(200).json({
        success: true,
        data: { updatedCount: 0 }
      });
    }

    const result = await Notification.updateMany(
      {
        restaurantId: req.restaurantId,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.status(200).json({
      success: true,
      data: { updatedCount: result.modifiedCount || 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message
    });
  }
};
