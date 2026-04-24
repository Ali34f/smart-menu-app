const Ingredient = require('../models/Ingredient');
const MenuItem = require('../models/MenuItem');

exports.getIngredients = async (req, res, next) => {
  try {
    const ingredients = await Ingredient.find({ restaurantId: req.restaurantId })
      .populate('allergens', 'name icon')
      .sort('name');

    // dishCount: one scan of menu ingredient lists instead of N separate counts.
    const menuItems = await MenuItem.find({ restaurantId: req.restaurantId }).select('ingredients');
    const ingredientUsage = {};
    menuItems.forEach((mi) => {
      (mi.ingredients || []).forEach((ingId) => {
        const id = ingId.toString();
        ingredientUsage[id] = (ingredientUsage[id] || 0) + 1;
      });
    });

    const ingredientsWithCount = ingredients.map((ing) => {
      const obj = ing.toObject();
      obj.dishCount = ingredientUsage[ing._id.toString()] || 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: ingredients.length,
      data: ingredientsWithCount
    });
  } catch (error) {
    next(error);
  }
};

exports.getIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    }).populate('allergens', 'name icon description');

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    const dishCount = await MenuItem.countDocuments({
      restaurantId: req.restaurantId,
      ingredients: ingredient._id
    });

    res.status(200).json({
      success: true,
      data: {
        ...ingredient.toObject(),
        dishCount
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createIngredient = async (req, res, next) => {
  try {
    req.body.restaurantId = req.restaurantId;

    const ingredient = await Ingredient.create(req.body);
    await ingredient.populate('allergens', 'name icon');

    res.status(201).json({
      success: true,
      message: 'Ingredient created successfully',
      data: { ...ingredient.toObject(), dishCount: 0 }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateIngredient = async (req, res, next) => {
  try {
    let ingredient = await Ingredient.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('allergens', 'name icon');

    const dishCount = await MenuItem.countDocuments({
      restaurantId: req.restaurantId,
      ingredients: ingredient._id
    });

    res.status(200).json({
      success: true,
      data: { ...ingredient.toObject(), dishCount }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteIngredient = async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId
    });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    await ingredient.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Ingredient deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
