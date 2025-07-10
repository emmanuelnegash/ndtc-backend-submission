import { Router } from 'express';
import { database } from '../database/connection';
import { randomInt } from 'crypto';
import { authenticateJWT } from '../middleware/auth';
import { authorizeController } from '../controllers/authorizeController';
import { authorizeRole } from '../middleware/role';
const router = Router();
const logger = console;

router.post('/clear', async (req, res) => {
  try {
    await database.run('DELETE FROM attendances');
    await database.run('DELETE FROM events');
    await database.run('DELETE FROM volunteers');
    await database.run('DELETE FROM candidates');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const candidates = [];
    for (let i = 1; i <= 3; i++) {
      const firstName = `Candidate${i}`;
      const lastName = `Test${i}`;
      const district = `District ${i}`;
      const office = `Office ${i}`;
      const result = await database.run(
        'INSERT INTO candidates (firstName, lastName, district, office) VALUES (?, ?, ?, ?)',
        [firstName, lastName, district, office]
      );
      candidates.push({ id: result.id, firstName, lastName });
    }
    for (let i = 1; i <= 5; i++) {
      const firstName = `Volunteer${i}`;
      const lastName = `Test${i}`;
      const email = `volunteer${i}@test.com`;
      const role = i % 2 === 0 ? 'Canvasser' : 'Phone Banker';
      const candidateId = i % 2 === 0 ? candidates[0].id : null;
      await database.run(
        'INSERT INTO volunteers (firstName, lastName, email, role, candidateId) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, role, candidateId]
      );
    }
    for (let i = 1; i <= 2; i++) {
      const name = `Event ${i}`;
      const date = `2025-07-0${i}`;
      const startTime = '10:00';
      const endTime = '14:00';
      const moneyRaised = 100 * i;
      await database.run(
        'INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised) VALUES (?, ?, ?, ?, ?, ?)',
        [candidates[0].id, name, date, startTime, endTime, moneyRaised]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate data' });
  }
});

router.get('/dashboard-metrics', async (req, res) => {
  try {
    let candidateIds: number[] = [];
    if (req.query.candidateIds) {
      let ids = req.query.candidateIds;
      if (Array.isArray(ids)) ids = ids[0];
      candidateIds = typeof ids === 'string' ? ids.split(',').map(Number) : [];
    }
    if (!candidateIds.length) return res.json({ chartData: { labels: [], datasets: [] } });
    const attendanceRows = await database.all(
      `
      SELECT date(a.createdAt) as date, e.candidateId, COUNT(a.id) as attendance
      FROM attendances a
      JOIN events e ON a.eventId = e.id
      WHERE e.candidateId IN (${candidateIds.map(() => '?').join(',')})
      GROUP BY date, e.candidateId
      ORDER BY date
    `,
      candidateIds
    );
    const donationRows = await database.all(
      `
      SELECT date(a.createdAt) as date, e.candidateId, SUM(a.donationAmount) as donations
      FROM attendances a
      JOIN events e ON a.eventId = e.id
      WHERE e.candidateId IN (${candidateIds.map(() => '?').join(',')})
      GROUP BY date, e.candidateId
      ORDER BY date
    `,
      candidateIds
    );
    const volunteerRows = await database.all(
      `
      SELECT date(createdAt) as date, candidateId, COUNT(id) as signups
      FROM volunteers
      WHERE candidateId IN (${candidateIds.map(() => '?').join(',')})
      GROUP BY date, candidateId
      ORDER BY date
    `,
      candidateIds
    );
    const candidateRows = await database.all(
      `SELECT id, firstName, lastName FROM candidates WHERE id IN (${candidateIds.map(() => '?').join(',')})`,
      candidateIds
    );
    const dates = Array.from(
      new Set([
        ...attendanceRows.map((r) => r.date),
        ...donationRows.map((r) => r.date),
        ...volunteerRows.map((r) => r.date),
      ])
    ).sort();
    const colors = ['#0070f3', '#f39c12', '#27ae60', '#e74c3c', '#8e44ad', '#16a085', '#c0392b'];
    const datasets = [];
    for (const candidateId of candidateIds) {
      const candidate = candidateRows.find((c) => c.id === candidateId);
      const name = candidate
        ? `${candidate.firstName} ${candidate.lastName}`
        : `Candidate ${candidateId}`;
      datasets.push({
        label: `Attendance: ${name}`,
        data: dates.map((d) => {
          const row = attendanceRows.find((r) => r.date === d && r.candidateId === candidateId);
          return row ? row.attendance : 0;
        }),
        borderColor: colors[0 + (candidateIds.indexOf(candidateId) % (colors.length - 2))],
        fill: false,
        yAxisID: 'y',
        metric: 'attendance',
      });
      datasets.push({
        label: `Donations: ${name}`,
        data: dates.map((d) => {
          const row = donationRows.find((r) => r.date === d && r.candidateId === candidateId);
          return row ? row.donations : 0;
        }),
        borderColor: colors[1 + (candidateIds.indexOf(candidateId) % (colors.length - 2))],
        fill: false,
        yAxisID: 'y',
        metric: 'donations',
      });
      datasets.push({
        label: `Volunteer Signups: ${name}`,
        data: dates.map((d) => {
          const row = volunteerRows.find((r) => r.date === d && r.candidateId === candidateId);
          return row ? row.signups : 0;
        }),
        borderColor: colors[2 + (candidateIds.indexOf(candidateId) % (colors.length - 2))],
        fill: false,
        yAxisID: 'y',
        metric: 'volunteerSignups',
      });
    }
    res.json({ chartData: { labels: dates, datasets } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

export async function generateSampleData() {
  if (process.env.NODE_ENV === 'test') {
    return; // Skip data seeding during tests
  }

  const row = await database.get('SELECT COUNT(*) as count FROM candidates');
  if (row.count === 0) {
    logger.info('Seeding sample data...');
    const candidates = [];
    for (let i = 1; i <= 3; i++) {
      const firstName = `Candidate${i}`;
      const lastName = `Test${i}`;
      const district = `District ${i}`;
      const office = `Office ${i}`;
      const result = await database.run(
        'INSERT INTO candidates (firstName, lastName, district, office) VALUES (?, ?, ?, ?)',
        [firstName, lastName, district, office]
      );
      candidates.push({ id: result.lastID, firstName, lastName });
    }

    for (const candidate of candidates) {
      const name = `Event for ${candidate.firstName}`;
      const date = '2025-07-10';
      const startTime = '10:00';
      const endTime = '14:00';
      const moneyRaised = 5000;
      const eventResult = await database.run(
        'INSERT INTO events (candidateId, name, date, startTime, endTime, moneyRaised) VALUES (?, ?, ?, ?, ?, ?)',
        [candidate.id, name, date, startTime, endTime, moneyRaised]
      );

      for (let j = 1; j <= 5; j++) {
        const donation = randomInt(10, 200);
        await database.run(
          'INSERT INTO attendances (eventId, firstName, lastName, email, interestedInVolunteering, volunteerRole, donationAmount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            eventResult.lastID,
            `Attendee${j}`,
            `Test${j}`,
            `attendee${j}@test.com`,
            j % 2 === 0,
            j % 2 === 0 ? 'Canvasser' : 'Phone Banker',
            donation,
            date,
          ]
        );
      }

      for (let i = 1; i <= 5; i++) {
        const firstName = `Volunteer${i}`;
        const lastName = `Test${i}`;
        const email = `volunteer${i}@test.com`;
        const role = i % 2 === 0 ? 'Canvasser' : 'Phone Banker';
        const candidateId = candidates[randomInt(0, candidates.length - 1)].id;
        await database.run(
          'INSERT INTO volunteers (firstName, lastName, email, role, candidateId) VALUES (?, ?, ?, ?, ?)',
          [firstName, lastName, email, role, candidateId]
        );
      }
    }
    logger.info('Sample data generated');
  } else {
    logger.info('Sample data already exists, skipping generation');
  }
}

router.get(
  '/protected',
  authenticateJWT,
  authorizeRole('admin'),
  authorizeController.adminOnlyAction
);

export default router;
