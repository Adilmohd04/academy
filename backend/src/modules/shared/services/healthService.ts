/**
 * Health Service
 * 
 * System health checks and monitoring.
 */

import { supabase } from '../../../config/database';

export class HealthService {
  /**
   * Check overall system health
   */
  static async checkHealth() {
    let dbStatus = false;
    try {
      // Test Supabase connection with a simple query
      const { error } = await supabase.from('profiles').select('id').limit(1);
      dbStatus = !error;
    } catch (error) {
      console.log('⚠️  Database connection check failed');
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus ? 'connected' : 'disconnected',
        api: 'running',
      },
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
