/**
 * Health Routes
 * 
 * System health check and monitoring endpoints.
 * 
 * Routes:
 * - GET /api/health        - Health check
 * - GET /api/health/info   - API information
 */

import { Router, Request, Response } from 'express';
import { HealthService } from '../services/healthService';

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

export default router;
