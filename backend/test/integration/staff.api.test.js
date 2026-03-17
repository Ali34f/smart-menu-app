const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');
const app = require('../../server');

jest.mock('../../models/Users');
jest.mock('../../utils/notificationHelper', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

describe('Staff API', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign({ id: 'owner1' }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

    it('returns 400 when role is invalid', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New',
          email: 'new@test.com',
          password: 'pass123',
          role: 'owner',
        })
        .expect(400);

      expect(res.body.message).toMatch(/invalid role|manager or staff/i);
    });

    it('returns 201 when staff is added successfully', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue({
        _id: 'new-staff',
        name: 'New Staff',
        email: 'new@test.com',
        role: 'staff',
        restaurantId: 'rest1',
        invitationAccepted: false,
      });

      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Staff',
          email: 'new@test.com',
          password: 'pass123',
          role: 'staff',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Staff');
      expect(res.body.data.role).toBe('staff');
      expect(res.body.data.invitationAccepted).toBe(false);
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
