const request = require('supertest');
const app = require('../../server');

describe('Health API', () => {
  it('GET /api/health returns 200 and success message', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toMatchObject({
      success: true,
      message: 'Smart Menu API is running',
    });
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET unknown route returns 404', async () => {
    const res = await request(app)
      .get('/api/nonexistent-route')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/route not found/i);
  });
});
