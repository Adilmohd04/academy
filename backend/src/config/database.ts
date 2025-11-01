/**
 * Database Configuration
 * 
 * PostgreSQL connection with pooling for scalability.
 * Configured to handle 10K+ concurrent users efficiently.
 */

import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root directory (one level up from backend)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Use DATABASE_URL if available, otherwise use individual connection params
const poolConfig: PoolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      // Connection pooling for scalability
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased for remote DB
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'education_platform',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

// Create connection pool
const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a query with automatic connection handling
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

/**
 * Get a client from the pool for transaction handling
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

export default pool;
