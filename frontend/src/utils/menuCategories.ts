/**
 * Menu categories per cuisine type. Used when adding/editing menu items
 * so the category dropdown matches the restaurant's cuisine.
 */
export const CUISINE_MENU_CATEGORIES: Record<string, string[]> = {
  Indian: [
    'Starters',
    'Mains',
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
  Other: [
    'Starters',
    'Mains',
    'Sides',
    'Desserts',
    'Drinks'
  ]
};

const DEFAULT_CATEGORIES = CUISINE_MENU_CATEGORIES.Other;

/**
 * Returns the list of menu categories for the given cuisine type.
 * Falls back to "Other" categories if cuisine is unknown.
 */
export function getCategoriesForCuisine(cuisineType: string | undefined): string[] {
  if (!cuisineType || !(cuisineType in CUISINE_MENU_CATEGORIES)) {
    return DEFAULT_CATEGORIES;
  }
  return CUISINE_MENU_CATEGORIES[cuisineType] ?? DEFAULT_CATEGORIES;
}
