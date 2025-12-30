import api from './api';

interface RegisterData {
  restaurantName: string;
  restaurantEmail: string;
  restaurantPhone: string;
  cuisineType: string;
  street: string;
  city: string;
  postcode: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  // Register restaurant + owner
  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    
    // Save token and user info
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userEmail', response.data.user.email);
      localStorage.setItem('restaurantName', response.data.user.restaurantName);
      localStorage.setItem('userRole', response.data.user.role);
    }
    
    return response.data;
  },

  // Login user
  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);
    
    // Save token and user info
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userEmail', response.data.user.email);
      localStorage.setItem('restaurantName', response.data.user.restaurantName);
      localStorage.setItem('userRole', response.data.user.role);
      localStorage.setItem('qrCode', response.data.user.qrCode);
    }
    
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('restaurantName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('qrCode');
    window.location.href = '/login';
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // Get user role
  getUserRole: () => {
    return localStorage.getItem('userRole');
  }
};