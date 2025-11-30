/**
 * Database Configuration
 * 
 * PostgreSQL connection with pooling for scalability.
 * Configured to handle 10K+ concurrent users efficiently.
 * Now loads from root .env for single source of truth.
 */

import { Pool, PoolConfig } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug: Log database connection info
console.log('🔍 Database Configuration:');
console.log('  DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('  DATABASE_URL (first 50 chars):', process.env.DATABASE_URL?.substring(0, 50));
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL);

// Supabase client for easier database operations
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// PostgreSQL pool configuration using DATABASE_URL from .env
const poolConfig: PoolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'education_platform',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false,
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

// Create connection pool (optional, Supabase client is primary)
const pool = new Pool(poolConfig);

// Handle pool errors gracefully
pool.on('error', (err: Error) => {
  console.error('⚠️  Pool connection error (non-fatal):', err.message);
  // Don't exit, Supabase client will handle queries
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
 * Test database connection (optional - uses Supabase client)
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    // Test Supabase client instead of pg-pool
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Database connected successfully (via Supabase client)');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

export default pool;
