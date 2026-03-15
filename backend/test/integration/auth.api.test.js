const request = require('supertest');
const User = require('../../models/Users');
const app = require('../../server');

jest.mock('../../models/Users');
jest.mock('../../models/Restaurant', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email and password are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email and password/i);
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('returns 400 when only email is provided', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email and password/i);
    });

    it('returns 401 when user not found', async () => {
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'pass123' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('returns 401 when user is inactive (deactivated)', async () => {
      const inactiveUser = {
        _id: 'user-id',
        name: 'Staff',
        email: 'staff@test.com',
        role: 'staff',
        isActive: false,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      inactiveUser.restaurantId = { _id: 'rest-id', name: 'Rest', qrCode: '' };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(inactiveUser),
        }),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'staff@test.com', password: 'correct' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/deactivated|contact your restaurant manager/i);
    });

    it('returns 200 and token when credentials are valid', async () => {
      const mockUser = {
        _id: 'user-id',
        name: 'Owner',
        email: 'owner@test.com',
        role: 'owner',
        isActive: true,
        permissions: {},
        invitationAccepted: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        getSignedJwtToken: jest.fn().mockReturnValue('jwt.token.here'),
        save: jest.fn().mockResolvedValue(undefined),
        lastLogin: Date.now(),
      };
      mockUser.restaurantId = { _id: 'rest-id', name: 'Test Restaurant', qrCode: 'https://example.com/qr' };

      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'owner@test.com', password: 'correct' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('jwt.token.here');
      expect(res.body.user).toMatchObject({
        email: 'owner@test.com',
        name: 'Owner',
        role: 'owner',
        restaurantId: 'rest-id',
        restaurantName: 'Test Restaurant',
      });
    });
  });

  describe('POST /api/auth/register', () => {
    const Restaurant = require('../../models/Restaurant');

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when restaurant email already exists', async () => {
      Restaurant.findOne = jest.fn().mockResolvedValue({ _id: 'existing' });
      User.findOne = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          restaurantName: 'Test',
          restaurantEmail: 'existing@rest.com',
          restaurantPhone: '123',
          cuisineType: 'Italian',
          street: 'S',
          city: 'C',
          postcode: 'P',
          ownerName: 'Owner',
          ownerEmail: 'owner@test.com',
          ownerPassword: 'pass123',
        })
        .expect(400);

      expect(res.body.message).toMatch(/restaurant with this email already exists/i);
    });

    it('returns 400 when owner email already exists', async () => {
      Restaurant.findOne = jest.fn().mockResolvedValue(null);
      User.findOne = jest.fn().mockResolvedValue({ _id: 'existing-user' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          restaurantName: 'New Restaurant',
          restaurantEmail: 'new@rest.com',
          restaurantPhone: '123',
          cuisineType: 'Italian',
          street: 'S',
          city: 'C',
          postcode: 'P',
          ownerName: 'Owner',
          ownerEmail: 'existing@user.com',
          ownerPassword: 'pass123',
        })
        .expect(400);

      expect(res.body.message).toMatch(/user with this email already exists/i);
    });
  });
});
