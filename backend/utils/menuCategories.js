/**
 * Default menu category order per cuisine (used when Restaurant.menuCategories is empty).
 * Keep in sync with frontend/src/utils/menuCategories.ts
 */
const CUISINE_MENU_CATEGORIES = {
  Indian: [
    'Starters',
    'Tandoori Dishes',
    'Seafood Dishes',
    'House Special Dishes',
    'Biryani Dishes',
    'English Dishes',
    'Side Dishes',
    'Sundries',
    'Condiments',
    'Drinks',
    'Desserts'
  ],
  Italian: [
    'Starters (Antipasti)',
    'Mains',
    'Pasta',
    'Pizza',
    'Risotto',
    'Seafood',
    'Desserts (Dolci)',
    'Drinks (Bevande)',
    'Sides',
    'Coffee'
  ],
  Chinese: [
    'Starters',
    'Soups',
    'Noodles',
    'Rice Dishes',
    'Main Dishes',
    'Dim Sum',
    'Seafood',
    'Desserts',
    'Drinks',
    'Sides',
    'Condiments'
  ],
  Japanese: [
    'Starters',
    'Sushi & Sashimi',
    'Ramen',
    'Mains',
    'Tempura',
    'Rice Dishes',
    'Desserts',
    'Drinks',
    'Sides'
  ],
  Thai: [
    'Starters',
    'Soups',
    'Salads',
    'Mains',
    'Noodles',
    'Curries',
    'Seafood',
    'Desserts',
    'Drinks',
    'Sides'
  ],
  Mexican: [
    'Starters',
    'Tacos & Burritos',
    'Mains',
    'Quesadillas',
    'Sides',
    'Salsas & Dips',
    'Desserts',
    'Drinks'
  ],
  American: [
    'Starters',
    'Mains',
    'Burgers & Sandwiches',
    'Sides',
    'Salads',
    'Desserts',
    'Drinks'
  ],
  British: [
    'Starters',
    'Mains',
    'Sides',
    'Pies & Roasts',
    'Desserts',
    'Drinks',
    'Tea & Coffee'
  ],
  Mediterranean: [
    'Starters',
    'Mains',
    'Grills',
    'Seafood',
    'Sides',
    'Desserts',
    'Drinks'
  ],
  'Middle Eastern': [
    'Starters (Mezze)',
    'Mains',
    'Grills',
    'Sides',
    'Desserts',
    'Drinks',
    'Breads'
  ],
  French: [
    'Starters (Entrées)',
    'Mains',
    'Desserts',
    'Cheese',
    'Drinks',
    'Sides'
  ],
  Spanish: [
    'Starters (Tapas)',
    'Mains',
    'Paella',
    'Sides',
    'Desserts',
    'Drinks'
  ],
  Other: ['Starters', 'Mains', 'Sides', 'Desserts', 'Drinks']
};

function getDefaultMenuCategoriesForCuisine(cuisineType) {
  if (!cuisineType || !CUISINE_MENU_CATEGORIES[cuisineType]) {
    return [...CUISINE_MENU_CATEGORIES.Other];
  }
  return [...CUISINE_MENU_CATEGORIES[cuisineType]];
}

const MAX_CATEGORIES = 60;
const MAX_NAME_LEN = 100;

/**
 * @param {unknown} input
 * @returns {string[]}
 */
function normalizeMenuCategoriesInput(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const t = raw.trim();
    if (!t || t.length > MAX_NAME_LEN) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_CATEGORIES) break;
  }
  return out;
}

module.exports = {
  CUISINE_MENU_CATEGORIES,
  getDefaultMenuCategoriesForCuisine,
  normalizeMenuCategoriesInput
};
