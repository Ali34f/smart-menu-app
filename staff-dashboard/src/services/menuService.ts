import api from './api';

interface MenuItem {
  name: string;
  description: string;
  category: string;
  price: number;
  image?: string;
  allergens?: string[];
  isAvailable: boolean;
  dietaryInfo?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    halal?: boolean;
    kosher?: boolean;
  };
}

export const menuService = {
  // Get all menu items
  getAllItems: async () => {
    const response = await api.get('/menu');
    return response.data;
  },

  // Get single menu item
  getItem: async (id: string) => {
    const response = await api.get(`/menu/${id}`);
    return response.data;
  },

  // Create menu item
  createItem: async (data: MenuItem) => {
    const response = await api.post('/menu', data);
    return response.data;
  },

  // Update menu item
  updateItem: async (id: string, data: Partial<MenuItem>) => {
    const response = await api.put(`/menu/${id}`, data);
    return response.data;
  },

  // Delete menu item
  deleteItem: async (id: string) => {
    const response = await api.delete(`/menu/${id}`);
    return response.data;
  },

  // Toggle availability
  toggleAvailability: async (id: string) => {
    const response = await api.patch(`/menu/${id}/toggle`);
    return response.data;
  }
};