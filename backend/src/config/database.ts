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

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

let cachedClient: SupabaseClient | null = null;

/**
 * Several Next.js route handlers in ../../frontend import services from this
 * package, so this module is evaluated by `next build` while it collects page
 * data. The Next environment publishes the project URL under the public name,
 * so accept either spelling rather than reporting a configured project as
 * missing.
 */
const resolveCredentials = () => ({
  url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
});

/**
 * Created on first use, not at import time.
 *
 * `createClient` throws when handed an empty URL, so building the client at
 * module scope meant merely importing this file crashed anywhere the
 * environment was not fully configured — which failed the entire production
 * build of the frontend rather than the one request that needed a database.
 */
const resolveSupabaseClient = (): SupabaseClient => {
  if (cachedClient) return cachedClient;

  const { url, serviceRoleKey } = resolveCredentials();

  console.log('🔍 Database Configuration:');
  console.log('  SUPABASE_URL present:', !!url);
  console.log('  Service role key present:', !!serviceRoleKey);

  if (!url || !serviceRoleKey) {
    console.error('❌ Missing required Supabase environment variables');
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });

  return cachedClient;
};

/**
 * Supabase client - PRIMARY database interface
 * Uses service role key for full access (bypasses RLS for admin operations)
 *
 * For user-scoped operations, create a new client with the user's JWT token
 *
 * Exposed as a proxy so every existing `import { supabase }` call site keeps
 * working unchanged while construction stays deferred to first property access.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_target, property) => {
    const client = resolveSupabaseClient() as any;
    const value = client[property];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

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
