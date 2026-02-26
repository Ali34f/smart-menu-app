const Restaurant = require('../models/Restaurant');

// @desc    Get current user's restaurant
// @route   GET /api/restaurant
// @access  Private
exports.getRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId).select(
      'name email phone cuisineType address'
    ).lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user's restaurant
// @route   PUT /api/restaurant
// @access  Private
exports.updateRestaurant = async (req, res, next) => {
  try {
    const { name, email, phone, cuisineType } = req.body;

    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    if (name !== undefined) restaurant.name = name;
    if (email !== undefined) restaurant.email = email;
    if (phone !== undefined) restaurant.phone = phone;
    if (cuisineType !== undefined) restaurant.cuisineType = cuisineType;

    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant updated successfully',
      data: {
        name: restaurant.name,
        email: restaurant.email,
        phone: restaurant.phone,
        cuisineType: restaurant.cuisineType
      }
    });
  } catch (error) {
    next(error);
  }
};
