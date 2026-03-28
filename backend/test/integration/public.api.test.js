const request = require('supertest');
const Restaurant = require('../../models/Restaurant');
const MenuItem = require('../../models/MenuItem');
const PublicOrder = require('../../models/PublicOrder');
const app = require('../../server');

jest.mock('../../models/Restaurant');
jest.mock('../../models/MenuItem');
jest.mock('../../models/PublicOrder');

describe('Public API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Restaurant.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
  });

  describe('GET /api/public/menu/:restaurantId', () => {
    it('returns 404 when restaurant not found', async () => {
      Restaurant.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/api/public/menu/507f1f77bcf86cd799439011')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/restaurant not found/i);
    });

    it('returns 200 with restaurant and menu items when restaurant exists', async () => {
      const mockRestaurant = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Restaurant',
        cuisineType: 'Italian',
        address: {},
        dailyScans: {},
        save: jest.fn().mockResolvedValue(undefined),
      };
      Restaurant.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockRestaurant),
      });
      MenuItem.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: 'item1', name: 'Pizza', category: 'Mains', isAvailable: true },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .get('/api/public/menu/507f1f77bcf86cd799439011')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.restaurant).toBeDefined();
      expect(res.body.count).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Pizza');
    });
  });

  describe('POST /api/public/menu/:restaurantId/filter', () => {
    it('returns 400 when allergenIds is missing or not an array', async () => {
      const res = await request(app)
        .post('/api/public/menu/507f1f77bcf86cd799439011/filter')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/allergen ids as array/i);
    });

    it('returns 200 with filtered menu when allergenIds provided', async () => {
      MenuItem.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: 'item1', name: 'Salad', category: 'Starters', allergens: [] },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .post('/api/public/menu/507f1f77bcf86cd799439011/filter')
        .send({ allergenIds: ['507f1f77bcf86cd799439099'] })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe('Salad');
    });
  });

  describe('GET /api/public/order/:orderId', () => {
    it('returns 400 when order id is invalid', async () => {
      const res = await request(app).get('/api/public/order/not-a-valid-id').expect(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 when order does not exist', async () => {
      PublicOrder.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null)
      });
      const res = await request(app)
        .get('/api/public/order/507f1f77bcf86cd799439011')
        .expect(404);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with order payload for guests', async () => {
      PublicOrder.findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          restaurantId: '507f1f77bcf86cd799439099',
          status: 'preparing',
          tableNumber: 4,
          paymentMethod: 'cash',
          paymentStatus: 'pending_cash',
          paymentReference: null,
          totalAmount: 18.5,
          items: [
            { name: 'Soup', quantity: 1, unitPrice: 18.5, lineTotal: 18.5 }
          ],
          createdAt: new Date('2026-01-01T12:00:00Z'),
          updatedAt: new Date('2026-01-01T12:05:00Z')
        })
      });
      const res = await request(app)
        .get('/api/public/order/507f1f77bcf86cd799439011')
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('preparing');
      expect(res.body.data.tableNumber).toBe(4);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].name).toBe('Soup');
    });
  });
});
