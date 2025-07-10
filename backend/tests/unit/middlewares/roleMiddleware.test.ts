import { Request, Response, NextFunction } from 'express';
import { authorizeRole } from '../../../src/middleware/role';

describe('authorizeRole middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should allow access when user has the required role', () => {
    (req as any).user = { username: 'admin', role: 'admin' };
    const middleware = authorizeRole('admin');

    middleware(req as Request, res as Response, next);

    // next() should be invoked exactly once and with no arguments
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    // no error responses
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should deny access when user has a different role', () => {
    (req as any).user = { username: 'user', role: 'user' };
    const middleware = authorizeRole('admin');

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should deny access when no user is present', () => {
    const middleware = authorizeRole('admin');

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });
});
