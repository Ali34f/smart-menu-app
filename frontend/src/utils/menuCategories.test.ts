import {
  CUISINE_MENU_CATEGORIES,
  getCategoriesForCuisine,
} from './menuCategories';

describe('menuCategories', () => {
  describe('getCategoriesForCuisine', () => {
    it('returns Italian categories for Italian cuisine', () => {
      const categories = getCategoriesForCuisine('Italian');
      expect(categories).toEqual(CUISINE_MENU_CATEGORIES.Italian);
      expect(categories).toContain('Pizza');
      expect(categories).toContain('Pasta');
    });

    it('returns Indian categories for Indian cuisine', () => {
      const categories = getCategoriesForCuisine('Indian');
      expect(categories).toEqual(CUISINE_MENU_CATEGORIES.Indian);
      expect(categories).toContain('Biryani Dishes');
    });

    it('returns Other categories for unknown cuisine', () => {
      const categories = getCategoriesForCuisine('Unknown');
      expect(categories).toEqual(CUISINE_MENU_CATEGORIES.Other);
      expect(categories).toContain('Starters');
      expect(categories).toContain('Mains');
    });

    it('returns Other categories for empty string', () => {
      const categories = getCategoriesForCuisine('');
      expect(categories).toEqual(CUISINE_MENU_CATEGORIES.Other);
    });

    it('returns Other categories when cuisineType is undefined', () => {
      const categories = getCategoriesForCuisine(undefined);
      expect(categories).toEqual(CUISINE_MENU_CATEGORIES.Other);
    });

    it('returns Middle Eastern categories for "Middle Eastern"', () => {
      const categories = getCategoriesForCuisine('Middle Eastern');
      expect(categories).toContain('Starters (Mezze)');
      expect(categories).toContain('Breads');
    });
  });
});
