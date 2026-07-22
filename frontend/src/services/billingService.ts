import api from './api';

export const billingService = {
  getConfig: () => api.get<{ success: boolean; data: { stripeConfigured: boolean; prices: { basic: boolean; premium: boolean } } }>(
    '/billing/config'
  ),

  createCheckoutSession: (plan: 'basic' | 'premium') =>
    api.post<{ success: boolean; data: { url: string }; message?: string }>('/billing/checkout-session', { plan }),

  createPortalSession: () =>
    api.post<{ success: boolean; data: { url: string }; message?: string }>('/billing/portal-session', {})
};
