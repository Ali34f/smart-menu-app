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
  getAllItems: async () => {
    const response = await api.get('/menu');
    return response.data;
  },

  getItem: async (id: string) => {
    const response = await api.get(`/menu/${id}`);
    return response.data;
  },

  createItem: async (data: MenuItem) => {
    const response = await api.post('/menu', data);
    return response.data;
  },

  updateItem: async (id: string, data: Partial<MenuItem>) => {
    const response = await api.put(`/menu/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string) => {
    const response = await api.delete(`/menu/${id}`);
    return response.data;
  },

  toggleAvailability: async (id: string) => {
    const response = await api.patch(`/menu/${id}/toggle`);
    return response.data;
  },

  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};