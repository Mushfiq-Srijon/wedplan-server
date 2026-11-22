import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './app.js';

describe('WedPlan API integration and security', () => {
  it('reports API health without requiring a database connection', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, service: 'wedplan-server' });
  });

  it('returns a structured 404 for an unknown route', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Route not found');
  });

  it.each([
    ['/api/dashboard/overview', 'get'],
    ['/api/payments/transactions', 'get'],
    ['/api/bookings', 'post'],
    ['/api/admin/users', 'get'],
  ])('rejects unauthenticated %s requests with 401', async (path, method) => {
    const response =
      method === 'post' ? await request(app).post(path).send({}) : await request(app).get(path);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/authentication|required/i);
  });

  it('rejects an invalid JWT instead of trusting the client cookie', async () => {
    const response = await request(app)
      .get('/api/dashboard/overview')
      .set('Cookie', 'wedplan_token=not-a-real-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/authentication|required/i);
  });

  it('sends baseline security headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
