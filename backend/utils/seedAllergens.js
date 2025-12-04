const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Allergen = require('../models/Allergen');

// Load env vars
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// UK Food Information Regulations 2014 - 14 Major Allergens
const allergens = [
  {
    name: 'Milk',
    icon: '🥛',
    description: 'Including lactose. Found in butter, cheese, cream, milk powders and yoghurt.',
    category: 'major'
  },
  {
    name: 'Eggs',
    icon: '🥚',
    description: 'Found in cakes, some meat products, mayonnaise, mousses, pasta, quiche, sauces and pastries.',
    category: 'major'
  },
  {
    name: 'Fish',
    icon: '🐟',
    description: 'All fish species. Found in some fish sauces, pizzas, relishes, salad dressings, stock cubes and Worcestershire sauce.',
    category: 'major'
  },
  {
    name: 'Crustaceans',
    icon: '🦐',
    description: 'Prawns, crabs, lobster, crayfish. Found in shrimp paste, commonly used in Thai and south-east Asian curries or salads.',
    category: 'major'
  },
  {
    name: 'Molluscs',
    icon: '🐚',
    description: 'Mussels, oysters, squid, snails. Commonly found in oyster sauce or as a flavouring in fish stews.',
    category: 'major'
  },
  {
    name: 'Peanuts',
    icon: '🥜',
    description: 'Groundnuts. Found in biscuits, cakes, curries, desserts, sauces (such as satay sauce), groundnut oil and peanut flour.',
    category: 'major'
  },
  {
    name: 'Tree Nuts',
    icon: '🌰',
    description: 'Almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamia nuts. Found in breads, biscuits, crackers, desserts, nut oils, sauces and ice cream.',
    category: 'major'
  },
  {
    name: 'Soy',
    icon: '🫘',
    description: 'Soybeans and soy products. Found in bean curd, edamame beans, miso paste, textured soy protein, soy flour, tofu and soy sauce.',
    category: 'major'
  },
  {
    name: 'Gluten',
    icon: '🌾',
    description: 'Wheat (such as spelt and Khorasan wheat/Kamut), rye, barley and oats. Found in foods containing flour, such as some baking powder, batter, breadcrumbs, bread, cakes, couscous, meat products, pasta, pastry, sauces, soups and fried foods dusted with flour.',
    category: 'major'
  },
  {
    name: 'Celery',
    icon: '🥬',
    description: 'Including celeriac. Found in celery salt, salads, some meat products, soups and stock cubes.',
    category: 'common'
  },
  {
    name: 'Mustard',
    icon: '🟡',
    description: 'Liquid mustard, mustard powder and mustard seeds. Found in breads, curries, marinades, meat products, salad dressings, sauces and soups.',
    category: 'common'
  },
  {
    name: 'Sesame',
    icon: '🌿',
    description: 'Sesame seeds and sesame oil. Found in bread (burger buns for example), breadsticks, houmous, sesame oil and tahini.',
    category: 'common'
  },
  {
    name: 'Sulphites',
    icon: '⚗️',
    description: 'Sulphur dioxide (sometimes known as E220). Found in dried fruit such as raisins, dried apricots and prunes, meat products, soft drinks, vegetables, wine and beer.',
    category: 'common'
  },
  {
    name: 'Lupin',
    icon: '🌸',
    description: 'Lupin flour and seeds. Found in some types of bread, pastries and pasta.',
    category: 'other'
  }
];

const seedAllergens = async () => {
  try {
    // Clear existing allergens
    await Allergen.deleteMany();
    console.log('🗑️  Cleared existing allergens');

    // Insert UK 14 allergens
    await Allergen.insertMany(allergens);
    console.log('✅ Successfully seeded 14 UK mandatory allergens');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding allergens:', error);
    process.exit(1);
  }
};

seedAllergens();