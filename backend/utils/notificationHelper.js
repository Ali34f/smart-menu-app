const Notification = require('../models/Notification');

const createNotification = async ({
  restaurantId,
  type,
  title,
  message,
  createdBy
}) => {
  try {
    if (!restaurantId || !type || !title || !message || !createdBy) {
      return null;
    }

    return await Notification.create({
      restaurantId,
      type,
      title,
      message,
      createdBy
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    return null;
  }
};

module.exports = {
  createNotification
};
