const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const Restaurant = require('../../models/Restaurant');
const app = require('../../server');

jest.mock('../../models/Users');
jest.mock('../../models/Restaurant', () => ({
  findById: jest.fn(),
}));
jest.mock('../../utils/notificationHelper', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('Staff API', () => {
  let token;
  /** Must be a valid ObjectId string for platform-admin workspace resolution */
  const WORKSPACE_RESTAURANT_ID = '507f1f77bcf86cd799439011';

  beforeAll(() => {
    token = jwt.sign({ id: 'owner1' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    User.countDocuments = jest.fn().mockResolvedValue(0);
    Restaurant.findById.mockImplementation(() => {
      const subDoc = { subscription: { status: 'active', plan: 'free' }, _id: WORKSPACE_RESTAURANT_ID };
      return {
        select(fields) {
          if (fields === '_id') {
            return { lean: jest.fn().mockResolvedValue({ _id: WORKSPACE_RESTAURANT_ID }) };
          }
          const inner = {
            lean: jest.fn().mockResolvedValue(subDoc)
          };
          inner.then = (resolve) => Promise.resolve(subDoc).then(resolve);
          return inner;
        }
      };
    });
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: 'owner1',
        isActive: true,
        restaurantId: 'rest1',
        name: 'Owner',
        email: 'owner@test.com',
        role: 'owner',
        permissions: { canManageStaff: true },
      }),
    });
  });

  afterEach(() => {
    User.findById.mockRestore?.();
  });

  describe('GET /api/staff', () => {
    it('returns 401 when no token', async () => {
      await request(app).get('/api/staff').expect(401);
    });

    it('returns 200 with staff list when authenticated', async () => {
      const mockStaff = [
        { _id: 's1', name: 'Staff One', email: 's1@test.com', role: 'staff', restaurantId: { name: 'Rest' } },
      ];
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockStaff),
          }),
        }),
      });
      User.countDocuments = jest.fn().mockResolvedValue(0);

      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Staff One');
    });
  });

  describe('POST /api/staff', () => {
    it('returns 400 when name, email, password or role missing', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New', email: 'new@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name, email, password, and role/i);
    });

    it('returns 403 when owner tries to assign owner role', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New',
          email: 'new@test.com',
          password: 'pass123',
          role: 'owner',
        })
        .expect(403);

      expect(res.body.message).toMatch(/cannot assign/i);
    });

    it('returns 400 when role is not a restaurant team role', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New',
          email: 'new@test.com',
          password: 'pass123',
          role: 'chef',
        })
        .expect(400);

      expect(res.body.message).toMatch(/Invalid role/i);
    });

    it('returns 400 when HR fields missing for staff role', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New',
          email: 'new@test.com',
          password: 'pass123',
          role: 'staff'
        })
        .expect(400);

      expect(res.body.message).toMatch(/age|gender|job title|hourly/i);
    });

    it('returns 201 when platform admin assigns restaurant owner', async () => {
      const adminToken = jwt.sign({ id: 'admin1' }, process.env.JWT_SECRET);
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'admin1',
          isActive: true,
          restaurantId: WORKSPACE_RESTAURANT_ID,
          managedRestaurantIds: [WORKSPACE_RESTAURANT_ID],
          name: 'Admin',
          email: 'admin@test.com',
          role: 'platform_admin',
          permissions: { canManageStaff: true },
        }),
      });
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue({
        _id: 'new-owner',
        name: 'Co Owner',
        email: 'coowner@test.com',
        role: 'owner',
        restaurantId: WORKSPACE_RESTAURANT_ID,
        invitationAccepted: true,
      });

      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Restaurant-Id', WORKSPACE_RESTAURANT_ID)
        .send({
          name: 'Co Owner',
          email: 'coowner@test.com',
          password: 'pass123',
          role: 'owner',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('owner');
    });

    it('returns 201 when staff is added successfully', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockImplementation(async (data) => {
        const doc = {
          ...data,
          _id: 'new-staff',
          invitationAccepted: false,
          async populate() {
            return doc;
          }
        };
        return doc;
      });

      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Staff',
          email: 'new@test.com',
          password: 'pass123',
          role: 'staff',
          age: 22,
          gender: 'female',
          jobTitle: 'Server',
          hourlyRate: 11.5,
          phone: '07123456789',
          emergencyContactName: 'Jane Doe',
          emergencyContactPhone: '07987654321',
          startDate: '2025-01-15',
          notesInternal: 'Training week 1'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Staff');
      expect(res.body.data.role).toBe('staff');
      expect(res.body.data.invitationAccepted).toBe(false);
      expect(res.body.data.staffProfile).toMatchObject({
        age: 22,
        gender: 'female',
        jobTitle: 'Server',
        hourlyRate: 11.5
      });
    });
  });

  describe('PUT /api/staff/:id', () => {
    it('returns 200 and deactivates staff when isActive false', async () => {
      const mockStaff = {
        _id: 'staff1',
        name: 'Staff',
        email: 'staff@test.com',
        role: 'staff',
        isActive: true,
        restaurantId: 'rest1',
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findOne = jest.fn().mockResolvedValue(mockStaff);

      const res = await request(app)
        .put('/api/staff/staff1')
        .set('Authorization', `Bearer ${token}`)
        .send({ isActive: false })
        .expect(200);

      expect(mockStaff.isActive).toBe(false);
      expect(res.body.data.isActive).toBe(false);
    });
  });
});
