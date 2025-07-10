import { Request, Response } from 'express';
import { database } from '../database/connection';
import { logger } from '../utils/logger';

const VALID_ORDER_BY_COLUMNS = [
  'id',
  'candidateId',
  'name',
  'date',
  'startTime',
  'endTime',
  'moneyRaised',
  'createdAt',
  'updatedAt',
];

export class EventController {
  /** GET /api/events */
  async getAll(req: Request, res: Response) {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const offset = (page - 1) * limit;

    logger.debug(
      { method: req.method, url: req.url, page, limit },
      'Fetching events with pagination'
    );
    try {
      const rows = await database.all(
        `
        SELECT
          e.id,
          e.candidateId,
          e.name,
          e.date,
          e.startTime,
          e.endTime,
          e.moneyRaised,
          c.firstName AS candidateFirstName,
          c.lastName AS candidateLastName,
          (SELECT COUNT(*) FROM events) AS total
        FROM events e
        JOIN candidates c ON e.candidateId = c.id
        ORDER BY e.date ASC
        LIMIT ? OFFSET ?
        `,
        [limit, offset]
      );

      // Fetch total count separately if no rows are returned
      const total =
        rows.length > 0
          ? rows[0].total
          : (await database.get('SELECT COUNT(*) AS total FROM events')).total;

      const events = rows.map(({ total, candidateFirstName, candidateLastName, ...rest }) => ({
        ...rest,
        firstName: candidateFirstName,
        lastName: candidateLastName,
      }));

      logger.info({ count: events.length, page, limit, total }, 'Fetched events successfully');
      return res.json({
        data: events,
        meta: { page, limit, total, orderBy: 'date', order: 'ASC' },
      });
    } catch (err: any) {
      logger.error({ err, route: req.originalUrl }, 'Error fetching events');
      return res.status(500).json({
        error: `Failed to fetch events: ${err.message}`,
      });
    }
  }

  /** GET /api/events/:id */
  async getOne(req: Request, res: Response) {
    const id = req.params.id; // Keep id as a string
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: 'Event ID required' });
    }
    try {
      const row = await database.get(
        `SELECT e.*, c.firstName, c.lastName
         FROM events e
         JOIN candidates c ON e.candidateId = c.id
         WHERE e.id = ?`,
        [id]
      );
      if (!row) return res.status(404).json({ error: 'Event not found' });
      return res.json(row);
    } catch (err: any) {
      logger.error({ err, eventId: id }, 'Error fetching event');
      return res.status(500).json({ error: `Failed to fetch event: ${err.message}` });
    }
  }

  /** POST /api/events */
  async create(req: Request, res: Response) {
    const { candidateId, name, date, startTime, endTime, moneyRaised = 0 } = req.body;

    // Validation for required fields
    if (!candidateId || !name || !date || !startTime || !endTime) {
      logger.warn({ body: req.body }, 'Validation failed: missing required fields');
      return res
        .status(400)
        .json({ error: 'Missing required fields: candidateId, name, date, startTime, endTime' }); // Changed to 400
    }

    try {
      const result: any = await database.run(
        `INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [candidateId, name, date, startTime, endTime, moneyRaised]
      );
      return res
        .status(201)
        .json({ id: result.lastID, candidateId, name, date, startTime, endTime, moneyRaised });
    } catch (err: any) {
      logger.error({ err }, 'Error creating event');
      return res.status(500).json({ error: `Failed to create event: ${err.message}` });
    }
  }

  /** PUT /api/events/:id */
  async update(req: Request, res: Response) {
    const id = req.params.id;
    const { candidateId, name, date, startTime, endTime, moneyRaised = 0 } = req.body;

    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: 'Event ID required' });
    }

    if (!candidateId || !name || !date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: candidateId, name, date, startTime, endTime' });
    }

    try {
      const exists = await database.get('SELECT id FROM events WHERE id = ?', [id]);
      if (!exists) {
        logger.warn({ eventId: id }, 'Event not found');
        return res.status(404).json({ error: 'Event not found' });
      }

      await database.run(
        `UPDATE events
         SET candidateId = ?, name = ?, date = ?, startTime = ?, endTime = ?, moneyRaised = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [candidateId, name, date, startTime, endTime, moneyRaised, id]
      );
      return res.json({ id, candidateId, name, date, startTime, endTime, moneyRaised });
    } catch (err: any) {
      logger.error({ err, eventId: id }, 'Error updating event');
      return res.status(500).json({ error: `Failed to update event: ${err.message}` });
    }
  }

  /** DELETE /api/events/:id */
  async delete(req: Request, res: Response) {
    const id = req.params.id;
    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
      return res.status(400).json({ error: 'Event ID required' });
    }
    try {
      const exists = await database.get('SELECT id FROM events WHERE id = ?', [id]);
      if (!exists) {
        logger.warn({ eventId: id }, 'Event not found');
        return res.status(404).json({ error: 'Event not found' });
      }

      const result: any = await database.run('DELETE FROM events WHERE id = ?', [id]);
      if (result.changes === 0) {
        logger.warn({ eventId: id }, 'Event not found');
        return res.status(404).json({ error: 'Event not found' });
      }

      logger.info({ eventId: id }, 'Event deleted successfully');
      return res.status(204).send();
    } catch (err: any) {
      logger.error({ err, eventId: id }, 'Error deleting event');
      return res.status(500).json({ error: `Failed to delete event: ${err.message}` });
    }
  }
}
