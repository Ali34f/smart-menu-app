import api from './api';

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

  downloadQR: async (publicBaseUrl?: string, publicApiBaseUrl?: string) => {
    const response = await api.get('/qr/download', {
      params: {
        ...(publicBaseUrl ? { publicBaseUrl } : {}),
        ...(publicApiBaseUrl ? { publicApiBaseUrl } : {})
      },
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'restaurant-qr-code.png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  getScanAnalytics: async () => {
    const response = await api.get('/qr/analytics');
    return response.data;
  }
};