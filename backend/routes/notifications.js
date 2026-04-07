const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead
} = require('../controllers/notification_controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/mark-all-read', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
