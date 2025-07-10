import { Request, Response } from 'express';
import { database } from '../database/connection';
import { logger } from '../utils/logger';

export class AttendanceController {
  /** GET /api/attendances */
  async getAll(req: Request, res: Response) {
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit as string) || 10, 1);
    const offset = (page - 1) * limit;

    logger.debug(
      { method: req.method, url: req.url, page, limit },
      'Fetching attendances with pagination'
    );
    try {
      // Query to fetch attendances with total count
      const rows = await database.all(
        `
        SELECT
          a.*,
          e.name AS eventName,
          (SELECT COUNT(*) FROM attendances) AS total
        FROM attendances a
        JOIN events e ON a.eventId = e.id
        ORDER BY a.createdAt DESC
        LIMIT ? OFFSET ?
        `,
        [limit, offset]
      );

      const total =
        rows.length > 0
          ? rows[0].total
          : (await database.get('SELECT COUNT(*) AS total FROM attendances')).total;
      const attendances = rows.map(({ total, ...rest }) => rest);

      logger.info(
        { count: attendances.length, page, limit, total },
        'Fetched attendances successfully'
      );
      return res.json({
        data: attendances,
        meta: { page, limit, total },
      });
    } catch (err: any) {
      logger.error({ err, route: req.originalUrl }, 'Error fetching attendances');
      return res.status(500).json({
        error: `Failed to fetch attendances: ${err.message}`,
      });
    }
  }

  /** GET /api/attendances/:id */
  async getOne(req: Request, res: Response) {
    const { id } = req.params;
    logger.debug({ attendanceId: id }, 'Fetching single attendance');
    if (!id) {
      return res.status(400).json({ error: 'Attendance ID required' });
    }

    try {
      const row = (await database.get('SELECT * FROM attendances WHERE id = ?', [id])) as any;
      if (!row) {
        return res.status(404).json({ error: 'Attendance not found' }); // Correct error structure
      }
      return res.json(row);
    } catch (err: any) {
      logger.error({ err, attendanceId: id }, 'Error fetching attendance');
      return res.status(500).json({
        error: `Failed to fetch attendance: ${err.message}`,
      });
    }
  }

  /** POST /api/attendances */
  async create(req: Request, res: Response) {
    const {
      eventId,
      firstName,
      lastName,
      email,
      interestedInVolunteering,
      volunteerRole,
      donationAmount = 0,
    } = req.body;

    logger.debug({ body: req.body }, 'Attempting to create attendance');

    // Validate required fields
    if (
      !eventId ||
      !firstName ||
      !lastName ||
      !email ||
      typeof interestedInVolunteering !== 'boolean'
    ) {
      logger.warn({ body: req.body }, 'Validation failed: missing required fields');
      return res.status(400).json({
        error:
          'Missing required fields: eventId, firstName, lastName, email, interestedInVolunteering',
      });
    }

    // validation for negative donations
    if (typeof donationAmount !== 'number' || donationAmount < 0) {
      logger.warn({ donationAmount }, 'Validation failed: invalid donation amount');
      return res.status(400).json({ error: 'Donation must be a non-negative number' });
    }

    try {
      const result = await database.run(
        `INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, volunteerRole, donationAmount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          eventId,
          firstName,
          lastName,
          email,
          interestedInVolunteering ? 1 : 0,
          volunteerRole || null,
          donationAmount,
        ]
      );

      if (donationAmount > 0) {
        await database.run('UPDATE events SET moneyRaised = moneyRaised + ? WHERE id = ?', [
          donationAmount,
          eventId,
        ]);
      }

      logger.info({ attendanceId: result.lastID }, 'Attendance created successfully');
      return res.status(201).json({
        id: result.lastID,
        eventId,
        firstName,
        lastName,
        email,
        interestedInVolunteering,
        volunteerRole: volunteerRole || null,
        donationAmount,
      });
    } catch (err: any) {
      logger.error({ err, body: req.body }, 'Create attendance failed');
      return res.status(500).json({
        error: `Failed to create attendance: ${err.message}`,
      });
    }
  }

  /** PUT /api/attendances/:id */
  async update(req: Request, res: Response) {
    const { id } = req.params;
    logger.debug({ attendanceId: id, body: req.body }, 'Updating attendance');
    if (!id) {
      return res.status(400).json({ error: 'Attendance ID required' });
    }

    try {
      const existing = (await database.get(
        'SELECT donationAmount, eventId FROM attendances WHERE id = ?',
        [id]
      )) as
        | {
            donationAmount: number;
            eventId: number;
          }
        | undefined;

      if (!existing) {
        return res.status(404).json({ error: 'Attendance not found' });
      }

      const {
        firstName,
        lastName,
        email,
        interestedInVolunteering,
        volunteerRole,
        donationAmount = existing.donationAmount,
      } = req.body;

      // Update attendance record
      await database.run(
        `UPDATE attendances
           SET firstName = ?, lastName = ?, email = ?,
               interestedInVolunteering = ?, volunteerRole = ?, donationAmount = ?
         WHERE id = ?`,
        [
          firstName,
          lastName,
          email,
          interestedInVolunteering ? 1 : 0,
          volunteerRole || null,
          donationAmount,
          id,
        ]
      );

      // Adjust event moneyRaised if donation changed
      const diff = donationAmount - existing.donationAmount;
      if (diff !== 0) {
        await database.run('UPDATE events SET moneyRaised = moneyRaised + ? WHERE id = ?', [
          diff,
          existing.eventId,
        ]);
      }

      logger.info({ attendanceId: id }, 'Attendance updated successfully');
      return res.status(200).json({
        id,
        firstName,
        lastName,
        email,
        interestedInVolunteering,
        volunteerRole,
        donationAmount,
      });
    } catch (err: any) {
      logger.error({ err, attendanceId: id }, 'Error updating attendance');
      return res.status(500).json({
        error: `Failed to update attendance: ${err.message}`,
      });
    }
  }

  /** DELETE /api/attendances/:id */
  async delete(req: Request, res: Response) {
    const { id } = req.params;
    logger.debug({ attendanceId: id }, 'Attempting to delete attendance');

    if (!id) {
      logger.warn('Validation failed: attendance ID missing');
      return res.status(400).json({ error: 'Attendance ID required' });
    }

    try {
      const attendance = (await database.get(
        'SELECT eventId, donationAmount FROM attendances WHERE id = ?',
        [id]
      )) as { eventId: number; donationAmount: number } | undefined;

      if (!attendance) {
        logger.info({ attendanceId: id }, 'Attendance record not found');
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      await database.run('DELETE FROM attendances WHERE id = ?', [id]);

      if (attendance.donationAmount > 0) {
        await database.run('UPDATE events SET moneyRaised = moneyRaised - ? WHERE id = ?', [
          attendance.donationAmount,
          attendance.eventId,
        ]);
      }

      logger.info({ attendanceId: id }, 'Attendance deleted successfully');
      return res.status(204).send();
    } catch (err: any) {
      logger.error({ err, attendanceId: id }, 'Delete attendance failed');
      return res.status(500).json({
        error: `Failed to delete attendance: ${err.message}`,
      });
    }
  }
}
