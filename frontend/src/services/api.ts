import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeRestaurantId = localStorage.getItem('activeRestaurantId');
    if (activeRestaurantId) {
      config.headers['x-restaurant-id'] = activeRestaurantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** These routes return 401 for wrong password/code — not "session expired". Do not redirect. */
const isPublicAuthFailureUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return [
    '/auth/login',
    '/auth/register',
    '/auth/verify-2fa-login',
    '/auth/reactivate',
    '/auth/forgot-password',
    '/auth/reset-password'
  ].some((p) => url.includes(p));
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && isPublicAuthFailureUrl(error.config?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('restaurantName');
      localStorage.removeItem('restaurantId');
      localStorage.removeItem('activeRestaurantId');
      localStorage.removeItem('managedRestaurants');
      localStorage.removeItem('userRole');
      localStorage.removeItem('qrCode');
      localStorage.removeItem('qrCodeUrl');
      localStorage.removeItem('smartMenuQrImage');
      localStorage.removeItem('invitationAccepted');
      localStorage.removeItem('userPermissions');
      localStorage.removeItem('twoFactorEnabled');
      localStorage.removeItem('profilePicture');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;