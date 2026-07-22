const express = require('express');
const { protect } = require('../middleware/auth');
const billing = require('../controllers/billing_controller');

const router = express.Router();

router.get('/config', protect, billing.getBillingConfig);
router.post('/checkout-session', protect, billing.createCheckoutSession);
router.post('/portal-session', protect, billing.createPortalSession);

module.exports = router;
