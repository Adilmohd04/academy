/**
 * Database Configuration
 * 
 * Supabase client for all database operations.
 * Configured to handle 10K+ concurrent users efficiently.
 * 
 * NOTE: This file now ONLY exports the Supabase client.
 * The pg-pool has been deprecated in favor of Supabase for:
 * - Built-in connection pooling (PgBouncer)
 * - RLS policy enforcement
 * - Consistent API across the codebase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// In local/dev environments some Windows setups fail TLS chain validation for outbound fetch.
// Allow opt-out via ALLOW_SELF_SIGNED_CERTS=false.
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_SELF_SIGNED_CERTS !== 'false') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('⚠️  Development TLS verification is disabled (NODE_TLS_REJECT_UNAUTHORIZED=0)');
}

// Debug: Log database connection info
console.log('🔍 Database Configuration:');
console.log('  SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('  Service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required Supabase environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

/**
 * Supabase client - PRIMARY database interface
 * Uses service role key for full access (bypasses RLS for admin operations)
 * 
 * For user-scoped operations, create a new client with the user's JWT token
 * 
 * Type safety: Supabase client provides automatic type inference from the database schema.
 * For enhanced type safety, generate types with: npx supabase gen types typescript
 */
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

/**
 * Test database connection using Supabase client
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Database connected successfully (via Supabase client)');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

// --- Compatibility shim for legacy pool.connect() / pool.query() usage ---

export const query = async (text: string, params?: any[]) => {
  const { data, error } = await supabase.rpc('execute_sql', { sql: text, params: params || [] });
  if (error) throw error;
  return { rows: data || [], rowCount: data?.length || 0 };
};

export const getClient = async () => {
  return createCompatibilityClient();
};

const createCompatibilityClient = () => {
  const mockClient = {
    query: async (text: string, params?: any[]) => {
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: text,
        params: params || [],
      });
      if (error) throw error;
      return { rows: data || [], rowCount: data?.length || 0 };
    },
    release: () => {
      // No-op since Supabase manages connections
    }
  };
  return mockClient;
};

const enhancedSupabase = Object.assign(supabase, {
  connect: async () => {
    return createCompatibilityClient();
  },
  query: async (text: string, params?: any[]) => {
    const client = createCompatibilityClient();
    return client.query(text, params);
  }
});

export default enhancedSupabase;
