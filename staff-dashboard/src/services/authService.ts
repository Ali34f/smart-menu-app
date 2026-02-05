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
      localStorage.setItem('qrCode', response.data.user.qrCode || '');

      // Save invitation status - check if explicitly false (boolean)
      // Debug logging to trace the issue
      console.log('[AUTH] Backend response invitationAccepted:', response.data.user.invitationAccepted);
      console.log('[AUTH] Type:', typeof response.data.user.invitationAccepted);
      console.log('[AUTH] User role:', response.data.user.role);

      // Store as 'false' string only if backend returns boolean false
      const invitationAccepted = response.data.user.invitationAccepted === false ? 'false' : 'true';
      console.log('[AUTH] Storing invitationAccepted as:', invitationAccepted);
      localStorage.setItem('invitationAccepted', invitationAccepted);

      if (response.data.user.profilePicture) {
        localStorage.setItem('profilePicture', response.data.user.profilePicture);
      }
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
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('invitationAccepted');
    window.location.href = '/login';
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  // Get user role
  getUserRole: () => {
    return localStorage.getItem('userRole');
  },

  // Update user profile
  updateProfile: async (data: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const response = await api.put('/auth/profile', data);

    // Update localStorage if name changed
    if (data.name && response.data.success) {
      localStorage.setItem('userName', data.name);
    }

    return response.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // Update localStorage with new profile picture URL
    if (response.data.success && response.data.data?.url) {
      localStorage.setItem('profilePicture', response.data.data.url);
    }

    return response.data;
  },

  // Get profile picture from localStorage
  getProfilePicture: () => {
    return localStorage.getItem('profilePicture');
  }
};