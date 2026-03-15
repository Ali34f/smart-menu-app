const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const MenuItem = require('../../models/MenuItem');
const app = require('../../server');

jest.mock('../../models/MenuItem');

describe('Menu API', () => {
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

  describe('GET /api/menu', () => {
    it('returns 401 when no token', async () => {
      await request(app)
        .get('/api/menu')
        .expect(401);
    });

    it('returns 200 with menu items when authenticated', async () => {
      MenuItem.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([
              { _id: 'm1', name: 'Pizza', category: 'Mains', price: 10 },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/menu')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Pizza');
    });
  });

  describe('GET /api/menu/:id', () => {
    it('returns 404 when menu item not found', async () => {
      MenuItem.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await request(app)
        .get('/api/menu/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/menu item not found/i);
    });
  });
});
