import api from './api';

interface StaffMember {
  name: string;
  email: string;
  password: string;
  role: 'manager' | 'staff';
}

export const staffService = {
  getAllStaff: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  addStaff: async (data: StaffMember) => {
    const response = await api.post('/staff', data);
    return response.data;
  },

  updateStaff: async (id: string, data: Partial<StaffMember>) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },

  deleteStaff: async (id: string) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },

  acceptInvitation: async (newPassword: string) => {
    const response = await api.post('/staff/accept-invitation', { newPassword });
    return response.data;
  }
};