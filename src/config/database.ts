// src/config/database.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/models/schema';
import { env } from './env';
import { logger } from '@/utils/logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: postgres.Sql;
  public db: ReturnType<typeof drizzle>;

  private constructor() {
    try {
      this.client = postgres(env.DATABASE_URL, {
        max: 20,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
      });

      this.db = drizzle(this.client, { schema, logger: false });
      
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to establish database connection:', error);
      throw error;
    }
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.client.end();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }
}

export const dbConnection = DatabaseConnection.getInstance();
export const db = dbConnection.db;