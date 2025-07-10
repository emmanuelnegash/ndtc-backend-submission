import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import fs from 'fs';

/**
 * Test database configuration
 */
interface TestDatabaseConfig {
  inMemory: boolean;
  filePath?: string;
  enableForeignKeys: boolean;
  logQueries?: boolean;
}

/**
 * Enhanced test database manager class
 * Provides a clean interface for managing test database lifecycle
 */
export class TestDatabaseManager {
  private db: Database | null = null;
  private config: TestDatabaseConfig;
  private isInTransaction = false;

  /**
   * Create a new test database manager
   * @param config Configuration options
   */
  constructor(config: TestDatabaseConfig = { 
    inMemory: true, 
    enableForeignKeys: true,
    logQueries: false
  }) {
    this.config = config;
  }

  /**
   * Initialize the test database
   * @returns Database connection
   */
  async initialize(): Promise<Database> {
    // Close existing connection if any
    await this.close();

    // Determine database location
    const dbPath = this.config.inMemory ? 
      ':memory:' : 
      this.config.filePath || path.resolve(__dirname, '../../../test-database.sqlite');

    // Remove existing file if using file-based database
    if (!this.config.inMemory && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // Create and open database connection
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Configure database
    if (this.config.enableForeignKeys) {
      await this.db.exec('PRAGMA foreign_keys = ON');
    }

    // Enable WAL mode for better concurrent access
    if (!this.config.inMemory) {
      await this.db.exec('PRAGMA journal_mode = WAL');
    }

    // Create schema
    await this.createSchema();

    return this.db;
  }

  /**
   * Enhanced transaction management
   */
  async beginTransaction(): Promise<void> {
    try {
      // Check if we're already in a transaction by trying to start one
      await this.getConnection().exec('BEGIN IMMEDIATE');
      this.isInTransaction = true;
      
      if (this.config.logQueries) {
        console.log('🔄 Transaction started');
      }
    } catch (error: any) {
      if (error.message?.includes('cannot start a transaction within a transaction')) {
        // We're already in a transaction, that's fine
        console.log('ℹ️  Already in transaction');
        this.isInTransaction = true;
      } else {
        throw error;
      }
    }
  }

  async commitTransaction(): Promise<void> {
    if (!this.isInTransaction) {
      return; // No transaction to commit
    }
    
    try {
      await this.getConnection().exec('COMMIT');
      this.isInTransaction = false;
      
      if (this.config.logQueries) {
        console.log('✅ Transaction committed');
      }
    } catch (error: any) {
      if (error.message?.includes('cannot commit - no transaction is active')) {
        // No transaction to commit, reset state
        this.isInTransaction = false;
      } else {
        throw error;
      }
    }
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.isInTransaction) {
      return; // No transaction to rollback
    }
    
    try {
      await this.getConnection().exec('ROLLBACK');
      this.isInTransaction = false;
      
      if (this.config.logQueries) {
        console.log('❌ Transaction rolled back');
      }
    } catch (error: any) {
      if (error.message?.includes('cannot rollback - no transaction is active')) {
        // No transaction to rollback, reset state
        this.isInTransaction = false;
      } else {
        throw error;
      }
    }
  }

  /**
   * Safe close method
   */
  async close(): Promise<void> {
    if (this.db) {
      // Only try to rollback if we think we're in a transaction
      if (this.isInTransaction) {
        try {
          await this.rollbackTransaction();
        } catch (error) {
          // Ignore rollback errors during close
          console.warn('Ignoring rollback error during close:', error);
        }
      }
      
      await this.db.close();
      this.db = null;
      this.isInTransaction = false;
    }
  }

