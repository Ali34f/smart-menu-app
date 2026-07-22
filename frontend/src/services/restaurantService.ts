import api from './api';

export const CUISINE_OPTIONS = [
  'Indian',
  'Italian',
  'Chinese',
  'Japanese',
  'Thai',
  'Mexican',
  'American',
  'British',
  'Mediterranean',
  'Middle Eastern',
  'French',
  'Spanish',
  'Other'
] as const;

export interface SubscriptionLimits {
  maxMenuItems: number | null;
  maxStaffSeats: number | null;
  maxReportRange: '7d' | '30d' | 'custom';
  customReports: boolean;
  ingredientsFull: boolean;
  qrPremium: boolean;
}

export interface SubscriptionSummary {
  plan: string;
  status: string;
  effectivePlan: string;
  canPerformWrites: boolean;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  hasStripeCustomer: boolean;
  limits: SubscriptionLimits;
}

export interface RestaurantProfile {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  cuisineType: string;
  address?: {
    street: string;
    city: string;
    postcode: string;
    country: string;
  };
  welcomeMessage?: string;
  businessHours?: Record<string, { enabled: boolean; open: string; close: string }>;
  /** Custom section order; when empty, cuisine defaults are used */
  menuCategories?: string[];
  subscription?: SubscriptionSummary;
}

export const restaurantService = {
  getRestaurant: async (): Promise<RestaurantProfile> => {
    const response = await api.get('/restaurant');
    return response.data?.data || {};
  },

  updateRestaurant: async (data: Partial<RestaurantProfile>): Promise<{ data: RestaurantProfile }> => {
    const response = await api.put('/restaurant', data);
    return response.data;
  },

  deleteAllData: async () => {
    const response = await api.post('/restaurant/danger/delete-data');
    return response.data;
  },

  deactivateAccount: async () => {
    const response = await api.post('/restaurant/danger/deactivate');
    return response.data;
  }
};
