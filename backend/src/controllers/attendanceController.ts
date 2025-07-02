import { Request, Response } from 'express';
import { database } from '../database/connection';

export class AttendanceController {
  async getAll(req: Request, res: Response) {
    try {
      const attendances = await database.all(`
        SELECT a.*, e.name as eventName
        FROM attendances a
        JOIN events e ON a.eventId = e.id
      `);
      res.json(attendances);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch attendances' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { eventId, firstName, lastName, email, interestedInVolunteering, volunteerRole, donationAmount } = req.body;
      const result = await database.run(
        'INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, volunteerRole, donationAmount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [eventId, firstName, lastName, email, interestedInVolunteering, volunteerRole, donationAmount || 0]
      );
      res.status(201).json({ id: result.id, ...req.body });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create attendance' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await database.run('DELETE FROM attendances WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete attendance' });
    }
  }
} 