import { Request, Response } from 'express';
import { database } from '../database/connection';
import { Candidate } from '../models/Candidate';

export class CandidateController {
  async getAll(req: Request, res: Response) {
    try {
      const { orderBy = 'lastName', order = 'ASC' } = req.query;
      const candidates = await database.all(
        `SELECT * FROM candidates ORDER BY ${orderBy} ${order}`
      );
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const candidate = await database.get(
        'SELECT * FROM candidates WHERE id = ?',
        [req.params.id]
      );
      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch candidate' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { firstName, lastName, district, office } = req.body;
      const result = await database.run(
        'INSERT INTO candidates (firstName, lastName, district, office) VALUES (?, ?, ?, ?)',
        [firstName, lastName, district, office]
      );
      res.status(201).json({ id: result.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create candidate' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { firstName, lastName, district, office } = req.body;
      await database.run(
        'UPDATE candidates SET firstName = ?, lastName = ?, district = ?, office = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [firstName, lastName, district, office, req.params.id]
      );
      res.json({ id: req.params.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update candidate' });
    }
  }
}
