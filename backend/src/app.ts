import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { logger } from './utils/logger';
import { databaseReady } from './database/connection';

import { authController } from './controllers/authController';
import { authenticateJWT } from './middleware/auth';
import { authorizeRole } from './middleware/role';

import candidateRoutes from './routes/candidates';
import eventRoutes from './routes/events';
import adminRoutes, { generateSampleData } from './routes/admin';
import volunteerRoutes from './routes/volunteers';
import attendanceRoutes from './routes/attendances';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

function setupMiddleware(app: express.Application) {
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    })
  );
  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json());
}

function setupAuthRoutes(app: express.Application) {
  app.post('/api/auth/login', authController.login);
  // Example protected route
  app.get('/api/admin/protected', authenticateJWT, authorizeRole('admin'), (_req, res) => {
    res.json({ message: 'Welcome admin!' });
  });
}

function setupApiRoutes(app: express.Application) {
  app.use('/api/candidates', candidateRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/volunteers', volunteerRoutes);
  app.use('/api/attendances', attendanceRoutes);
}

function setupHealthRoute(app: express.Application) {
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
}

function setupErrorHandlers(app: express.Application) {
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
}

async function initializeApp() {
  await databaseReady;
  logger.info('Database ready');

  if (process.env.NODE_ENV !== 'test' && process.env.GENERATE_SAMPLE_DATA !== 'false') {
    try {
      await generateSampleData();
      logger.info('Sample data seeded');
    } catch (err) {
      logger.error('Failed to seed sample data:', err);
    }
  }
}

setupMiddleware(app);
setupAuthRoutes(app);
setupApiRoutes(app);
setupHealthRoute(app);
setupErrorHandlers(app);

initializeApp()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });

export default app;
