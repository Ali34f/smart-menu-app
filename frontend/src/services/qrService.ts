import api from './api';

export const qrService = {
  generateQR: async () => {
    const response = await api.get('/qr/generate');
    return response.data;
  },

  downloadQR: async () => {
    const response = await api.get('/qr/download', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'restaurant-qr-code.png');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};