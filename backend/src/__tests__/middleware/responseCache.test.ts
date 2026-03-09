/**
 * Response Cache Middleware Unit Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express, { Application } from 'express';
import request from 'supertest';

// Build a test app with the response cache pattern
function createCachedApp(ttlSeconds = 2) {
  const app = express();
  const cache = new Map<string, { data: any; expiresAt: number }>();

  // Simplified response cache middleware (same logic as responseCache.ts)
  const cacheMiddleware = (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();
    if (req.headers['cache-control'] === 'no-cache') return next();

    const key = `${req.method}:${req.path}`;
    const entry = cache.get(key);

    if (entry && Date.now() < entry.expiresAt) {
      res.set('X-Cache', 'HIT');
      return res.json(entry.data);
    }

    // Monkey-patch res.json to capture the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        cache.set(key, { data: body, expiresAt: Date.now() + ttlSeconds * 1000 });
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };

  let callCount = 0;

  app.get('/api/data', cacheMiddleware, (req, res) => {
    callCount++;
    res.json({ value: callCount });
  });

  app.post('/api/data', (req, res) => {
    res.json({ created: true });
  });

  return { app, getCallCount: () => callCount, cache };
}

describe('Response Cache Middleware', () => {
  it('should cache GET responses and return HIT on subsequent requests', async () => {
    const { app } = createCachedApp(5);

    // First request — MISS
    const r1 = await request(app).get('/api/data').expect(200);
    expect(r1.headers['x-cache']).toBe('MISS');
    expect(r1.body.value).toBe(1);

    // Second request — HIT (same data)
    const r2 = await request(app).get('/api/data').expect(200);
    expect(r2.headers['x-cache']).toBe('HIT');
    expect(r2.body.value).toBe(1); // Cached value, not 2
  });

  it('should not cache POST requests', async () => {
    const { app } = createCachedApp(5);

    const r = await request(app).post('/api/data').expect(200);
    expect(r.headers['x-cache']).toBeUndefined();
  });

  it('should bypass cache when Cache-Control: no-cache is set', async () => {
    const { app, getCallCount } = createCachedApp(5);

    // Prime cache
    await request(app).get('/api/data').expect(200);
    expect(getCallCount()).toBe(1);

    // Bypass with no-cache header
    const r = await request(app)
      .get('/api/data')
      .set('Cache-Control', 'no-cache')
      .expect(200);

    expect(getCallCount()).toBe(2);
    expect(r.body.value).toBe(2);
  });

  it('should expire cached entries after TTL', async () => {
    const { app, getCallCount } = createCachedApp(1); // 1 second TTL

    // Prime cache
    await request(app).get('/api/data').expect(200);
    expect(getCallCount()).toBe(1);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));

    // Should be a MISS now
    const r = await request(app).get('/api/data').expect(200);
    expect(r.headers['x-cache']).toBe('MISS');
    expect(getCallCount()).toBe(2);
  });
});
