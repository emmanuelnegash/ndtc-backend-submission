import { Request, Response } from 'express';
import { database } from '../database/connection';
import { Volunteer } from '../models/Volunteer';

export class VolunteerController {
  async getAll(req: Request, res: Response) {
    try {
      const volunteers = await database.all('SELECT * FROM volunteers');
      res.json(volunteers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, role, candidateId } = req.body;
      const result = await database.run(
        'INSERT INTO volunteers (firstName, lastName, email, role, candidateId) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, role, candidateId || null]
      );
      res.status(201).json({ id: result.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create volunteer' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, role, candidateId } = req.body;
      await database.run(
        'UPDATE volunteers SET firstName = ?, lastName = ?, email = ?, role = ?, candidateId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [firstName, lastName, email, role, candidateId || null, req.params.id]
      );
      res.json({ id: req.params.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update volunteer' });
    }
  }
} 