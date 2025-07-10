import { Request, Response } from 'express';

export class AuthorizeController {
  async adminOnlyAction(req: Request, res: Response) {
    return res.json({ message: 'Admin-only resource accessed.' });
  }
}

export const authorizeController = new AuthorizeController();
