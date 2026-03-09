/**
 * Rate Limiter Middleware Unit Tests
 */

import { describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

// Create a test app with rate limiting similar to our config
function createRateLimitedApp() {
  const app = express();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // Low limit for testing
    skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests' },
  });

  app.use(limiter);

  app.get('/api/data', (req, res) => {
    res.json({ success: true });
  });

  app.post('/api/data', (req, res) => {
    res.json({ success: true });
  });

  return app;
}

describe('Rate Limiter', () => {
  it('should skip rate limiting for GET requests', async () => {
    const app = createRateLimitedApp();

    // Make many GET requests — all should succeed
    for (let i = 0; i < 10; i++) {
      await request(app).get('/api/data').expect(200);
    }
  });

  it('should rate limit POST requests', async () => {
    const app = createRateLimitedApp();

    // Make POST requests up to the limit
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/data').expect(200);
    }

    // Next POST should be rate limited
    const r = await request(app).post('/api/data');
    expect(r.status).toBe(429);
  });
});
