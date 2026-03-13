const { protect, authorize, checkPermission } = require('../../middleware/auth');

describe('Auth Middleware', () => {
  describe('protect', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    it('returns 401 when no Authorization header', async () => {
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this route',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization does not start with Bearer', async () => {
      req.headers.authorization = 'Basic xyz';
      await protect(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next when valid token and user found', async () => {
      const jwt = require('jsonwebtoken');
      const User = require('../../models/Users');
      const mockUser = {
        _id: 'user123',
        isActive: true,
        restaurantId: 'rest456',
      };
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'user123' });
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      req.headers.authorization = 'Bearer valid.token.here';
      await protect(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(req.restaurantId).toBe('rest456');
      expect(next).toHaveBeenCalled();
      jwt.verify.mockRestore();
      User.findById.mockRestore();
    });

    it('returns 401 when user not found', async () => {
      const jwt = require('jsonwebtoken');
      const User = require('../../models/Users');
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'user123' });
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      req.headers.authorization = 'Bearer valid.token';
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found or inactive',
      });
      expect(next).not.toHaveBeenCalled();
      jwt.verify.mockRestore();
      User.findById.mockRestore();
    });

    it('returns 401 when user is inactive', async () => {
      const jwt = require('jsonwebtoken');
      const User = require('../../models/Users');
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'user123' });
      jest.spyOn(User, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'user123', isActive: false }),
      });

      req.headers.authorization = 'Bearer valid.token';
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found or inactive',
      });
      expect(next).not.toHaveBeenCalled();
      jwt.verify.mockRestore();
      User.findById.mockRestore();
    });
  });

  describe('authorize', () => {
    it('calls next when user role is in allowed roles', () => {
      const middleware = authorize('owner', 'manager');
      const req = { user: { role: 'owner' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user role is not allowed', () => {
      const middleware = authorize('owner', 'manager');
      const req = { user: { role: 'staff' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User role 'staff' is not authorized to access this route",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkPermission', () => {
    it('calls next when user has permission', () => {
      const middleware = checkPermission('canManageMenu');
      const req = { user: { permissions: { canManageMenu: true } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 403 when user lacks permission', () => {
      const middleware = checkPermission('canManageStaff');
      const req = { user: { permissions: { canManageStaff: false } } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You do not have permission to perform this action',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
