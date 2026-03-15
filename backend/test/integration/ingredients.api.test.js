const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const Ingredient = require('../../models/Ingredient');
const MenuItem = require('../../models/MenuItem');
const app = require('../../server');

jest.mock('../../models/Ingredient');
jest.mock('../../models/MenuItem');

describe('Ingredients API', () => {
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

  describe('GET /api/ingredients', () => {
    it('returns 401 when no token', async () => {
      await request(app)
        .get('/api/ingredients')
        .expect(401);
    });

    it('returns 200 with ingredients when authenticated', async () => {
      const mockIngredients = [
        { _id: 'ing1', name: 'Tomato', toObject: function () { return { ...this, dishCount: 0 }; } },
      ];
      Ingredient.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockIngredients),
        }),
      });
      MenuItem.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .get('/api/ingredients')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Tomato');
    });
  });

  describe('GET /api/ingredients/:id', () => {
    it('returns 404 when ingredient not found', async () => {
      Ingredient.findOne = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .get('/api/ingredients/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ingredient not found/i);
    });
  });
});
