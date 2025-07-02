import { Request, Response } from 'express';
import { database } from '../database/connection';

export class EventController {
  async getAll(req: Request, res: Response) {
    try {
      const { candidateId, orderBy = 'date', order = 'DESC' } = req.query;
      let sql = `
        SELECT e.*, c.firstName, c.lastName 
        FROM events e 
        JOIN candidates c ON e.candidateId = c.id
      `;
      const params: any[] = [];
      
      if (candidateId) {
        sql += ' WHERE e.candidateId = ?';
        params.push(candidateId);
      }
      
      sql += ` ORDER BY e.${orderBy} ${order}`;
      
      const events = await database.all(sql, params);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { candidateId, name, date, startTime, endTime, moneyRaised } = req.body;
      const result = await database.run(
        'INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised) VALUES (?, ?, ?, ?, ?, ?)',
        [candidateId, name, date, startTime, endTime, moneyRaised || 0]
      );
      res.status(201).json({ id: result.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create event' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { candidateId, name, date, startTime, endTime, moneyRaised } = req.body;
      await database.run(
        'UPDATE events SET candidateId = ?, name = ?, date = ?, startTime = ?, endTime = ?, moneyRaised = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [candidateId, name, date, startTime, endTime, moneyRaised || 0, req.params.id]
      );
      res.json({ id: req.params.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
}