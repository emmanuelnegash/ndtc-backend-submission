import { Request, Response, NextFunction } from 'express';
import { authorizeRole } from '../../../src/middleware/role';

describe('authorizeRole middleware', () => {
  let req: Partial<Request> & { user?: { username: string; role: string } };
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

  it('allows access for users with the correct role', () => {
    req.user = { username: 'admin', role: 'admin' };

    const middleware = authorizeRole('admin');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('denies access for users with an incorrect role', () => {
    req.user = { username: 'user', role: 'user' };

    const middleware = authorizeRole('admin');
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('denies access if user is missing', () => {
    req.user = undefined;

    const middleware = authorizeRole('admin');
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden: insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });
});
