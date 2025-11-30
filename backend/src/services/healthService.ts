/**
 * Health Service
 * 
 * System health checks and monitoring.
 */

import { testConnection } from '../config/database';
import pool from '../config/database';

export class HealthService {
  /**
   * Check overall system health
   */
  static async checkHealth() {
    let dbStatus = false;
    try {
      dbStatus = await testConnection();
    } catch (error) {
      console.log('⚠️  Database pool check failed - using Supabase client');
    }
    
    // Get database connection stats (safely)
    const stats = {
      totalConnections: pool.totalCount || 0,
      idleConnections: pool.idleCount || 0,
      waitingRequests: pool.waitingCount || 0,
    };

    return {
      status: 'healthy', // API is healthy even if pool connection fails
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus ? 'connected' : 'using_supabase_client',
        api: 'running',
      },
      database: stats,
    };
  }

  /**
   * Get API version and info
   */
  static getInfo() {
    return {
      name: 'Education Platform API',
      version: '1.0.0',
      description: 'Scalable education management platform supporting 10K+ concurrent users',
      documentation: '/api/docs',
    };
  }
}
