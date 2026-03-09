/**
 * Database Performance Logger
 * 
 * Wraps Supabase client to log slow queries and help identify performance issues
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface QueryLog {
  table: string;
  operation: string;
  duration: number;
  timestamp: Date;
  slow: boolean;
}

const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
const queryLogs: QueryLog[] = [];
const MAX_LOGS = 1000;

/**
 * Log a query execution
 */
export const logQuery = (table: string, operation: string, duration: number): void => {
  const log: QueryLog = {
    table,
    operation,
    duration,
    timestamp: new Date(),
    slow: duration > SLOW_QUERY_THRESHOLD_MS,
  };

  queryLogs.push(log);
  
  // Keep only recent logs
  if (queryLogs.length > MAX_LOGS) {
    queryLogs.shift();
  }

  // Log slow queries to console
  if (log.slow) {
    console.warn(`⚠️ SLOW QUERY: ${operation} on ${table} took ${duration}ms`);
  }
};

/**
 * Get query statistics
 */
export const getQueryStats = () => {
  const totalQueries = queryLogs.length;
  const slowQueries = queryLogs.filter(q => q.slow).length;
  const avgDuration = totalQueries > 0 
    ? queryLogs.reduce((sum, q) => sum + q.duration, 0) / totalQueries 
    : 0;

  // Group by table
  const byTable: Record<string, { count: number; totalTime: number; slowCount: number }> = {};
  queryLogs.forEach(q => {
    if (!byTable[q.table]) {
      byTable[q.table] = { count: 0, totalTime: 0, slowCount: 0 };
    }
    byTable[q.table].count++;
    byTable[q.table].totalTime += q.duration;
    if (q.slow) byTable[q.table].slowCount++;
  });

  return {
    totalQueries,
    slowQueries,
    avgDuration: Math.round(avgDuration),
    slowQueryPercentage: totalQueries > 0 ? ((slowQueries / totalQueries) * 100).toFixed(2) : '0',
    byTable,
    recentSlowQueries: queryLogs.filter(q => q.slow).slice(-10),
  };
};

/**
 * Clear query logs
 */
export const clearQueryLogs = (): void => {
  queryLogs.length = 0;
};

/**
 * Reset query statistics (alias for clearQueryLogs)
 */
export const resetQueryStats = clearQueryLogs;

/**
 * Create a wrapped Supabase client that logs queries
 * Usage: const db = createInstrumentedClient(supabase);
 */
export const createInstrumentedClient = (client: SupabaseClient) => {
  const originalFrom = client.from.bind(client);

  const instrumentedFrom = (table: string) => {
    const builder = originalFrom(table);
    const startTime = Date.now();

    // Wrap the common query methods
    const methods = ['select', 'insert', 'update', 'delete', 'upsert'] as const;
    
    methods.forEach(method => {
      const original = (builder as any)[method];
      if (typeof original === 'function') {
        (builder as any)[method] = (...args: any[]) => {
          const result = original.apply(builder, args);
          
          // Wrap the terminal methods that execute the query
          const terminalMethods = ['single', 'maybeSingle', 'then'];
          terminalMethods.forEach(terminal => {
            const originalTerminal = (result as any)[terminal];
            if (typeof originalTerminal === 'function') {
              (result as any)[terminal] = (...terminalArgs: any[]) => {
                const promise = originalTerminal.apply(result, terminalArgs);
                
                if (promise && typeof promise.then === 'function') {
                  return promise.then((res: any) => {
                    logQuery(table, method, Date.now() - startTime);
                    return res;
                  }).catch((err: any) => {
                    logQuery(table, `${method}:error`, Date.now() - startTime);
                    throw err;
                  });
                }
                
                return promise;
              };
            }
          });
          
          return result;
        };
      }
    });

    return builder;
  };

  return {
    ...client,
    from: instrumentedFrom,
  } as SupabaseClient;
};

/**
 * Express middleware to expose query stats endpoint
 */
export const queryStatsMiddleware = (req: any, res: any, next: any) => {
  if (req.path === '/api/debug/query-stats' && process.env.NODE_ENV !== 'production') {
    return res.json(getQueryStats());
  }
  next();
};
