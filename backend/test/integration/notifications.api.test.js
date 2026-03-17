const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const Notification = require('../../models/Notification');
const app = require('../../server');

jest.mock('../../models/Notification');

describe('Notifications API', () => {
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

  describe('GET /api/notifications', () => {
    it('returns 401 when no token', async () => {
      await request(app).get('/api/notifications').expect(401);
    });

    it('returns 200 with notifications list when authenticated', async () => {
      const mockNotifications = [
        { _id: 'n1', type: 'menu_item_created', title: 'New item', isRead: false },
      ];
      Notification.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockNotifications),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('New item');
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('returns 200 with unread count', async () => {
      Notification.countDocuments = jest.fn().mockResolvedValue(3);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(3);
    });
  });
});
