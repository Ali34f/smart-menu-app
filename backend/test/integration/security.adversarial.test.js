
const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const app = require('../../server');

jest.mock('../../models/Users');
jest.mock('../../models/Restaurant', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
}));

function mockLoginUserChain(resolvedUser) {
  User.findOne = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(resolvedUser),
    }),
  });
}

function assertNoRateLimitMetaLeak(res) {
  const bodyStr = JSON.stringify(res.body || {});
  expect(bodyStr.toLowerCase()).not.toMatch(/ratelimit|retry-after|x-ratelimit/);
}

describe('Security (adversarial)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('rejects NoSQL-style operator objects for email/password (does not query with operators)', async () => {
      const findOneSpy = jest.fn();
      User.findOne = findOneSpy;

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $gt: '' }, password: { $gt: '' } })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/email and password/i);
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it('rejects regex / injection-like string payloads that are not valid emails', async () => {
      User.findOne = jest.fn();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: '.*', password: 'x' })
        .expect(400);

      expect(res.body.message).toMatch(/valid email/i);
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('rejects non-string credential fields (no query)', async () => {
      User.findOne = jest.fn();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: ['a@b.com'], password: 'secret' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('applies rate-limit middleware (policy headers present; body stays generic)', async () => {
      mockLoginUserChain(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong' })
        .expect(401);

      const headerKeys = Object.keys(res.headers || {});
      expect(headerKeys.some((k) => k.toLowerCase().includes('ratelimit'))).toBe(true);
      assertNoRateLimitMetaLeak(res);
    });
  });

  describe('POST /api/auth/register', () => {
    const Restaurant = require('../../models/Restaurant');

    const validRegisterBody = () => ({
      restaurantName: 'Test Kitchen',
      restaurantEmail: 'venue@example.com',
      restaurantPhone: '07123456789',
      cuisineType: 'Indian',
      street: '1 High St',
      city: 'London',
      postcode: 'SW1A 1AA',
      ownerName: 'Owner',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'securePass1',
    });

    it('rejects operator objects in emails before any Restaurant/User lookup', async () => {
      Restaurant.findOne.mockClear();
      User.findOne.mockClear();

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegisterBody(),
          ownerEmail: { $ne: null },
          restaurantEmail: { $gt: '' },
        })
        .expect(400);

      expect(res.body.message).toMatch(/valid text values|valid email/i);
      expect(Restaurant.findOne).not.toHaveBeenCalled();
      expect(User.findOne).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/menu/:id/toggle permission boundary', () => {
    const MenuItem = require('../../models/MenuItem');
    const managerToken = jwt.sign({ id: 'mgr1' }, process.env.JWT_SECRET);
    const validMenuId = '507f1f77bcf86cd799439011';

    beforeEach(() => {
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'mgr1',
          isActive: true,
          restaurantId: 'rest1',
          role: 'manager',
          name: 'Manager',
          email: 'mgr@test.com',
          permissions: {
            canManageMenu: false,
            canEditMenu: false,
            canManageStaff: true,
          },
        }),
      });
      jest.spyOn(MenuItem, 'findOne').mockResolvedValue(null);
    });

    afterEach(() => {
      User.findById.mockRestore();
      MenuItem.findOne.mockRestore();
    });

    it('allows managers to edit menu items even when canManageMenu is false (then hits handler)', async () => {
      const res = await request(app)
        .patch(`/api/menu/${validMenuId}/toggle`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('POST /api/upload', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/upload')
        .attach('image', Buffer.from('not-really-an-image'), 'x.txt');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Security headers (helmet)', () => {
    it('sets baseline security headers on API responses', async () => {
      const res = await request(app).get('/api/health').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
