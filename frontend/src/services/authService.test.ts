import api from './api';
import { authService } from './authService';

jest.mock('./api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('calls api.post with /auth/login and credentials', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          token: 'jwt.token',
          user: {
            email: 'u@test.com',
            name: 'User',
            role: 'owner',
            restaurantName: 'Rest',
            restaurantId: 'rest1',
            qrCode: '',
          },
        },
      });

      const result = await authService.login({
        email: 'u@test.com',
        password: 'pass',
      });

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'u@test.com',
        password: 'pass',
      });
      expect(result.token).toBe('jwt.token');
      expect(result.user.email).toBe('u@test.com');
    });

    it('stores token and user data in localStorage on success', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          token: 'stored-token',
          user: {
            email: 'owner@test.com',
            name: 'Owner',
            role: 'owner',
            restaurantName: 'My Rest',
            restaurantId: 'id123',
            qrCode: 'https://qr.url',
          },
        },
      });

      await authService.login({ email: 'owner@test.com', password: 'pass' });

      expect(localStorage.getItem('authToken')).toBe('stored-token');
      expect(localStorage.getItem('userEmail')).toBe('owner@test.com');
      expect(localStorage.getItem('userName')).toBe('Owner');
      expect(localStorage.getItem('restaurantName')).toBe('My Rest');
      expect(localStorage.getItem('restaurantId')).toBe('id123');
      expect(localStorage.getItem('userRole')).toBe('owner');
      expect(localStorage.getItem('qrCode')).toBe('https://qr.url');
    });
  });

  describe('logout', () => {
    it('removes auth token from localStorage', () => {
      const locationMock = { ...window.location, href: '', assign: jest.fn() };
      Object.defineProperty(window, 'location', { value: locationMock, configurable: true });
      localStorage.setItem('authToken', 'some-token');
      authService.logout();
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });
});
