import 'dotenv/config';
import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  filename: string;
  driver: typeof sqlite3.Database;
}

class DatabaseManager {
  private db: Database | null = null;
  public ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init() {
    const config = this.getDatabaseConfig();

    // Ensure data directory exists for file-based databases
    if (config.filename !== ':memory:') {
      const dir = path.dirname(config.filename);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created data directory: ${dir}`);
      }
    }

    logger.info(`Opening SQLite DB at ${config.filename}`);
    this.db = await open({
      filename: config.filename,
      driver: config.driver,
      mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    });
    await this.createTables();
    logger.info('Database initialized');
  }

  private getDatabaseConfig(): DatabaseConfig {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
      case 'test':
        return {
          filename: ':memory:',
          driver: sqlite3.Database,
        };

      case 'production':
        return {
          filename: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'production.db'),
          driver: sqlite3.Database,
        };

      default:
        return {
          filename: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'development.db'),
          driver: sqlite3.Database,
        };
    }
  }

  private async createTables() {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        district TEXT NOT NULL,
        office TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('Candidates table created');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidateId INTEGER NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL,
        moneyRaised REAL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE CASCADE
      );
    `);
    logger.info('Events table created');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS attendances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        interestedInVolunteering BOOLEAN DEFAULT FALSE,
        volunteerRole TEXT,
        donationAmount REAL DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
      );
    `);
    logger.info('Attendances table created');

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        candidateId INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE SET NULL
      );
    `);
    logger.info('Volunteers table created');
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.run(sql, params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get(sql, params);
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.all(sql, params);
  }

  async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.exec(sql);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.get('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  getDatabaseInfo(): { filename: string; environment: string } {
    const config = this.getDatabaseConfig();
    return {
      filename: config.filename,
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
export const database = new DatabaseManager();
export const databaseReady = database.ready;
