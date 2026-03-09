/**
 * Connection Back-pressure Middleware
 *
 * The #1 reason the server crashed under 10K VUs: Node accepted
 * **every** TCP connection and piled up in-flight requests until
 * the heap OOM-ed.
 *
 * This middleware tracks how many requests are currently in-flight.
 * When that number exceeds the configurable high-water mark the
 * server responds immediately with `503 Service Unavailable` so
 * the client (or load balancer) can retry on another node.
 *
 * This is the same pattern used by Express-based servers at Netflix,
 * Walmart, and other high-traffic Node shops.
 */

import { Request, Response, NextFunction } from 'express';

let inFlight = 0;

// Sensible default: 5 000 concurrent in-flight requests per worker.
// With 8 cluster workers that is ~40 000 across the process group.
const MAX_IN_FLIGHT = parseInt(process.env.MAX_IN_FLIGHT || '5000', 10);

export function backpressureMiddleware(req: Request, res: Response, next: NextFunction) {
  // Never reject health probes (load balancer needs them)
  if (req.path === '/api/health' || req.path === '/api/health/live') {
    return next();
  }

  if (inFlight >= MAX_IN_FLIGHT) {
    res.setHeader('Retry-After', '2');
    return res.status(503).json({
      success: false,
      message: 'Server is under heavy load. Please retry in a moment.',
    });
  }

  inFlight++;
  let counted = true;
  const release = () => { if (counted) { inFlight--; counted = false; } };
  res.on('finish', release);
  res.on('close', release);   // client hung up early

  next();
}

/** Expose for health/metrics endpoints. */
export function getInFlightCount() {
  return inFlight;
}
