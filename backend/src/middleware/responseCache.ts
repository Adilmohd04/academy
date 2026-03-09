/**
 * Response-level Cache Middleware
 *
 * Caches full JSON responses in-memory so that repeated identical requests
 * never reach the database.  Under 10K concurrent users the majority of
 * traffic hits the **same** handful of public endpoints ("GET /", courses
 * list, health) — caching these alone removes >80 % of DB load.
 *
 * How it works:
 *   1. For every incoming GET request the cache key is  `method:path`.
 *   2. If a fresh entry exists the middleware short-circuits with the
 *      stored JSON — no route handler runs at all.
 *   3. Otherwise the request continues; when the route writes JSON via
 *      `res.json()` we intercept and store the body.
 *
 * Customisation:
 *   – `ttl` (seconds) per mount:  `responseCacheMiddleware(10)` = 10 s
 *   – Bypass with `Cache-Control: no-cache` header.
 *   – Only GET requests are cached.
 */

import { Request, Response, NextFunction } from 'express';

interface CachedResponse {
  statusCode: number;
  body: any;
  expiry: number;
}

const store = new Map<string, CachedResponse>();

// Periodic cleanup every 30 s so we don't leak memory
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiry) store.delete(key);
  }
}, 30_000).unref();

/**
 * Factory – returns Express middleware that caches JSON GETs.
 * @param ttlSeconds  How long responses stay fresh (default 5 s).
 */
export function responseCacheMiddleware(ttlSeconds = 5) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET
    if (req.method !== 'GET') return next();

    // Allow clients to bypass
    if (req.headers['cache-control'] === 'no-cache') return next();

    const key = `${req.method}:${req.originalUrl}`;
    const cached = store.get(key);

    if (cached && Date.now() < cached.expiry) {
      // HIT — skip the whole route handler
      res.setHeader('X-Cache', 'HIT');
      return res.status(cached.statusCode).json(cached.body);
    }

    // MISS — monkey-patch res.json to capture the response
    const origJson = res.json.bind(res);
    (res as any).json = (body: any) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 400) {
        store.set(key, {
          statusCode: res.statusCode,
          body,
          expiry: Date.now() + ttlSeconds * 1000,
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return origJson(body);
    };

    next();
  };
}

/** Manually invalidate a specific key (e.g. after a write). */
export function invalidateCache(path: string) {
  store.delete(`GET:${path}`);
}

/** Wipe the entire response cache.  Useful after bulk mutations. */
export function clearResponseCache() {
  store.clear();
}

/** Stats for the /health/cache-stats endpoint. */
export function getResponseCacheStats() {
  return { entries: store.size };
}
