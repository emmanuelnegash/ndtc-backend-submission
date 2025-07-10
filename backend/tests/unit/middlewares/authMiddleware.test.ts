import { authenticateJWT } from '../../../src/middleware/auth';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
const mockVerify = jwt.verify as jest.Mock;

describe('authenticateJWT middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('allows valid tokens', () => {
    req.headers = { authorization: 'Bearer validtoken' };
    mockVerify.mockReturnValue({ id: 1, role: 'admin' });

    authenticateJWT(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual({ id: 1, role: 'admin' });
  });

  it('rejects invalid tokens with 403', () => {
    req.headers = { authorization: 'Bearer invalidtoken' };
    mockVerify.mockImplementation(() => {
      throw new Error('Invalid or expired token');
    });

    authenticateJWT(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing Authorization header with 401', () => {
    authenticateJWT(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token required' });
    expect(next).not.toHaveBeenCalled();
  });
});