  /**
   * Get the database connection
   * @returns Active database connection
   * @throws Error if database not initialized
   */
  getConnection(): Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Create database schema - FIXED TO MATCH YOUR ROUTES
   */
  private async createSchema(): Promise<void> {
    const db = this.getConnection();
    
    if (this.config.logQueries) {
      console.log('📋 Creating database schema...');
    }
    
    // Create tables in dependency order - FIXED SCHEMA
    await db.exec(`
      CREATE TABLE candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        district TEXT NOT NULL,
        office TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE volunteers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        candidateId INTEGER,
        phoneNumber TEXT,
        skills TEXT,
        availability TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidateId) REFERENCES candidates(id)
      )
    `);

    await db.exec(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidateId INTEGER NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        startTime TEXT,
        endTime TEXT,
        moneyRaised NUMERIC DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidateId) REFERENCES candidates(id)
      )
    `);

    await db.exec(`
      CREATE TABLE attendances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId INTEGER NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT NOT NULL,
        interestedInVolunteering INTEGER NOT NULL,
        volunteerRole TEXT,
        donationAmount NUMERIC DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id)
      )
    `);

    // Create indexes for better performance
    await db.exec('CREATE INDEX idx_events_candidate ON events(candidateId)');
    await db.exec('CREATE INDEX idx_attendances_event ON attendances(eventId)');
    await db.exec('CREATE INDEX idx_volunteers_candidate ON volunteers(candidateId)');
    
    if (this.config.logQueries) {
      console.log('✅ Database schema created successfully');
    }
  }

  /**
   * Truncate all tables (delete all data)
   */
  async truncateAll(): Promise<void> {
    const db = this.getConnection();
    const tables = ['attendances', 'events', 'volunteers', 'candidates'];
    
    const wasInTransaction = this.isInTransaction;
    
    if (!wasInTransaction) {
      await this.beginTransaction();
    }
    
    try {
      // Disable foreign key checks temporarily
      await db.exec('PRAGMA foreign_keys = OFF');
      
      for (const table of tables) {
        await db.exec(`DELETE FROM ${table}`);
        if (this.config.logQueries) {
          console.log(`🗑️  Cleared table: ${table}`);
        }
      }
      
      // Re-enable foreign key checks
      await db.exec('PRAGMA foreign_keys = ON');
      
      if (!wasInTransaction) {
        await this.commitTransaction();
      }
    } catch (error) {
      if (!wasInTransaction) {
        await this.rollbackTransaction();
      }
      throw error;
    }
  }

  /**
   * Seed the database with test data - FIXED SCHEMA
   */
  async seedTestData(): Promise<void> {
    const db = this.getConnection();
    
    const wasInTransaction = this.isInTransaction;
    
    if (!wasInTransaction) {
      await this.beginTransaction();
    }
    
    try {
      // Insert a test candidate with CORRECT column names
      await db.run(`
        INSERT INTO candidates (id, firstName, lastName, district, office) 
        VALUES (?, ?, ?, ?, ?)
      `, [1, 'Test', 'Candidate', 'Test District', 'Test Office']);
      
      if (this.config.logQueries) {
        console.log('👤 Created test candidate');
      }
      
      // Insert a test event
      await db.run(`
        INSERT INTO events (id, candidateId, name, date, startTime, endTime, moneyRaised) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [999, 1, 'Test Event', '2023-08-15', '10:00', '12:00', 100]);
      
      if (this.config.logQueries) {
        console.log('📅 Created test event');
      }
      
      if (!wasInTransaction) {
        await this.commitTransaction();
      }
    } catch (error) {
      if (!wasInTransaction) {
        await this.rollbackTransaction();
      }
      throw error;
    }
  }

  /**
   * Reset database to clean state
   */
  async reset(): Promise<void> {
    await this.truncateAll();
    await this.seedTestData();
    
    if (this.config.logQueries) {
      console.log('🔄 Database reset completed');
    }
  }

  /**
   * Get table counts for debugging
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const db = this.getConnection();
    const tables = ['candidates', 'events', 'volunteers', 'attendances'];
    const counts: Record<string, number> = {};
    
    for (const table of tables) {
      const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
      counts[table] = result.count;
    }
    
    return counts;
  }

  /**
   * Execute raw SQL (for testing purposes)
   */
  async executeRaw(sql: string, params?: any[]): Promise<any> {
    const db = this.getConnection();
    
    if (this.config.logQueries) {
      console.log('🔍 Raw SQL:', sql, params);
    }
    
    if (sql.trim().toLowerCase().startsWith('select')) {
      return db.all(sql, params);
    } else {
      return db.run(sql, params);
    }
  }
}

// Convenience functions for backward compatibility
export async function initTestDatabase(config?: TestDatabaseConfig): Promise<Database> {
  const manager = new TestDatabaseManager(config);
  return await manager.initialize();
}

export async function cleanDatabase(db: Database): Promise<void> {
  const tables = ['attendances', 'events', 'volunteers', 'candidates'];
  
  await db.exec('BEGIN TRANSACTION');
  try {
    await db.exec('PRAGMA foreign_keys = OFF');
    for (const table of tables) {
      await db.exec(`DELETE FROM ${table}`);
    }
    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

// Export singleton instance for common use cases
export const testDb = new TestDatabaseManager({
  inMemory: true,
  enableForeignKeys: true,
  logQueries: process.env.NODE_ENV === 'test' && process.env.DEBUG === 'true'
});