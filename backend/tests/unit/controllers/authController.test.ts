import { authController } from '../../../src/controllers/authController';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

jest.mock('jsonwebtoken');
const mockSign = jwt.sign as jest.Mock;

describe('authController.login', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('returns a JWT token for valid admin credentials', () => {
    req.body = { username: 'admin', password: 'password' };
    mockSign.mockReturnValue('mocked.jwt.token');

    authController.login(req as Request, res as Response);

    expect(mockSign).toHaveBeenCalledWith(
      { username: 'admin', role: 'admin' },
      expect.any(String),
      { expiresIn: '1h' }
    );
    expect(res.json).toHaveBeenCalledWith({ token: 'mocked.jwt.token' });
  });

  it('returns 401 for invalid credentials', () => {
    req.body = { username: 'admin', password: 'wrongpassword' };

    authController.login(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('returns 401 if username is missing', () => {
    req.body = { password: 'password' };

    authController.login(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });

  it('returns 401 if password is missing', () => {
    req.body = { username: 'admin' };

    authController.login(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
  });
});
