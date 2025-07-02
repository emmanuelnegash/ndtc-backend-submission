import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import candidateRoutes from './routes/candidates';
import eventRoutes from './routes/events';
import adminRoutes, { generateSampleData } from './routes/admin';
import volunteerRoutes from './routes/volunteers';
import attendanceRoutes from './routes/attendances';
import { databaseReady } from './database/connection';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/candidates', candidateRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/attendances', attendanceRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Generates example data on app start
// Set to false to start with a clean database
export const generateData = true;

async function startServer() {
  await databaseReady;
  if (generateData) {
    try {
      await generateSampleData();
    } catch (err) {
      console.error('Failed to generate sample data:', err);
    }
  }
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

export default app;