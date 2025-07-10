import request from 'supertest';
import app from '../../../src/app';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../../src/config';

describe('authorizeRole middleware', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(() => {
    adminToken = jwt.sign({ username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    userToken = jwt.sign({ username: 'user', role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
  });

  it('allows access for admin role', async () => {
    const res = await request(app)
      .get('/api/admin/protected')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message', 'Welcome admin!');
  });

  it('rejects access for non-admin role', async () => {
    const res = await request(app)
      .get('/api/admin/protected')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Forbidden: insufficient permissions');
  });

  it('rejects access without a token', async () => {
    const res = await request(app).get('/api/admin/protected');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Authorization token required');
  });

  it('rejects access with an invalid token', async () => {
    const res = await request(app)
      .get('/api/admin/protected')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'Invalid or expired token');
  });
});
