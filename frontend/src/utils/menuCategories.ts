/**
 * Menu categories per cuisine type. Used when the restaurant has not set custom menuCategories.
 * Keep in sync with backend/utils/menuCategories.js
 */
export const CUISINE_MENU_CATEGORIES: Record<string, string[]> = {
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

const DEFAULT_CATEGORIES = CUISINE_MENU_CATEGORIES.Other;

export function getCategoriesForCuisine(cuisineType: string | undefined): string[] {
  if (!cuisineType || !(cuisineType in CUISINE_MENU_CATEGORIES)) {
    return [...DEFAULT_CATEGORIES];
  }
  return [...(CUISINE_MENU_CATEGORIES[cuisineType] ?? DEFAULT_CATEGORIES)];
}

/**
 * Restaurant-defined order (if any), otherwise cuisine defaults.
 */
export function getEffectiveMenuCategories(
  cuisineType: string | undefined,
  customMenuCategories?: string[] | null
): string[] {
  if (customMenuCategories && customMenuCategories.length > 0) {
    return [...customMenuCategories];
  }
  return getCategoriesForCuisine(cuisineType);
}

/**
 * Order category keys (e.g. from menu items) by the preferred list; unknown categories sort last (A–Z).
 */
export function sortCategoriesByOrder(categoryKeys: string[], preferredOrder: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const pref of preferredOrder) {
    const prefLower = pref.toLowerCase();
    const match = categoryKeys.find((k) => k.toLowerCase() === prefLower);
    if (match && !seen.has(match)) {
      seen.add(match);
      result.push(match);
    }
  }

  const rest = categoryKeys
    .filter((k) => !seen.has(k))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return [...result, ...rest];
}

/**
 * Dropdown list: preferred order first, then any extra labels from existing items (e.g. legacy names).
 */
export function mergeCategoriesForDropdown(
  cuisineType: string | undefined,
  customMenuCategories: string[] | null | undefined,
  extraFromItems: string[]
): string[] {
  const base = getEffectiveMenuCategories(cuisineType, customMenuCategories);
  const merged = new Set(base.map((c) => c.toLowerCase()));
  const extras: string[] = [];
  for (const x of extraFromItems) {
    const t = (x || '').trim();
    if (!t) continue;
    const low = t.toLowerCase();
    if (!merged.has(low)) {
      merged.add(low);
      extras.push(t);
    }
  }
  extras.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return [...base, ...extras];
}
