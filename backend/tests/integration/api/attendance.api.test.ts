import request from 'supertest';
import { testDb } from '../../setup/setup-test-db';
import type { Database } from 'sqlite';

// Mock validation middleware
jest.mock('../../../src/middleware/validation', () => ({
  validateRequest: (req: any, res: any, next: any) => next()
}));

// Mock the connection module
jest.mock('../../../src/database/connection', () => ({
  database: {},
  databaseReady: Promise.resolve(),
}));

import app from '../../../src/app';

let db: Database;
const TEST_EVENT_ID = 999;
const INITIAL_MONEY = 100;

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
  await db.exec('DELETE FROM attendances');
  await db.exec('DELETE FROM events');
  await db.exec('DELETE FROM candidates');

  // Create test data
  await db.run(`
    INSERT INTO candidates (id, firstName, lastName, district, office) 
    VALUES (?, ?, ?, ?, ?)`,
    [1, 'Test', 'Candidate', 'Test District', 'Test Office']
  );

  await db.run(`
    INSERT INTO events (id, candidateId, name, date, startTime, endTime, moneyRaised) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [TEST_EVENT_ID, 1, 'Test Event', '2023-08-15', '10:00', '12:00', INITIAL_MONEY]
  );
});

afterAll(async () => {
  await testDb.close();
});

describe('Attendance API - CRUD Operations', () => {
  describe('GET /api/attendances', () => {
    it('should return a list of attendances', async () => {
      await db.run(`
        INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, donationAmount) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [TEST_EVENT_ID, 'John', 'Doe', 'john@example.com', 1, 50]
      );

      const res = await request(app).get('/api/attendances');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        eventId: TEST_EVENT_ID,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        interestedInVolunteering: 1, // Match database representation
        donationAmount: 50,
      });
    });

    it('should return paginated attendances', async () => {
      for (let i = 0; i < 15; i++) {
        await db.run(`
          INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, donationAmount) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [TEST_EVENT_ID, `First${i}`, `Last${i}`, `email${i}@example.com`, 1, i * 10]
        );
      }

      const res = await request(app).get('/api/attendances?page=2&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta).toMatchObject({
        page: 2,
        limit: 5,
        total: 15,
      });
    });
  });

  describe('GET /api/attendances/:id', () => {
    it('should fetch an attendance by ID', async () => {
      const result = await db.run(`
        INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, donationAmount) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [TEST_EVENT_ID, 'Jane', 'Doe', 'jane@example.com', 1, 25]
      );

      const attendanceId = result.lastID;

      const res = await request(app).get(`/api/attendances/${attendanceId}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: attendanceId,
        eventId: TEST_EVENT_ID,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        interestedInVolunteering: 1, // Match database representation
        donationAmount: 25,
      });
    });

    it('should return 404 for a non-existent attendance', async () => {
      const res = await request(app).get('/api/attendances/99999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Attendance not found' }); // Correct error structure
    });
  });

  describe('POST /api/attendances', () => {
    it('should create attendance with donation and update event money', async () => {
      const donationAmount = 50;
      const attendanceData = {
        eventId: TEST_EVENT_ID,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        interestedInVolunteering: true,
        donationAmount,
      };

      const response = await request(app).post('/api/attendances').send(attendanceData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.donationAmount).toBe(donationAmount);

      const event = await db.get('SELECT moneyRaised FROM events WHERE id = ?', [TEST_EVENT_ID]);
      expect(event.moneyRaised).toBe(INITIAL_MONEY + donationAmount);
    });

    it('should return 400 when donation amount is negative', async () => {
      const invalidAttendance = {
        eventId: TEST_EVENT_ID,
        firstName: 'Bad',
        lastName: 'Donor',
        email: 'bad@example.com',
        interestedInVolunteering: true,
        donationAmount: -20,
      };

      const response = await request(app).post('/api/attendances').send(invalidAttendance);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/attendances/:id', () => {
    it('should update attendance and adjust event money', async () => {
      const result = await db.run(`
        INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, donationAmount) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [TEST_EVENT_ID, 'Update', 'User', 'update@example.com', 1, 30]
      );

      const attendanceId = result.lastID;

      const updatedData = {
        firstName: 'Updated',
        lastName: 'User',
        email: 'updated@example.com',
        interestedInVolunteering: false,
        donationAmount: 50,
      };

      const response = await request(app).put(`/api/attendances/${attendanceId}`).send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(updatedData);

      const event = await db.get('SELECT moneyRaised FROM events WHERE id = ?', [TEST_EVENT_ID]);
      expect(event.moneyRaised).toBe(INITIAL_MONEY + 20);

    });

    it('should return 404 when updating a non-existent attendance', async () => {
      const response = await request(app).put('/api/attendances/99999').send({
        firstName: 'Non-existent',
        lastName: 'User',
        email: 'nonexistent@example.com',
        interestedInVolunteering: true,
        donationAmount: 20,
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Attendance not found' });
    });
  });

  describe('DELETE /api/attendances/:id', () => {
    it('should delete attendance with donation and reduce event money', async () => {
      const result = await db.run(`
        INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, donationAmount) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [TEST_EVENT_ID, 'Del', 'User', 'del@example.com', 1, 75]
      );

      const attendanceId = result.lastID;

      await db.run('UPDATE events SET moneyRaised = moneyRaised + ? WHERE id = ?', [75, TEST_EVENT_ID]);

      const response = await request(app).delete(`/api/attendances/${attendanceId}`);
      expect(response.status).toBe(204);

      const event = await db.get('SELECT moneyRaised FROM events WHERE id = ?', [TEST_EVENT_ID]);
      expect(event.moneyRaised).toBe(INITIAL_MONEY);
    });

    it('should return 404 when deleting a non-existent attendance', async () => {
      const response = await request(app).delete('/api/attendances/99999');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Attendance record not found' });
    });
  });
});

describe('Attendance API - Pagination', () => {
  beforeEach(async () => {
    await db.exec('DELETE FROM attendances');
    for (let i = 0; i < 15; i++) {
      await db.run(`
        INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, donationAmount) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [TEST_EVENT_ID, `First${i}`, `Last${i}`, `email${i}@example.com`, 1, i * 10]
      );
    }
  });

  it('should return the correct page of attendances with pagination', async () => {
    const res = await request(app).get('/api/attendances?page=2&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({
      total: 15,
      page: 2,
      limit: 5,
    });
  });

  it('should return an empty list if the page exceeds the total number of attendances', async () => {
    const res = await request(app).get('/api/attendances?page=5&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta).toMatchObject({
      total: 15,
      page: 5,
      limit: 5,
    });
  });

  it('should return all attendances if no pagination parameters are provided', async () => {
    const res = await request(app).get('/api/attendances');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(10); // Default limit
    expect(res.body.meta).toMatchObject({
      total: 15,
      page: 1,
      limit: 10, // Default limit
    });
  });
});

