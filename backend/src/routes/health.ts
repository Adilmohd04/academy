/**
 * Health Routes
 * 
 * System health check and monitoring endpoints.
 * 
 * Routes:
 * - GET /api/health             - Health check
 * - GET /api/health/info        - API information
 * - GET /api/health/metrics     - Performance metrics (10K+ users)
 */

import { Router, Request, Response } from 'express';
import { HealthService } from '../services/healthService';
import { performanceMonitor } from '../utils/performanceMonitor';
import { cache } from '../utils/cache';

const router = Router();

/**
 * GET /api/health
 * System health check
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await HealthService.checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health,
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      error: error.message,
    });
  }
});

/**
 * GET /api/health/info
 * API information
 */
router.get('/info', (req: Request, res: Response) => {
  const info = HealthService.getInfo();
  res.json({
    success: true,
    ...info,
  });
});

/**
 * GET /api/health/metrics
 * Performance metrics for monitoring 10K+ concurrent users
 */
router.get('/metrics', (req: Request, res: Response) => {
  const perfMetrics = performanceMonitor.getHealthStatus();
  const cacheStats = cache.getStats();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    performance: perfMetrics,
    cache: cacheStats,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  });
});

export default router;
