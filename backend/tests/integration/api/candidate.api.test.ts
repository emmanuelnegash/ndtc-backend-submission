import request from 'supertest';
import { testDb } from '../../setup/setup-test-db';
import type { Database } from 'sqlite';

// Mock validation middleware
jest.mock('../../../src/middleware/validation', () => ({
  validateRequest: (req: any, res: any, next: any) => next(),
}));

// Mock the connection module
jest.mock('../../../src/database/connection', () => ({
  database: {},
  databaseReady: Promise.resolve(),
}));

import app from '../../../src/app';

let db: Database;

beforeAll(async () => {
  // Initialize test database
  db = await testDb.initialize();

  // Replace the mocked database
  const connMod = require('../../../src/database/connection');
  connMod.database = {
    run: async (sql: string, params?: any[]) => db.run(sql, params),
    get: async (sql: string, params?: any[]) => db.get(sql, params),
    all: async (sql: string, params?: any[]) => db.all(sql, params),
    exec: async (sql: string) => db.exec(sql),
  };
});

beforeEach(async () => {
  // Clean and seed data
  await db.exec('DELETE FROM candidates');
  await db.run(
    `
    INSERT INTO candidates (id, firstName, lastName, district, office) 
    VALUES (?, ?, ?, ?, ?)
  `,
    [1, 'Test', 'Candidate', 'Test District', 'Test Office']
  );
});

afterAll(async () => {
  await testDb.close();
});

describe('Candidate API - CRUD Operations', () => {
  describe('GET /api/candidates', () => {
    it('should return an empty list when no candidates exist', async () => {
      await db.exec('DELETE FROM candidates'); // Ensure the database is empty
      const res = await request(app).get('/api/candidates');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 10, orderBy: 'lastName', order: 'ASC' },
      });
    });

    it('should return a list of candidates', async () => {
      const res = await request(app).get('/api/candidates');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: 1,
        firstName: 'Test',
        lastName: 'Candidate',
        district: 'Test District',
        office: 'Test Office',
      });
    });
  });

  describe('POST /api/candidates', () => {
    it('should create a candidate successfully', async () => {
      const payload = { firstName: 'Alice', lastName: 'Wonder', district: '5A', office: 'Council' };
      const res = await request(app).post('/api/candidates').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(payload);
      expect(typeof res.body.id).toBe('number');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/candidates').send({ firstName: 'OnlyName' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Missing required fields: firstName, lastName, district, office',
      });
    });
  });

  describe('DELETE /api/candidates/:id', () => {
    it('should delete a candidate successfully', async () => {
      const insert = await db.run(
        `
        INSERT INTO candidates (firstName, lastName, district, office) 
        VALUES (?, ?, ?, ?)
      `,
        ['Charlie', 'Chaplin', '9C', 'Governor']
      );
      const id = insert.lastID as number;

      const res = await request(app).delete(`/api/candidates/${id}`);
      expect(res.status).toBe(204);

      const check = await db.get('SELECT * FROM candidates WHERE id = ?', [id]);
      expect(check).toBeUndefined();
    });

    it('should return 404 when deleting a non-existent candidate', async () => {
      const res = await request(app).delete('/api/candidates/99999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Candidate not found' });
    });
  });

  describe('GET /api/candidates/:id', () => {
    it('should fetch a candidate by ID', async () => {
      const res = await request(app).get('/api/candidates/1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 1,
        firstName: 'Test',
        lastName: 'Candidate',
        district: 'Test District',
        office: 'Test Office',
      });
    });

    it('should return 404 when fetching a non-existent candidate', async () => {
      const res = await request(app).get('/api/candidates/99999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Candidate not found' });
    });
  });
});

describe('Candidate API - Pagination', () => {
  beforeEach(async () => {
    await db.exec('DELETE FROM candidates');
    for (let i = 0; i < 7; i++) {
      await db.run(
        `
        INSERT INTO candidates (firstName, lastName, district, office) 
        VALUES (?, ?, ?, ?)`,
        [`F${i}`, `L${i}`, `D${i}`, `O${i}`]
      );
    }
  });

  it('should return the correct page of candidates with pagination', async () => {
    const res = await request(app).get('/api/candidates?page=2&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({
      total: 7,
      page: 2,
      limit: 3,
      orderBy: 'lastName',
      order: 'ASC',
    });
  });

  it('should return an empty list if the page exceeds the total number of candidates', async () => {
    const res = await request(app).get('/api/candidates?page=5&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta).toMatchObject({
      total: 7,
      page: 5,
      limit: 3,
      orderBy: 'lastName',
      order: 'ASC',
    });
  });

  it('should return all candidates if no pagination parameters are provided', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7); // All candidates
    expect(res.body.meta).toMatchObject({
      total: 7,
      page: 1,
      limit: 10, // Default limit
      orderBy: 'lastName',
      order: 'ASC',
    });
  });
});
