import api from './api';

export const allergenService = {
  getAll: async () => {
    const response = await api.get('public/allergens');
    return response.data;
  }
};
