import { Request, Response } from 'express';
import { database } from '../database/connection';
import { Volunteer } from '../models/Volunteer';
import { logger } from '../utils/logger';

export class VolunteerController {
  async getAll(req: Request, res: Response) {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const offset = (page - 1) * limit;

    logger.debug({ page, limit }, 'Listing volunteers with pagination');
    try {
      const rows = await database.all(
        `
        SELECT
          v.*,
          COUNT(*) OVER() AS total
        FROM volunteers v
        ORDER BY v.createdAt DESC
        LIMIT ? OFFSET ?
        `,
        [limit, offset]
      );

      const total =
        rows.length > 0
          ? rows[0].total
          : (await database.get('SELECT COUNT(*) AS total FROM volunteers')).total;
      const data = rows.map(({ total, ...rest }) => rest);

      logger.info({ count: data.length, page, limit, total }, 'Fetched volunteers');
      return res.json({ data, meta: { total, page, limit } });
    } catch (err: any) {
      logger.error({ err }, 'Error fetching volunteers');
      return res.status(500).json({ error: `Failed to fetch volunteers: ${err.message}` });
    }
  }
  async getOne(req: Request, res: Response) {
    const { id } = req.params;
    logger.debug({ volunteerId: id }, 'Fetching single volunteer');
    if (!id) {
      return res.status(400).json({ error: 'Volunteer ID required' });
    }

    try {
      const volunteer = await database.get('SELECT * FROM volunteers WHERE id = ?', [id]);
      if (!volunteer) {
        logger.warn({ volunteerId: id }, 'Volunteer not found');
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      return res.json(volunteer);
    } catch (err: any) {
      logger.error({ err, volunteerId: id }, 'Error fetching volunteer');
      return res.status(500).json({ error: `Failed to fetch volunteer: ${err.message}` });
    }
  }
  async create(req: Request, res: Response) {
    const { firstName, lastName, email, role, candidateId } = req.body;
    logger.debug({ body: req.body }, 'Creating volunteer');

    const errors = [];
    if (!firstName) errors.push({ field: 'firstName', message: 'First name is required' });
    if (!lastName) errors.push({ field: 'lastName', message: 'Last name is required' });
    if (!email) errors.push({ field: 'email', message: 'Valid email is required' });
    if (!role) errors.push({ field: 'role', message: 'Role is required' });

    if (errors.length > 0) {
      logger.warn({ errors }, 'Validation failed');
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    try {
      const result = await database.run(
        `INSERT INTO volunteers (firstName, lastName, email, role, candidateId)
         VALUES (?, ?, ?, ?, ?)`,
        [firstName, lastName, email, role, candidateId || null]
      );
      const id = result.lastID;
      logger.info({ volunteerId: id }, 'Volunteer created');
      return res
        .status(201)
        .json({ id, firstName, lastName, email, role, candidateId: candidateId || null });
    } catch (err: any) {
      logger.error({ err }, 'Error creating volunteer');
      return res.status(500).json({ error: `Failed to create volunteer: ${err.message}` });
    }
  }
  async update(req: Request, res: Response) {
    const { id } = req.params;
    const { firstName, lastName, email, role, candidateId } = req.body;
    logger.debug({ volunteerId: id, body: req.body }, 'Updating volunteer');
    if (!firstName || !lastName || !email || !role) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: firstName, lastName, email, role' });
    }

    try {
      const existing = await database.get('SELECT id FROM volunteers WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Volunteer not found' });
      }

      await database.run(
        `UPDATE volunteers SET firstName = ?, lastName = ?, email = ?, role = ?, candidateId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [firstName, lastName, email, role, candidateId || null, id]
      );
      return res.json({ id, firstName, lastName, email, role, candidateId: candidateId || null });
    } catch (err: any) {
      return res.status(500).json({ error: `Failed to update volunteer: ${err.message}` });
    }
  }
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Volunteer ID required' });
    }
    logger.debug({ volunteerId: id }, 'Deleting volunteer');
    try {
      const existing = await database.get('SELECT id FROM volunteers WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Volunteer not found' });
      }

      await database.run('DELETE FROM volunteers WHERE id = ?', [id]);
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({ error: `Failed to delete volunteer: ${err.message}` });
    }
  }
}
