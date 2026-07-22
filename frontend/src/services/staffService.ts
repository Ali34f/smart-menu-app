import api from './api';

export type RestaurantTeamRole = 'owner' | 'manager' | 'staff';

export type StaffContractType =
  | 'full_time'
  | 'part_time'
  | 'zero_hours'
  | 'fixed_term'
  | 'casual'
  | 'apprenticeship';

export type StaffPaymentFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'four_weekly';

export interface StaffProfile {
  age?: number | null;
  gender?: string | null;
  jobTitle?: string | null;
  hourlyRate?: number | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  startDate?: string | null;
  notesInternal?: string | null;
  contractType?: StaffContractType | string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  townCity?: string | null;
  county?: string | null;
  postcode?: string | null;
  niNumber?: string | null;
  taxCode?: string | null;
  paymentFrequency?: StaffPaymentFrequency | string | null;
  hoursPerWeek?: number | null;
  bankAccountHolderName?: string | null;
  bankSortCode?: string | null;
  bankAccountNumber?: string | null;
}

export interface StaffMemberRecord {
  _id: string;
  name: string;
  email: string;
  role: RestaurantTeamRole;
  isActive: boolean;
  lastLogin?: string;
  profilePicture?: string;
  createdAt?: string;
  invitationAccepted?: boolean;
  staffProfile?: StaffProfile | null;
  restaurantId?:
    | {
        _id: string;
        name: string;
      }
    | string;
}

export interface StaffInvitePayload {
  name: string;
  email: string;
  password: string;
  role: RestaurantTeamRole;
  age?: number;
  gender?: string;
  jobTitle?: string;
  hourlyRate?: number;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  startDate?: string;
  notesInternal?: string;
  contractType?: string;
  addressLine1?: string;
  addressLine2?: string;
  townCity?: string;
  county?: string;
  postcode?: string;
  niNumber?: string;
  taxCode?: string;
  paymentFrequency?: string;
  hoursPerWeek?: number;
  bankAccountHolderName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
}

export interface StaffUpdatePayload {
  name?: string;
  email?: string;
  role?: RestaurantTeamRole;
  isActive?: boolean;
  staffProfile?: Partial<StaffProfile>;
}

export const staffService = {
  getAllStaff: async () => {
    const response = await api.get('/staff');
    return response.data;
  },

  getStaffMember: async (id: string): Promise<{ success: boolean; data: StaffMemberRecord }> => {
    const response = await api.get(`/staff/${id}`);
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
