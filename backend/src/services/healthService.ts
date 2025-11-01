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
    const dbStatus = await testConnection();
    
    // Get database connection stats
    const stats = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
    };

    return {
      status: dbStatus ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
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
