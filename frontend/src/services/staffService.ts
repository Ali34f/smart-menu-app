import api from './api';

export type RestaurantTeamRole = 'owner' | 'manager' | 'staff';

export interface StaffInvitePayload {
  name: string;
  email: string;
  password: string;
  role: RestaurantTeamRole;
}

export interface StaffUpdatePayload {
  name?: string;
  email?: string;
  role?: RestaurantTeamRole;
  isActive?: boolean;
}

export const staffService = {
  getAllStaff: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  addStaff: async (data: StaffInvitePayload) => {
    const response = await api.post('/staff', data);
    return response.data;
  },

  updateStaff: async (id: string, data: StaffUpdatePayload) => {
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