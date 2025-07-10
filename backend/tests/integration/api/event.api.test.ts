import request from 'supertest';
import { testDb } from '../../setup/setup-test-db';
import type { Database } from 'sqlite';

jest.mock('../../../src/middleware/validation', () => ({
  validateRequest: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../../src/database/connection', () => ({
  database: {},
  databaseReady: Promise.resolve(),
}));

import app from '../../../src/app';

let db: Database;

beforeAll(async () => {
  db = await testDb.initialize();

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
  await db.exec('DELETE FROM events');
  await db.exec('DELETE FROM candidates');
  await db.run(
    `
    INSERT INTO candidates (id, firstName, lastName, district, office) 
    VALUES (?, ?, ?, ?, ?)`,
    [1, 'Test', 'Candidate', 'Test District', 'Test Office']
  );
  await db.run(
    `
    INSERT INTO events (id, candidateId, name, date, startTime, endTime, moneyRaised) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 1, 'Test Event', '2025-07-10', '10:00', '12:00', 100]
  );
});

afterAll(async () => {
  await testDb.close();
});

describe('Event API - CRUD Operations', () => {
  describe('GET /api/events', () => {
    it('should return a list of events', async () => {
      const res = await request(app).get('/api/events');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: 1,
        candidateId: 1,
        name: 'Test Event',
        date: '2025-07-10',
        startTime: '10:00',
        endTime: '12:00',
        moneyRaised: 100,
        firstName: 'Test',
        lastName: 'Candidate',
      });
    });

    it('should return paginated events', async () => {
      for (let i = 2; i <= 5; i++) {
        await db.run(
          `
          INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [1, `Event ${i}`, `2025-07-${i}`, '10:00', '12:00', i * 100]
        );
      }
      const res = await request(app).get('/api/events?page=2&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({
        total: 5,
        page: 2,
        limit: 2,
        orderBy: 'date',
        order: 'ASC',
      });
    });
  });

  describe('GET /api/events/:id', () => {
    it('should fetch an event by ID', async () => {
      const res = await request(app).get('/api/events/1');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 1,
        candidateId: 1,
        name: 'Test Event',
        date: '2025-07-10',
        startTime: '10:00',
        endTime: '12:00',
        moneyRaised: 100,
        firstName: 'Test',
        lastName: 'Candidate',
      });
    });

    it('should return 404 for a non-existent event', async () => {
      const res = await request(app).get('/api/events/999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Event not found' });
    });
  });

  describe('POST /api/events', () => {
    it('should create an event successfully', async () => {
      const payload = {
        candidateId: 1,
        name: 'New Event',
        date: '2025-07-15',
        startTime: '14:00',
        endTime: '16:00',
        moneyRaised: 200,
      };
      const res = await request(app).post('/api/events').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(payload);
      expect(typeof res.body.id).toBe('number');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app).post('/api/events').send({ name: 'Incomplete Event' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Missing required fields: candidateId, name, date, startTime, endTime',
      });
    });
  });

  describe('PUT /api/events/:id', () => {
    it('should update an event successfully', async () => {
      const payload = {
        candidateId: 1,
        name: 'Updated Event',
        date: '2025-07-20',
        startTime: '15:00',
        endTime: '17:00',
        moneyRaised: 300,
      };
      const res = await request(app).put('/api/events/1').send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(payload);
    });

    it('should return 404 when updating a non-existent event', async () => {
      const payload = {
        candidateId: 1,
        name: 'Non-existent Event',
        date: '2025-07-20',
        startTime: '15:00',
        endTime: '17:00',
        moneyRaised: 300,
      };
      const res = await request(app).put('/api/events/999').send(payload);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Event not found' });
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete an event successfully', async () => {
      const res = await request(app).delete('/api/events/1');
      expect(res.status).toBe(204);

      const check = await db.get('SELECT * FROM events WHERE id = ?', [1]);
      expect(check).toBeUndefined();
    });

    it('should return 404 when deleting a non-existent event', async () => {
      const res = await request(app).delete('/api/events/999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Event not found' });
    });
  });
});

describe('Event API - Pagination', () => {
  beforeEach(async () => {
    await db.exec('DELETE FROM events');
    for (let i = 1; i <= 10; i++) {
      await db.run(
        `
        INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [1, `Event ${i}`, `2025-07-${i}`, '10:00', '12:00', i * 100]
      );
    }
  });

  it('should return the correct page of events with pagination', async () => {
    const res = await request(app).get('/api/events?page=2&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({
      total: 10,
      page: 2,
      limit: 3,
      orderBy: 'date',
      order: 'ASC',
    });
  });

  it('should return an empty list if the page exceeds the total number of events', async () => {
    const res = await request(app).get('/api/events?page=5&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta).toMatchObject({
      total: 10,
      page: 5,
      limit: 3,
      orderBy: 'date',
      order: 'ASC',
    });
  });

  it('should return all events if no pagination parameters are provided', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10); // All events
    expect(res.body.meta).toMatchObject({
      total: 10,
      page: 1,
      limit: 10, // Default limit
      orderBy: 'date',
      order: 'ASC',
    });
  });
});
