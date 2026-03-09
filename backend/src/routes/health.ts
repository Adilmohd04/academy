/**
 * Health Routes
 * 
 * System health check and monitoring endpoints.
 * 
 * Routes:
 * - GET /api/health             - Health check
 * - GET /api/health/info        - API information
 * - GET /api/health/metrics     - Performance metrics (10K+ users)
 * - GET /api/health/live        - Liveness probe (K8s/containers)
 * - GET /api/health/ready       - Readiness probe
 * - GET /api/health/detailed    - Detailed component health
 * - GET /api/health/readiness-report - Production readiness check
 * - GET /api/health/query-stats - Database query performance (dev only)
 * - GET /api/health/cache-stats - Cache statistics (dev only)
 */

import { Router, Request, Response } from 'express';
import { HealthService } from '../modules/shared/services/healthService';
import { performanceMonitor } from '../utils/performanceMonitor';
import { cache } from '../utils/cache';
import { supabase } from '../config/database';
import { getQueryStats, resetQueryStats } from '../lib/queryLogger';
import { apiCache, courseCache, userCache } from '../lib/cache';
import { runReadinessChecks, formatReport } from '../lib/productionReadiness';

const router = Router();

/**
 * GET /api/health
 * System health check — MUST be ultra-fast (no DB, no I/O)
 * This endpoint is hammered hardest under load and by health probes.
 */
const healthPayload = {
  success: true,
  status: 'healthy',
  services: { api: 'running' },
};
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ ...healthPayload, timestamp: new Date().toISOString() });
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

/**
 * GET /api/health/live
 * Liveness probe for Kubernetes/container orchestrators
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ alive: true, timestamp: new Date().toISOString() });
});

/**
 * GET /api/health/ready
 * Readiness probe - checks if app can serve traffic
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
    if (error) {
      return res.status(503).json({ 
        ready: false, 
        reason: 'Database unavailable',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({ 
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch {
    return res.status(503).json({ 
      ready: false, 
      reason: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/detailed
 * Detailed component health check
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const components: Array<{name: string; status: string; latency?: number; message?: string}> = [];
  
  // Check database
  try {
    const start = Date.now();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const latency = Date.now() - start;
    
    components.push({
      name: 'database',
      status: error ? 'unhealthy' : 'healthy',
      latency,
      message: error?.message,
    });
  } catch (error) {
    components.push({
      name: 'database',
      status: 'unhealthy',
      message: (error as Error).message,
    });
  }

  // Check new cache layer
  try {
    const testKey = '__health_check__';
    apiCache.set(testKey, 'ok', 1);
    const value = apiCache.get(testKey);
    
    components.push({
      name: 'cache_layer',
      status: value === 'ok' ? 'healthy' : 'unhealthy',
    });
  } catch (error) {
    components.push({
      name: 'cache_layer',
      status: 'unhealthy',
      message: (error as Error).message,
    });
  }

  const unhealthyCount = components.filter(c => c.status === 'unhealthy').length;
  const status = unhealthyCount === 0 ? 'healthy' : unhealthyCount === components.length ? 'unhealthy' : 'degraded';

  res.status(status === 'unhealthy' ? 503 : 200).json({
    success: status !== 'unhealthy',
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    components,
  });
});

/**
 * GET /api/health/readiness-report
 * Production readiness check with comprehensive validation
 */
router.get('/readiness-report', async (req: Request, res: Response) => {
  try {
    const report = await runReadinessChecks();
    
    if (req.query.format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      return res.send(formatReport(report));
    }

    return res.status(report.ready ? 200 : 503).json(report);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to run readiness checks',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/health/query-stats
 * Database query performance stats (non-production only)
 */
router.get('/query-stats', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  return res.status(200).json(getQueryStats());
});

/**
 * POST /api/health/query-stats/reset
 * Reset query stats (non-production only)
 */
router.post('/query-stats/reset', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  resetQueryStats();
  return res.status(200).json({ message: 'Stats reset' });
});

/**
 * GET /api/health/cache-stats
 * Cache statistics (non-production only)
 */
router.get('/cache-stats', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  return res.status(200).json({
    apiCache: apiCache.stats(),
    courseCache: courseCache.stats(),
    userCache: userCache.stats(),
    legacyCache: cache.getStats(),
  });
});

/**
 * POST /api/health/cache/clear
 * Clear all caches (non-production only)
 */
router.post('/cache/clear', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  apiCache.clear();
  courseCache.clear();
  userCache.clear();

  return res.status(200).json({ message: 'All caches cleared' });
});

export default router;
