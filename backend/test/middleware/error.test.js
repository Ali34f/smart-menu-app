const errorHandler = require('../../middleware/error');

describe('Error Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('returns 404 for Mongoose CastError', () => {
    const err = new Error('Cast to ObjectId failed');
    err.name = 'CastError';
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Resource not found',
    });
  });

  it('returns 400 for Mongoose duplicate key (code 11000)', () => {
    const err = new Error('E11000 duplicate key');
    err.code = 11000;
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Duplicate field value entered',
    });
  });

  it('returns 400 for Mongoose ValidationError', () => {
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = {
      name: { message: 'Name is required' },
      price: { message: 'Price must be positive' },
    };
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Name is required Price must be positive',
    });
  });

  it('returns 401 for JsonWebTokenError', () => {
    const err = new Error('jwt malformed');
    err.name = 'JsonWebTokenError';
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token',
    });
  });

  it('returns 401 for TokenExpiredError', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token expired',
    });
  });

  it('returns 500 and error message for unknown errors', () => {
    const err = new Error('Something broke');
    err.stack = 'STACK_SHOULD_NOT_LEAK';
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual({
      success: false,
      message: 'Something broke',
    });
    expect(payload.stack).toBeUndefined();
  });
});
