const request = require('supertest');
const app = require('../../server');

describe('Billing webhook route', () => {
  it('returns 503 when Stripe is not configured', async () => {
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(503);
  });
});
