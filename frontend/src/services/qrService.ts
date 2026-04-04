import api from './api';

export type QrAnalyticsRange = '7d' | '30d' | 'custom';

export const qrService = {
  generateQR: async (
    publicBaseUrl?: string,
    publicApiBaseUrl?: string,
    options?: { width?: number; color?: string }
  ) => {
    const response = await api.get('/qr/generate', {
      params: {
        ...(publicBaseUrl ? { publicBaseUrl } : {}),
        ...(publicApiBaseUrl ? { publicApiBaseUrl } : {}),
        ...(options?.width ? { width: options.width } : {}),
        ...(options?.color ? { color: options.color } : {})
      }
    });
    return response.data;
  },

  /** Server-side PNG or SVG (PDF is built client-side). */
  downloadQR: async (
    publicBaseUrl?: string,
    publicApiBaseUrl?: string,
    options?: { width?: number; color?: string; format?: 'png' | 'svg' }
  ) => {
    const fmt = options?.format === 'svg' ? 'svg' : 'png';
    const response = await api.get('/qr/download', {
      params: {
        ...(publicBaseUrl ? { publicBaseUrl } : {}),
        ...(publicApiBaseUrl ? { publicApiBaseUrl } : {}),
        ...(options?.width ? { width: options.width } : {}),
        ...(options?.color ? { color: options.color } : {}),
        format: fmt
      },
      responseType: 'blob'
    });

    const ext = fmt === 'svg' ? 'svg' : 'png';
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `restaurant-qr-code.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getScanAnalytics: async (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/qr/analytics', {
      params: params || {}
    });
    return response.data;
  },

  getRestaurantReports: async (params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await api.get('/qr/reports', {
      params: params || {}
    });
    return response.data;
  },

  getAllergenFilterAnalytics: async () => {
    const response = await api.get('/qr/allergen-analytics');
    return response.data;
  }
};
