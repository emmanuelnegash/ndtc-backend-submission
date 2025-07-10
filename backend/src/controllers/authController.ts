import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

export const authController = {
  login(req: Request, res: Response) {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password') {
      const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
      return res.status(200).json({ token });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
  },
};
