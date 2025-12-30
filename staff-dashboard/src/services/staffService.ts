import api from './api';

interface StaffMember {
  name: string;
  email: string;
  password: string;
  role: 'manager' | 'staff';
}

export const staffService = {
  // Get all staff
  getAllStaff: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  // Add new staff
  addStaff: async (data: StaffMember) => {
    const response = await api.post('/staff', data);
    return response.data;
  },

  // Update staff
  updateStaff: async (id: string, data: Partial<StaffMember>) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },

  // Delete staff
  deleteStaff: async (id: string) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  }
};