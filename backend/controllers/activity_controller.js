const Activity = require('../models/Activity');

// @desc    Get recent activities for restaurant
// @route   GET /api/activity
// @access  Private
exports.getActivities = async (req, res, next) => {
  try {
    const requested = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 10;
    // Workspace context is resolved by auth middleware and can differ from user.restaurantId.
    if (!req.restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Select an active restaurant workspace before viewing activity'
      });
    }

    const activities = await Activity.find({ restaurantId: req.restaurantId })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Format the activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      action: activity.action,
      text: formatActivityText(activity.action, activity.itemName),
      time: getTimeAgo(activity.createdAt),
      user: activity.userName
    }));

    res.status(200).json({
      success: true,
      count: formattedActivities.length,
      data: formattedActivities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log a new activity
// @route   POST /api/activity
// @access  Private
exports.logActivity = async (req, res, next) => {
  try {
    const { action, itemName, emoji, details } = req.body;
    if (!req.restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Select an active restaurant workspace before logging activity'
      });
    }

    const activity = await Activity.create({
      restaurantId: req.restaurantId,
      userId: req.user.id,
      userName: req.user.name || req.user.email.split('@')[0],
      action,
      itemName,
      emoji: emoji || getEmojiForAction(action),
      details
    });

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to format activity text
function formatActivityText(action, itemName) {
  const actionTexts = {
    'menu_item_created': `New dish added: ${itemName}`,
    'menu_item_updated': `${itemName} edited`,
    'menu_item_deleted': `${itemName} removed from menu`,
    'availability_changed': `${itemName} availability changed`,
    'allergen_updated': `Allergens updated for ${itemName}`,
    'price_updated': `Price updated for ${itemName}`
  };
  return actionTexts[action] || `${itemName} modified`;
}

// Helper function to get emoji for action
function getEmojiForAction(action) {
  const emojiMap = {
    'menu_item_created': '🍽️',
    'menu_item_updated': '✏️',
    'menu_item_deleted': '🗑️',
    'availability_changed': '🔄',
    'allergen_updated': '⚠️',
    'price_updated': '💰'
  };
  return emojiMap[action] || '📝';
}

// Helper function to get relative time
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - new Date(date);

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;

  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Export helper for use in other controllers
exports.logActivityHelper = async (restaurantId, userId, userName, action, itemName, emoji) => {
  try {
    await Activity.create({
      restaurantId,
      userId,
      userName,
      action,
      itemName,
      emoji: emoji || getEmojiForAction(action)
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
