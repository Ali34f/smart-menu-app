// Ensure JWT_SECRET is set for auth tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jwt';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || '10000';

// Quiet dotenv in test output
const originalLog = console.log;
console.log = (...args) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('dotenv')) return;
  originalLog.apply(console, args);
};
