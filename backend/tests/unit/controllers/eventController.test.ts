import { EventController } from '../../../src/controllers/eventController';
import { database } from '../../../src/database/connection';
import { Request, Response } from 'express';

jest.mock('../../../src/database/connection', () => ({
  database: { all: jest.fn(), get: jest.fn(), run: jest.fn() },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EventController', () => {
  let controller: EventController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    controller = new EventController();
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    sendMock = jest.fn();
    res = { status: statusMock, json: jsonMock, send: sendMock } as unknown as Response;
    jest.clearAllMocks();
  });

  describe('getAll()', () => {
    it('returns paginated events on success', async () => {
      const rows = [
        {
          id: 1,
          candidateId: 1,
          name: 'Event 1',
          date: '2025-07-09',
          startTime: '10:00',
          endTime: '12:00',
          moneyRaised: 1000,
          candidateFirstName: 'John',
          candidateLastName: 'Doe',
          total: 10,
        },
        {
          id: 2,
          candidateId: 1,
          name: 'Event 2',
          date: '2025-07-10',
          startTime: '14:00',
          endTime: '16:00',
          moneyRaised: 2000,
          candidateFirstName: 'John',
          candidateLastName: 'Doe',
          total: 10,
        },
      ];
      (database.all as jest.Mock).mockResolvedValue(rows);

      req = { query: {} };

      await controller.getAll(req as Request, res as Response);

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('(SELECT COUNT(*) FROM events) AS total'),
        [10, 0]
      );

      expect(jsonMock).toHaveBeenCalledWith({
        data: [
          {
            id: 1,
            candidateId: 1,
            name: 'Event 1',
            date: '2025-07-09',
            startTime: '10:00',
            endTime: '12:00',
            moneyRaised: 1000,
            firstName: 'John',
            lastName: 'Doe',
          },
          {
            id: 2,
            candidateId: 1,
            name: 'Event 2',
            date: '2025-07-10',
            startTime: '14:00',
            endTime: '16:00',
            moneyRaised: 2000,
            firstName: 'John',
            lastName: 'Doe',
          },
        ],
        meta: { total: 10, page: 1, limit: 10, orderBy: 'date', order: 'ASC' },
      });
    });

    it('handles error', async () => {
      (database.all as jest.Mock).mockRejectedValue(new Error('Database error'));

      req = { query: {} };

      await controller.getAll(req as Request, res as Response);

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('(SELECT COUNT(*) FROM events) AS total'),
        [10, 0]
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch events: Database error',
      });
    });
  });

  describe('getOne()', () => {
    it('returns a single event', async () => {
      const row = {
        id: 1,
        name: 'E1',
        candidateId: 2,
        date: '2025-01-01',
        startTime: '10:00',
        endTime: '12:00',
        moneyRaised: 0,
        firstName: 'A',
        lastName: 'B',
      };
      (database.get as jest.Mock).mockResolvedValue(row);
      req = { params: { id: '1' } };
      await controller.getOne(req as Request, res as Response);

      expect(database.get).toHaveBeenCalledWith(expect.stringContaining('WHERE e.id = ?'), ['1']);
      expect(jsonMock).toHaveBeenCalledWith(row);
    });

    it('returns 400 if no id', async () => {
      req = { params: {} };
      await controller.getOne(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event ID required' });
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      req = { params: { id: '1' } };
      await controller.getOne(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event not found' });
    });

    it('handles error', async () => {
      (database.get as jest.Mock).mockRejectedValue(new Error('fail'));
      req = { params: { id: '1' } };
      await controller.getOne(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch event: fail',
      });
    });
  });

  describe('create()', () => {
    it('creates and returns event', async () => {
      (database.run as jest.Mock).mockResolvedValue({ lastID: 7 });
      req = {
        body: {
          candidateId: 2,
          name: 'E1',
          date: '2025-01-01',
          startTime: '10:00',
          endTime: '12:00',
        },
      };
      await controller.create(req as Request, res as Response);

      expect(database.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO events'), [
        2,
        'E1',
        '2025-01-01',
        '10:00',
        '12:00',
        0,
      ]);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        id: 7,
        candidateId: 2,
        name: 'E1',
        date: '2025-01-01',
        startTime: '10:00',
        endTime: '12:00',
        moneyRaised: 0,
      });
    });

    it('handles error', async () => {
      (database.run as jest.Mock).mockRejectedValue(new Error('bad'));
      req = {
        body: {
          candidateId: 2,
          name: 'E1',
          date: '2025-01-01',
          startTime: '10:00',
          endTime: '12:00',
        },
      };
      await controller.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create event: bad',
      });
    });
  });

  describe('update()', () => {
    it('returns 400 if no id', async () => {
      req = { params: {}, body: {} };
      await controller.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event ID required' });
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      req = {
        params: { id: '1' },
        body: {
          candidateId: 1,
          name: 'Event',
          date: '2025-07-09',
          startTime: '10:00',
          endTime: '12:00',
        },
      };

      await controller.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event not found' });
    });

    it('updates successfully', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockResolvedValue({});
      req = {
        params: { id: '1' },
        body: {
          candidateId: 2,
          name: 'E2',
          date: '2025-02-02',
          startTime: '11:00',
          endTime: '13:00',
          moneyRaised: 5,
        },
      };
      await controller.update(req as Request, res as Response);

      expect(database.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE events'), [
        2,
        'E2',
        '2025-02-02',
        '11:00',
        '13:00',
        5,
        '1',
      ]);
      expect(jsonMock).toHaveBeenCalledWith({
        id: '1',
        candidateId: 2,
        name: 'E2',
        date: '2025-02-02',
        startTime: '11:00',
        endTime: '13:00',
        moneyRaised: 5,
      });
    });

    it('handles error', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockRejectedValue(new Error('err'));
      req = {
        params: { id: '1' },
        body: {
          candidateId: 2,
          name: 'E2',
          date: '2025-02-02',
          startTime: '11:00',
          endTime: '13:00',
          moneyRaised: 5,
        },
      };
      await controller.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to update event: err',
      });
    });
  });

  describe('delete()', () => {
    it('returns 400 if no id', async () => {
      req = { params: {} };
      await controller.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event ID required' });
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      req = { params: { id: '1' } };
      await controller.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Event not found' });
    });

    it('deletes successfully', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockResolvedValue({ changes: 1 });
      req = { params: { id: '1' } };

      await controller.delete(req as Request, res as Response);

      expect(database.run).toHaveBeenCalledWith('DELETE FROM events WHERE id = ?', ['1']);
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('handles error', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockRejectedValue(new Error('err'));
      req = { params: { id: '1' } };
      await controller.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to delete event: err',
      });
    });
  });
});
