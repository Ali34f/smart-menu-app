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
  clearSession: () => {
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
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('invitationAccepted');
    localStorage.removeItem('userPermissions');
  },

  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);

    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userEmail', response.data.user.email);
      localStorage.setItem('userName', response.data.user.name || '');
      localStorage.setItem('restaurantName', response.data.user.restaurantName);
      localStorage.setItem('restaurantId', response.data.user.restaurantId || '');
      localStorage.setItem('activeRestaurantId', response.data.user.restaurantId || '');
      localStorage.setItem('userRole', response.data.user.role);
      localStorage.setItem('invitationAccepted', 'true');
      if (response.data.user.permissions) {
        localStorage.setItem('userPermissions', JSON.stringify(response.data.user.permissions));
      }
    }

    return response.data;
  },

  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);

    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userEmail', response.data.user.email);
      localStorage.setItem('userName', response.data.user.name || '');
      localStorage.setItem('restaurantName', response.data.user.restaurantName);
      localStorage.setItem('restaurantId', response.data.user.restaurantId || '');
      localStorage.setItem('activeRestaurantId', response.data.user.restaurantId || '');
      localStorage.setItem('userRole', response.data.user.role);
      localStorage.setItem('qrCode', response.data.user.qrCode || '');
      localStorage.setItem('managedRestaurants', JSON.stringify(response.data.user.managedRestaurants || []));

      const invitationAccepted =
        response.data.user.invitationAccepted === false ? 'false' : 'true';
      localStorage.setItem('invitationAccepted', invitationAccepted);

      if (response.data.user.profilePicture) {
        localStorage.setItem('profilePicture', response.data.user.profilePicture);
      }
      if (response.data.user.permissions) {
        localStorage.setItem('userPermissions', JSON.stringify(response.data.user.permissions));
      }
    }

    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: () => {
    authService.clearSession();
    window.location.href = '/login';
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  getUserRole: () => {
    return localStorage.getItem('userRole');
  },

  updateProfile: async (data: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const response = await api.put('/auth/profile', data);

    if (data.name && response.data.success) {
      localStorage.setItem('userName', data.name);
    }

    return response.data;
  },

  uploadProfilePicture: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.data.success && response.data.data?.url) {
      localStorage.setItem('profilePicture', response.data.data.url);
    }

    return response.data;
  },

  getProfilePicture: () => {
    return localStorage.getItem('profilePicture');
  },

  getMyRestaurants: async () => {
    const response = await api.get('/auth/my-restaurants');
    return response.data;
  },

  switchRestaurant: async (restaurantId: string) => {
    const response = await api.post('/auth/switch-restaurant', { restaurantId });
    const data = response.data?.data;
    if (data?.id) {
      localStorage.setItem('activeRestaurantId', data.id);
      localStorage.setItem('restaurantId', data.id);
    }
    if (data?.name) {
      localStorage.setItem('restaurantName', data.name);
    }
    if (data?.qrCode) {
      localStorage.setItem('qrCode', data.qrCode);
    }
    return response.data;
  }
};