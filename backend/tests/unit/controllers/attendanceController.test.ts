import { AttendanceController } from '../../../src/controllers/attendanceController';
import { database } from '../../../src/database/connection';
import { Request, Response } from 'express';

jest.mock('../../../src/database/connection', () => ({
  database: { all: jest.fn(), get: jest.fn(), run: jest.fn() }
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));


describe('AttendanceController', () => {
  let controller: AttendanceController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    controller = new AttendanceController();
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('create()', () => {
    beforeEach(() => {
      mockReq.body = {
        eventId: 1,
        firstName: 'Foo',
        lastName: 'Bar',
        email: 'foo@bar.com',
        interestedInVolunteering: true,
        volunteerRole: 'Helper'
      };
    });

    it('creates attendance with donation and updates event', async () => {
      mockReq.body.donationAmount = 50;
      const mockResult = { lastID: 123 };
      (database.run as jest.Mock).mockImplementation(async (sql) => {
        if (sql.includes('INSERT INTO attendances')) return mockResult;
        if (sql.includes('UPDATE events')) return {};
      });

      await controller.create(mockReq as Request, mockRes as Response);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO attendances'),
        [1, 'Foo', 'Bar', 'foo@bar.com', 1, 'Helper', 50]
      );
      expect(database.run).toHaveBeenCalledWith(
        'UPDATE events SET moneyRaised = moneyRaised + ? WHERE id = ?',
        [50, 1]
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          donationAmount: 50
        })
      );
    });

    it('creates attendance without donation and does not update event', async () => {
      const mockResult = { lastID: 456 };
      (database.run as jest.Mock).mockResolvedValue(mockResult);

      await controller.create(mockReq as Request, mockRes as Response);

      expect(database.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO attendances'),
        [1, 'Foo', 'Bar', 'foo@bar.com', 1, 'Helper', 0]
      );
      expect(database.run).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE events'),
        expect.anything()
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 456,
          donationAmount: 0
        })
      );
    });

    it('returns 400 when donationAmount is negative', async () => {
      mockReq.body.donationAmount = -10;

      await controller.create(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Donation must be a non-negative number'
      });
      expect(database.run).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      mockReq.params = { id: '42' };
      mockRes.send = jest.fn().mockReturnThis();  // <-- Add this mock!
    });
  
    it('deletes attendance with donation and updates event', async () => {
      (database.get as jest.Mock).mockResolvedValue({ eventId: 1, donationAmount: 30 });
      (database.run as jest.Mock).mockResolvedValue({});
  
      await controller.delete(mockReq as Request, mockRes as Response);
  
      expect(database.get).toHaveBeenCalledWith(
        'SELECT eventId, donationAmount FROM attendances WHERE id = ?',
        ['42']
      );
      expect(database.run).toHaveBeenCalledWith(
        'DELETE FROM attendances WHERE id = ?',
        ['42']
      );
      expect(database.run).toHaveBeenCalledWith(
        'UPDATE events SET moneyRaised = moneyRaised - ? WHERE id = ?',
        [30, 1]
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  
    it('deletes attendance without donation and does not update event', async () => {
      (database.get as jest.Mock).mockResolvedValue({ eventId: 1, donationAmount: 0 });
  
      await controller.delete(mockReq as Request, mockRes as Response);
  
      expect(database.run).toHaveBeenCalledWith(
        'DELETE FROM attendances WHERE id = ?',
        ['42']
      );
      expect(database.run).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE events'),
        expect.anything()
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });
  
    it('returns 404 when attendance record not found', async () => {
      (database.get as jest.Mock).mockResolvedValue(undefined);

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Attendance record not found'
      });
    });

    it('returns 400 when no id param provided', async () => {
      mockReq.params = {};
      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Attendance ID required'
      });
    });

    it('returns 500 on DB error and logs properly', async () => {
      (database.get as jest.Mock).mockResolvedValue({ eventId: 1, donationAmount: 20 });
      (database.run as jest.Mock).mockRejectedValue(new Error('fail'));

      await controller.delete(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to delete attendance: fail'
      });
    });
  });
});
