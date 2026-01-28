const express = require('express');
const { getActivities, logActivity } = require('../controllers/activity_controller');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getActivities);
router.post('/', protect, logActivity);

module.exports = router;
