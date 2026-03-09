/**
 * Rate Limiting Middleware
 * 
 * Protects API from abuse and ensures fair usage for 10K+ concurrent users.
 * 
 * Tuning notes (10 K VU target):
 *   - Each browser tab fires ~60 req / min, so 1 real user ≈ 900 req in 15 min.
 *   - Behind NAT / corporate proxy many users share one IP.
 *   - We set a generous per-IP cap and rely on auth + DB-level ACLs for abuse.
 */

import rateLimit from 'express-rate-limit';
import config from '../config/env';

/**
 * General API rate limiter
 *
 * Strategy for 10K concurrent users:
 *   - All GET requests are skipped — they're served from the response
 *     cache or backpressure-guarded already.  Rate-limiting GETs would
 *     only block legitimate readers behind shared IPs.
 *   - Mutating requests (POST/PUT/PATCH/DELETE) are capped at 5 000
 *     per IP per 15 min, which is extremely generous for a single user
 *     yet still protects against write-amplification attacks.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,         // 15 minutes
  max: 5_000,                                 // per IP, writes only
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,                   // ← was 5; too tight for Clerk webhook retries
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,                   // ← was 10; teachers uploading course material
  message: {
    success: false,
    message: 'Upload limit reached, please try again later.',
  },
});
