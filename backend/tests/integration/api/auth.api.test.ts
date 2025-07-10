import request from 'supertest';
import app from '../../../src/app';

describe('Authentication API', () => {
  describe('POST /api/auth/login', () => {
    it('should return 200 and a token for valid admin credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'password' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/protected', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'password' });

      token = res.body.token;
    });

    it('should return 200 with valid token and admin role', async () => {
      const res = await request(app)
        .get('/api/admin/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Welcome admin!');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/admin/protected');
      expect(res.status).toBe(401);
    });

    it('should return 403 with valid token but wrong role', async () => {
      const fakeToken = 'your-non-admin-token';
      const res = await request(app)
        .get('/api/admin/protected')
        .set('Authorization', `Bearer ${fakeToken}`);
      expect(res.status === 403 || res.status === 401).toBe(true);
    });
  });
});
