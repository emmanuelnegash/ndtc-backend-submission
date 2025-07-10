import { CandidateController } from '../../../src/controllers/candidateController';
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

describe('CandidateController', () => {
  let controller: CandidateController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    controller = new CandidateController();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();
    sendMock = jest.fn().mockReturnThis();

    mockRes = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    };

    jest.clearAllMocks();
  });

  describe('getAll()', () => {
    it('returns paginated list on success', async () => {
      const rows = [
        { id: 1, firstName: 'A', lastName: 'B', district: 'X', office: 'Y', total: 2 },
        { id: 2, firstName: 'C', lastName: 'D', district: 'X', office: 'Y', total: 2 },
      ];
      (database.all as jest.Mock).mockResolvedValue(rows);

      mockReq = { query: {} };

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(database.all).toHaveBeenCalledWith(
        expect.stringContaining('(SELECT COUNT(*) FROM candidates) AS total'),
        [10, 0]
      );

      expect(jsonMock).toHaveBeenCalledWith({
        data: [
          { id: 1, firstName: 'A', lastName: 'B', district: 'X', office: 'Y' },
          { id: 2, firstName: 'C', lastName: 'D', district: 'X', office: 'Y' },
        ],
        meta: { total: 2, page: 1, limit: 10, orderBy: 'lastName', order: 'ASC' },
      });
    });

    it('handles DB error', async () => {
      (database.all as jest.Mock).mockRejectedValue(new Error('fail'));

      mockReq = { query: {} };

      await controller.getAll(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch candidates: fail',
      });
    });
  });

  describe('getById()', () => {
    it('returns a candidate on success', async () => {
      const candidate = { id: 1, firstName: 'A', lastName: 'B', district: 'X', office: 'Y' };
      (database.get as jest.Mock).mockResolvedValue(candidate);

      mockReq = { params: { id: '1' } };

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(database.get).toHaveBeenCalledWith('SELECT * FROM candidates WHERE id = ?', [1]);
      expect(jsonMock).toHaveBeenCalledWith(candidate);
    });

    it('returns 404 if not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);

      mockReq = { params: { id: '1' } };

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Candidate not found' });
    });

    it('handles DB error', async () => {
      (database.get as jest.Mock).mockRejectedValue(new Error('fail'));

      mockReq = { params: { id: '1' } };

      await controller.getById(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch candidate: fail',
      });
    });
  });

  describe('create()', () => {
    it('returns 400 on missing fields', async () => {
      mockReq = { body: { firstName: 'A' } };

      await controller.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required fields: firstName, lastName, district, office',
      });
    });

    it('creates and returns new candidate', async () => {
      (database.run as jest.Mock).mockResolvedValue({ lastID: 5 });
      mockReq = {
        body: { firstName: 'A', lastName: 'B', district: 'X', office: 'Y' },
      };

      await controller.create(mockReq as Request, mockRes as Response);

      expect(database.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO candidates'), [
        'A',
        'B',
        'X',
        'Y',
      ]);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        id: 5,
        firstName: 'A',
        lastName: 'B',
        district: 'X',
        office: 'Y',
      });
    });

    it('handles DB error', async () => {
      (database.run as jest.Mock).mockRejectedValue(new Error('fail'));
      mockReq = {
        body: { firstName: 'A', lastName: 'B', district: 'X', office: 'Y' },
      };

      await controller.create(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create candidate: fail',
      });
    });
  });

  describe('update()', () => {
    it('returns 400 on missing fields', async () => {
      mockReq = { params: { id: '1' }, body: { firstName: 'A' } };

      await controller.update(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required fields: firstName, lastName, district, office',
      });
    });

    it('returns 404 if candidate not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      mockReq = {
        params: { id: '1' },
        body: { firstName: 'A', lastName: 'B', district: 'X', office: 'Y' },
      };

      await controller.update(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Candidate not found' });
    });

    it('updates successfully', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockResolvedValue({});
      mockReq = {
        params: { id: '1' },
        body: { firstName: 'A', lastName: 'B', district: 'X', office: 'Y' },
      };

      await controller.update(mockReq as Request, mockRes as Response);

      expect(database.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE candidates'), [
        'A',
        'B',
        'X',
        'Y',
        1,
      ]);
      expect(jsonMock).toHaveBeenCalledWith({
        id: 1,
        firstName: 'A',
        lastName: 'B',
        district: 'X',
        office: 'Y',
      });
    });

    it('handles DB error', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockRejectedValue(new Error('fail'));
      mockReq = {
        params: { id: '1' },
        body: { firstName: 'A', lastName: 'B', district: 'X', office: 'Y' },
      };

      await controller.update(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to update candidate: fail',
      });
    });
  });

  describe('delete()', () => {
    it('returns 404 if candidate not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);
      mockReq = { params: { id: '1' } };

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Candidate not found' });
    });

    it('deletes successfully', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockResolvedValue({});
      mockReq = { params: { id: '1' } };

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(sendMock).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(204);
    });

    it('handles DB error', async () => {
      (database.get as jest.Mock).mockResolvedValue({ id: 1 });
      (database.run as jest.Mock).mockRejectedValue(new Error('fail'));
      mockReq = { params: { id: '1' } };

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to delete candidate: fail',
      });
    });
  });
});
