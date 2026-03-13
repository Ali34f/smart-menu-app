const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/Users');

jest.mock('bcryptjs');
jest.spyOn(jwt, 'sign').mockReturnValue('mock.jwt.token');

describe('Users model', () => {
  describe('comparePassword', () => {
    it('returns true when password matches', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const user = new User();
      user.password = 'hashedPassword';

      const result = await user.comparePassword('plainPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('plainPassword', 'hashedPassword');
      expect(result).toBe(true);
    });

    it('returns false when password does not match', async () => {
      bcrypt.compare.mockResolvedValue(false);
      const user = new User();
      user.password = 'hashedPassword';

      const result = await user.comparePassword('wrongPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
      expect(result).toBe(false);
    });
  });

  describe('getSignedJwtToken', () => {
    it('signs token with id, restaurantId, and role', () => {
      const id = new mongoose.Types.ObjectId();
      const restaurantId = new mongoose.Types.ObjectId();
      const user = new User();
      user._id = id;
      user.restaurantId = restaurantId;
      user.role = 'owner';

      const token = user.getSignedJwtToken();

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id,
          restaurantId,
          role: 'owner',
        }),
        process.env.JWT_SECRET,
        expect.any(Object)
      );
      expect(token).toBe('mock.jwt.token');
    });
  });
});
