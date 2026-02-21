const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead
} = require('../controllers/notification_controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/mark-all-read', markAllNotificationsRead);

module.exports = router;
