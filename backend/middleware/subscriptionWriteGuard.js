const Restaurant = require('../models/Restaurant');
const { canPerformWrites } = require('../config/plans');

/**
 * Blocks mutating dashboard routes when subscription is past grace (e.g. unpaid after grace).
 */
exports.requireSubscriptionWrites = async (req, res, next) => {
  if (!req.restaurantId) {
    return next();
  }
  try {
    const query = Restaurant.findById(req.restaurantId);
    if (!query || typeof query.select !== 'function') {
      return next();
    }
    const restaurant = await query.select('subscription').lean();
    if (!restaurant) {
      return next();
    }
    if (!canPerformWrites(restaurant)) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_BLOCKED',
        message:
          'This workspace cannot be edited until billing is resolved. Update your payment method in the billing portal or contact support.'
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};
