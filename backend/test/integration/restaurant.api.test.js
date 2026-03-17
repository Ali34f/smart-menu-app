const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const Restaurant = require('../../models/Restaurant');
const app = require('../../server');

jest.mock('../../models/Restaurant');

describe('Restaurant API', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ id: 'user1' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'user1',
        isActive: true,
        restaurantId: 'rest1',
      }),
    });
  });

  afterEach(() => {
    User.findById.mockRestore?.();
  });

  describe('GET /api/restaurant', () => {
    it('returns 401 when no token', async () => {
      await request(app).get('/api/restaurant').expect(401);
    });

    it('returns 404 when restaurant not found', async () => {
      Restaurant.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await request(app)
        .get('/api/restaurant')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/restaurant not found/i);
    });

    it('returns 200 with restaurant data when authenticated', async () => {
      const mockRestaurant = {
        _id: 'rest1',
        name: 'My Restaurant',
        email: 'rest@test.com',
        phone: '123',
        cuisineType: 'Italian',
        address: {},
      };
      Restaurant.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockRestaurant),
        }),
      });

      const res = await request(app)
        .get('/api/restaurant')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: 'My Restaurant',
        email: 'rest@test.com',
        cuisineType: 'Italian',
      });
    });
  });

  describe('PUT /api/restaurant', () => {
    it('returns 401 when no token', async () => {
      await request(app)
        .put('/api/restaurant')
        .send({ name: 'New Name' })
        .expect(401);
    });

    it('returns 200 and updated restaurant when updating name and phone', async () => {
      const mockRestaurant = {
        _id: 'rest1',
        name: 'Old Name',
        email: 'rest@test.com',
        phone: '111',
        cuisineType: 'Italian',
        save: jest.fn().mockResolvedValue(undefined),
      };
      Restaurant.findById = jest.fn().mockResolvedValue(mockRestaurant);

      const res = await request(app)
        .put('/api/restaurant')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Name', phone: '999' })
        .expect(200);

      expect(mockRestaurant.name).toBe('New Name');
      expect(mockRestaurant.phone).toBe('999');
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.phone).toBe('999');
    });
  });
});
