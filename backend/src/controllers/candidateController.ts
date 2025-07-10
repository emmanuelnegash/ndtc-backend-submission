import { Request, Response } from 'express';
import { database } from '../database/connection';
import { logger } from '../utils/logger';

const VALID_ORDER_BY_COLUMNS = [
  'id',
  'firstName',
  'lastName',
  'district',
  'office',
  'createdAt',
  'updatedAt',
];

export class CandidateController {
  /** GET /api/candidates */
  async getAll(req: Request, res: Response) {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const offset = (page - 1) * limit;

    logger.debug(
      { method: req.method, url: req.url, page, limit },
      'Fetching candidates with pagination'
    );
    try {
      // Query to fetch candidates with total count using a subquery
      const rows = await database.all(
        `
        SELECT
          c.*,
          (SELECT COUNT(*) FROM candidates) AS total
        FROM candidates c
        ORDER BY c.lastName ASC
        LIMIT ? OFFSET ?
        `,
        [limit, offset]
      );

      // Fetch total count separately if no rows are returned
      const total =
        rows.length > 0
          ? rows[0].total
          : (await database.get('SELECT COUNT(*) AS total FROM candidates')).total;

      const candidates = rows.map(({ total, ...rest }) => rest);

      logger.info(
        { count: candidates.length, page, limit, total },
        'Fetched candidates successfully'
      );
      return res.json({
        data: candidates,
        meta: { page, limit, total, orderBy: 'lastName', order: 'ASC' },
      });
    } catch (err: any) {
      logger.error({ err, route: req.originalUrl }, 'Error fetching candidates');
      return res.status(500).json({
        error: `Failed to fetch candidates: ${err.message}`,
      });
    }
  }

  /** GET /api/candidates/:id */
  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }
    logger.debug({ candidateId: id }, 'Fetching single candidate');
    try {
      const candidate = await database.get('SELECT * FROM candidates WHERE id = ?', [id]);
      if (!candidate) {
        logger.warn({ candidateId: id }, 'Candidate not found');
        return res.status(404).json({ error: 'Candidate not found' });
      }
      return res.json(candidate);
    } catch (err: any) {
      logger.error({ err, candidateId: id }, 'Error fetching candidate');
      return res.status(500).json({ error: `Failed to fetch candidate: ${err.message}` });
    }
  }

  /** POST /api/candidates */
  async create(req: Request, res: Response) {
    const { firstName, lastName, district, office } = req.body;
    if (![firstName, lastName, district, office].every((v) => typeof v === 'string' && v.trim())) {
      logger.warn({ body: req.body }, 'Validation failed: missing required fields');
      return res
        .status(400)
        .json({ error: 'Missing required fields: firstName, lastName, district, office' });
    }
    logger.debug({ body: req.body }, 'Creating candidate');
    try {
      const result: any = await database.run(
        'INSERT INTO candidates (firstName, lastName, district, office) VALUES (?, ?, ?, ?)',
        [firstName, lastName, district, office]
      );
      logger.info({ candidateId: result.lastID }, 'Candidate created successfully');
      return res.status(201).json({ id: result.lastID, firstName, lastName, district, office });
    } catch (err: any) {
      logger.error({ err, body: req.body }, 'Create candidate failed');
      return res.status(500).json({ error: `Failed to create candidate: ${err.message}` });
    }
  }

  /** PUT /api/candidates/:id */
  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }
    const { firstName, lastName, district, office } = req.body;
    if (![firstName, lastName, district, office].every((v) => typeof v === 'string' && v.trim())) {
      logger.warn({ body: req.body }, 'Validation failed: missing required fields');
      return res
        .status(400)
        .json({ error: 'Missing required fields: firstName, lastName, district, office' });
    }
    logger.debug({ candidateId: id, body: req.body }, 'Updating candidate');
    try {
      const exists = await database.get('SELECT id FROM candidates WHERE id = ?', [id]);
      if (!exists) {
        logger.warn({ candidateId: id }, 'Candidate not found');
        return res.status(404).json({ error: 'Candidate not found' });
      }
      await database.run(
        'UPDATE candidates SET firstName=?, lastName=?, district=?, office=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?',
        [firstName, lastName, district, office, id]
      );
      logger.info({ candidateId: id }, 'Candidate updated successfully');
      return res.status(200).json({ id, firstName, lastName, district, office });
    } catch (err: any) {
      logger.error({ err, candidateId: id }, 'Error updating candidate');
      return res.status(500).json({ error: `Failed to update candidate: ${err.message}` });
    }
  }

  /** DELETE /api/candidates/:id */
  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }
    logger.debug({ candidateId: id }, 'Attempting to delete candidate');
    try {
      const exists = await database.get('SELECT id FROM candidates WHERE id = ?', [id]);
      if (!exists) {
        logger.warn({ candidateId: id }, 'Candidate not found');
        return res.status(404).json({ error: 'Candidate not found' });
      }

      const result: any = await database.run('DELETE FROM candidates WHERE id = ?', [id]);
      if (result.changes === 0) {
        logger.warn({ candidateId: id }, 'Candidate not found');
        return res.status(404).json({ error: 'Candidate not found' });
      }
      logger.info({ candidateId: id }, 'Candidate deleted successfully');
      return res.status(204).send();
    } catch (err: any) {
      logger.error({ err, candidateId: id }, 'Delete candidate failed');
      return res.status(500).json({ error: `Failed to delete candidate: ${err.message}` });
    }
  }
}
