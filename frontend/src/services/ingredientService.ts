import api from './api';

interface Ingredient {
  _id?: string;
  name: string;
  category: string;
  allergens?: string[] | { _id: string; name: string; icon?: string }[];
  notes?: string;
  isActive?: boolean;
}

export const ingredientService = {
  getAll: async () => {
    const response = await api.get('/ingredients');
    return response.data;
  },

  getOne: async (id: string) => {
    const response = await api.get(`/ingredients/${id}`);
    return response.data;
  },

  create: async (data: Partial<Ingredient>) => {
    const response = await api.post('/ingredients', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Ingredient>) => {
    const response = await api.put(`/ingredients/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/ingredients/${id}`);
    return response.data;
  }
};
