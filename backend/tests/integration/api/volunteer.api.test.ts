// Updated test file for Event and Volunteer APIs
import request from 'supertest';
import { testDb } from '../../setup/setup-test-db';
import type { Database } from 'sqlite';

jest.mock('../../../src/middleware/validation', () => ({
  validateRequest: (_req: any, _res: any, next: any) => next(),
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
  await db.exec('DELETE FROM events');
  await db.exec('DELETE FROM volunteers');
  await db.exec('DELETE FROM candidates');
  await db.run(
    `INSERT INTO candidates (id, firstName, lastName, district, office)
     VALUES (1, 'Candidate', 'One', 'District1', 'Office1')`
  );
});

afterAll(async () => {
  await testDb.close();
});

describe('Event API - CRUD Operations', () => {
  it('should return an empty list if page exceeds total', async () => {
    for (let i = 1; i <= 5; i++) {
      await db.run(
        `INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised)
         VALUES (1, 'Event ${i}', '2025-07-${i}', '10:00', '12:00', 100)`
      );
    }
    const res = await request(app).get('/api/events?page=3&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('should return paginated events', async () => {
    for (let i = 1; i <= 10; i++) {
      await db.run(`
        INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised)
        VALUES (1, 'Event ${i}', '2025-07-${i}', '10:00', '12:00', ${i * 100})
      `);
    }
    const res = await request(app).get('/api/events?page=2&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
  });

  it('should fetch an event by ID', async () => {
    const { lastID } = await db.run(`
      INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised)
      VALUES (1, 'Event 1', '2025-07-01', '10:00', '12:00', 100)
    `);
    const res = await request(app).get(`/api/events/${lastID}`);
    expect(res.status).toBe(200);
  });

  it('should return 404 for non-existent event', async () => {
    const res = await request(app).get('/api/events/9999');
    expect(res.status).toBe(404);
  });

  it('should create event successfully', async () => {
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
  });

  it('should return 400 when creating event with missing fields', async () => {
    const res = await request(app).post('/api/events').send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('should update event successfully', async () => {
    const { lastID } = await db.run(`
      INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised)
      VALUES (1, 'Old Event', '2025-07-01', '10:00', '12:00', 100)
    `);

    const updated = {
      candidateId: 1,
      name: 'Updated Event',
      date: '2025-07-20',
      startTime: '15:00',
      endTime: '17:00',
      moneyRaised: 300,
    };

    const res = await request(app).put(`/api/events/${lastID}`).send(updated);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(updated);
  });

  it('should return 404 on updating non-existent event', async () => {
    const res = await request(app).put('/api/events/9999').send({
      candidateId: 1,
      name: 'Update',
      date: '2025-07-20',
      startTime: '15:00',
      endTime: '17:00',
      moneyRaised: 300,
    });
    expect(res.status).toBe(404);
  });

  it('should delete event successfully', async () => {
    const { lastID } = await db.run(`
      INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised)
      VALUES (1, 'Event to delete', '2025-07-01', '10:00', '12:00', 100)
    `);

    const res = await request(app).delete(`/api/events/${lastID}`);
    expect(res.status).toBe(204);
    const check = await db.get('SELECT * FROM events WHERE id = ?', [lastID]);
    expect(check).toBeUndefined();
  });

  it('should return 404 when deleting non-existent event', async () => {
    const res = await request(app).delete('/api/events/9999');
    expect(res.status).toBe(404);
  });
});

describe('Volunteer API - CRUD Operations', () => {
  describe('GET /api/volunteers', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 10; i++) {
        await db.run(
          `
          INSERT INTO volunteers (firstName, lastName, email, role, candidateId) 
          VALUES (?, ?, ?, ?, ?)`,
          [`First${i}`, `Last${i}`, `email${i}@example.com`, `Role${i}`, 1]
        );
      }
    });

    it('should return a list of volunteers with pagination', async () => {
      const res = await request(app).get('/api/volunteers?page=2&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta).toMatchObject({
        total: 10,
        page: 2,
        limit: 5,
      });
    });

    it('should return all volunteers if no pagination parameters are provided', async () => {
      const res = await request(app).get('/api/volunteers');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta).toMatchObject({
        total: 10,
        page: 1,
        limit: 10, // Default limit
      });
    });
  });

  describe('GET /api/volunteers/:id', () => {
    it('should fetch a volunteer by ID', async () => {
      const result = await db.run(
        `
        INSERT INTO volunteers (firstName, lastName, email, role, candidateId) 
        VALUES (?, ?, ?, ?, ?)`,
        ['John', 'Doe', 'john@example.com', 'Role1', 1]
      );

      const volunteerId = result.lastID;

      const res = await request(app).get(`/api/volunteers/${volunteerId}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: volunteerId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        role: 'Role1',
        candidateId: 1,
      });
    });

    it('should return 404 for a non-existent volunteer', async () => {
      const res = await request(app).get('/api/volunteers/99999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Volunteer not found' });
    });
  });

  describe('POST /api/volunteers', () => {
    it('should create a volunteer successfully', async () => {
      const volunteerData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        role: 'Role2',
        candidateId: 1,
      };

      const res = await request(app).post('/api/volunteers').send(volunteerData);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(volunteerData);
      expect(res.body).toHaveProperty('id');
    });

    it('should return 400 when required fields are missing', async () => {
      const invalidData = { firstName: 'Jane' };
      const res = await request(app).post('/api/volunteers').send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Validation failed',
        details: [
          { field: 'lastName', message: 'Last name is required' },
          { field: 'email', message: 'Valid email is required' },
          { field: 'role', message: 'Role is required' },
        ],
      });
    });
  });

  describe('PUT /api/volunteers/:id', () => {
    it('should update a volunteer successfully', async () => {
      const result = await db.run(
        `
        INSERT INTO volunteers (firstName, lastName, email, role, candidateId) 
        VALUES (?, ?, ?, ?, ?)`,
        ['Jane', 'Doe', 'jane@example.com', 'Role2', 1]
      );

      const volunteerId = result.lastID;

      const updatedData = {
        firstName: 'Updated',
        lastName: 'Doe',
        email: 'updated@example.com',
        role: 'UpdatedRole',
        candidateId: 1,
      };

      const res = await request(app).put(`/api/volunteers/${volunteerId}`).send(updatedData);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(updatedData);
    });

    it('should return 404 when updating a non-existent volunteer', async () => {
      const updatedData = {
        firstName: 'Updated',
        lastName: 'Doe',
        email: 'updated@example.com',
        role: 'UpdatedRole',
        candidateId: 1,
      };

      const res = await request(app).put('/api/volunteers/99999').send(updatedData);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Volunteer not found' });
    });
  });

  describe('DELETE /api/volunteers/:id', () => {
    it('should delete a volunteer successfully', async () => {
      const result = await db.run(
        `
        INSERT INTO volunteers (firstName, lastName, email, role, candidateId) 
        VALUES (?, ?, ?, ?, ?)`,
        ['Jane', 'Doe', 'jane@example.com', 'Role2', 1]
      );

      const volunteerId = result.lastID;

      const res = await request(app).delete(`/api/volunteers/${volunteerId}`);
      expect(res.status).toBe(204);

      const check = await db.get('SELECT * FROM volunteers WHERE id = ?', [volunteerId]);
      expect(check).toBeUndefined();
    });

    it('should return 404 when deleting a non-existent volunteer', async () => {
      const res = await request(app).delete('/api/volunteers/99999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Volunteer not found' });
    });
  });
});

describe('Volunteer API - Pagination', () => {
  beforeEach(async () => {
    await db.exec('DELETE FROM volunteers');
    for (let i = 1; i <= 10; i++) {
      await db.run(
        `
        INSERT INTO volunteers (firstName, lastName, email, role, candidateId) 
        VALUES (?, ?, ?, ?, ?)`,
        [`First${i}`, `Last${i}`, `email${i}@example.com`, `Role${i}`, 1]
      );
    }
  });

  it('should return the correct page of volunteers with pagination', async () => {
    const res = await request(app).get('/api/volunteers?page=2&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({
      total: 10,
      page: 2,
      limit: 3,
    });
  });

  it('should return an empty list if the page exceeds the total number of volunteers', async () => {
    const res = await request(app).get('/api/volunteers?page=5&limit=3');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta).toMatchObject({
      total: 10,
      page: 5,
      limit: 3,
    });
  });

  it('should return all volunteers if no pagination parameters are provided', async () => {
    const res = await request(app).get('/api/volunteers');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10); // All volunteers
    expect(res.body.meta).toMatchObject({
      total: 10,
      page: 1,
      limit: 10, // Default limit
    });
  });
});
