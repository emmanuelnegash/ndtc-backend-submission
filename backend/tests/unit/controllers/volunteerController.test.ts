import { VolunteerController } from '../../../src/controllers/volunteerController';
import { database } from '../../../src/database/connection';
import { Request, Response } from 'express';

jest.mock('../../../src/database/connection', () => ({
  database: { all: jest.fn(), get: jest.fn(), run: jest.fn() },
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('VolunteerController', () => {
  let controller: VolunteerController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    controller = new VolunteerController();
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    sendMock = jest.fn().mockReturnThis();
    res = { status: statusMock, json: jsonMock, send: sendMock } as unknown as Response;
    jest.clearAllMocks();
  });

  describe('getAll()', () => {
    it('returns paginated volunteers on success', async () => {
      const rows = [
        {
          id: 1,
          firstName: 'A',
          lastName: 'B',
          email: 'a@b',
          role: 'R',
          candidateId: null,
          total: 2,
        },
        {
          id: 2,
          firstName: 'C',
          lastName: 'D',
          email: 'c@d',
          role: 'R2',
          candidateId: 1,
          total: 2,
        },
      ];
      (database.all as jest.Mock).mockResolvedValue(rows);

      req = { query: {} };
      await controller.getAll(req as Request, res as Response);

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) OVER() AS total'),
        [10, 0]
      );
      expect(jsonMock).toHaveBeenCalledWith({
        data: [
          { id: 1, firstName: 'A', lastName: 'B', email: 'a@b', role: 'R', candidateId: null },
          { id: 2, firstName: 'C', lastName: 'D', email: 'c@d', role: 'R2', candidateId: 1 },
        ],
        meta: { total: 2, page: 1, limit: 10 },
      });
    });

    it('handles DB error', async () => {
      (database.all as jest.Mock).mockRejectedValue(new Error('oops'));
      req = { query: {} };
      await controller.getAll(req as Request, res as Response);

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) OVER() AS total'),
        [10, 0]
      );
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch volunteers: oops' });
    });
  });

  describe('getOne()', () => {
    it('returns a volunteer on success', async () => {
      const vol = { id: 1, firstName: 'A', lastName: 'B', email: 'e', role: 'R', candidateId: 2 };
      (database.get as jest.Mock).mockResolvedValue(vol);
      req = { params: { id: '1' } };

      await controller.getOne(req as Request, res as Response);

      expect(database.get).toHaveBeenCalledWith('SELECT * FROM volunteers WHERE id = ?', ['1']);
      expect(jsonMock).toHaveBeenCalledWith(vol);
    });

    it('returns 400 if id missing', async () => {
      req = { params: {} };
      await controller.getOne(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Volunteer ID required' });
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      req = { params: { id: '1' } };
      await controller.getOne(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Volunteer not found' });
    });

    it('handles DB error', async () => {
      (database.get as jest.Mock).mockRejectedValue(new Error('err'));
      req = { params: { id: '1' } };
      await controller.getOne(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch volunteer: err',
      });
    });
  });

  describe('create()', () => {
    it('returns 400 on missing fields', async () => {
      req = { body: { firstName: 'Jane' } };
      await controller.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: [
          { field: 'lastName', message: 'Last name is required' },
          { field: 'email', message: 'Valid email is required' },
          { field: 'role', message: 'Role is required' },
        ],
      });
    });

    it('creates and returns new volunteer', async () => {
      (database.run as jest.Mock).mockResolvedValue({ lastID: 3 });
      req = { body: { firstName: 'A', lastName: 'B', email: 'e', role: 'R', candidateId: 5 } };

      await controller.create(req as Request, res as Response);

      expect(database.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO volunteers'), [
        'A',
        'B',
        'e',
        'R',
        5,
      ]);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        id: 3,
        firstName: 'A',
        lastName: 'B',
        email: 'e',
        role: 'R',
        candidateId: 5,
      });
    });

    it('handles DB error', async () => {
      (database.run as jest.Mock).mockRejectedValue(new Error('fail'));
      req = { body: { firstName: 'A', lastName: 'B', email: 'e', role: 'R' } };

      await controller.create(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create volunteer: fail',
      });
    });
  });

  describe('update()', () => {
    it('returns 400 on missing fields', async () => {
      req = { params: { id: '1' }, body: { firstName: 'A' } };
      await controller.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required fields: firstName, lastName, email, role',
      });
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      req = { params: { id: '1' }, body: { firstName: 'A', lastName: 'B', email: 'e', role: 'R' } };
      await controller.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Volunteer not found' });
    });

    it('updates successfully', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockResolvedValue({});
      req = {
        params: { id: '1' },
        body: { firstName: 'A', lastName: 'B', email: 'e', role: 'R', candidateId: 5 },
      };

      await controller.update(req as Request, res as Response);

      expect(database.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE volunteers'), [
        'A',
        'B',
        'e',
        'R',
        5,
        '1',
      ]);
      expect(jsonMock).toHaveBeenCalledWith({
        id: '1',
        firstName: 'A',
        lastName: 'B',
        email: 'e',
        role: 'R',
        candidateId: 5,
      });
    });

    it('handles DB error', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockRejectedValue(new Error('err'));
      req = {
        params: { id: '1' },
        body: { firstName: 'A', lastName: 'B', email: 'e', role: 'R' },
      };

      await controller.update(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to update volunteer: err',
      });
    });
  });

  describe('delete()', () => {
    it('returns 400 if id missing', async () => {
      req = { params: {} };
      await controller.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Volunteer ID required' });
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      req = { params: { id: '1' } };
      await controller.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Volunteer not found' });
    });

    it('deletes successfully', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockResolvedValue({});
      req = { params: { id: '1' } };

      await controller.delete(req as Request, res as Response);

      expect(database.run).toHaveBeenCalledWith('DELETE FROM volunteers WHERE id = ?', ['1']);
      expect(statusMock).toHaveBeenCalledWith(204);
      expect(sendMock).toHaveBeenCalled();
    });

    it('handles DB error', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockRejectedValue(new Error('err'));
      req = { params: { id: '1' } };
      await controller.delete(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to delete volunteer: err',
      });
    });
  });
});
