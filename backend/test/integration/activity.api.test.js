const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const Activity = require('../../models/Activity');
const app = require('../../server');

jest.mock('../../models/Activity');

describe('Activity API', () => {
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
        name: 'Owner',
        email: 'owner@test.com',
      }),
    });
  });

  afterEach(() => {
    User.findById.mockRestore?.();
  });

  describe('GET /api/activity', () => {
    it('returns 401 when no token', async () => {
      await request(app).get('/api/activity').expect(401);
    });

    it('returns 200 with activities sorted by createdAt desc', async () => {
      const mockActivities = [
        {
          _id: 'a1',
          action: 'menu_item_created',
          itemName: 'Pizza',
          userName: 'Owner',
          createdAt: new Date(),
        },
        {
          _id: 'a2',
          action: 'menu_item_updated',
          itemName: 'Pasta',
          userName: 'Owner',
          createdAt: new Date(Date.now() - 3600000),
        },
      ];
      Activity.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockActivities),
        }),
      });

      const res = await request(app)
        .get('/api/activity')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('action');
      expect(res.body.data[0]).toHaveProperty('text');
      expect(res.body.data[0]).toHaveProperty('user');
    });
  });

  describe('POST /api/activity', () => {
    it('returns 201 when activity is logged', async () => {
      const createdActivity = {
        _id: 'a1',
        action: 'menu_item_created',
        itemName: 'Burger',
        userName: 'Owner',
      };
      Activity.create = jest.fn().mockResolvedValue(createdActivity);

      const res = await request(app)
        .post('/api/activity')
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'menu_item_created', itemName: 'Burger' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.itemName).toBe('Burger');
    });
  });
});
