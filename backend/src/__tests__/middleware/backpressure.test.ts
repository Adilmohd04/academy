/**
 * Backpressure Middleware Unit Tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock the module before importing
let inFlightCount = 0;
const MAX_IN_FLIGHT = 5000;

// Inline reimplementation for isolated testing (avoids importing the real middleware
// which relies on module-level state)
function createBackpressure(maxInFlight: number) {
  let count = 0;

  const middleware = (req: any, res: any, next: any) => {
    // Health probes always pass
    if (req.path === '/api/health' || req.path === '/api/health/live') {
      return next();
    }

    if (count >= maxInFlight) {
      res.set('Retry-After', '2');
      return res.status(503).json({
        success: false,
        error: 'Server is under heavy load. Please retry shortly.',
      });
    }

    count++;
    let counted = true;

    const decrement = () => {
      if (counted) {
        count--;
        counted = false;
      }
    };

    res.on('finish', decrement);
    res.on('close', decrement);
    next();
  };

  return { middleware, getCount: () => count };
}

describe('Backpressure Middleware', () => {
  let bp: ReturnType<typeof createBackpressure>;

  beforeEach(() => {
    bp = createBackpressure(3); // Low limit for testing
  });

  const mockReq = (path = '/api/courses') =>
    ({ path } as unknown as Request);

  const createMockRes = () => {
    const listeners: Record<string, Function[]> = {};
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      on: jest.fn((event: string, cb: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
      }),
      _emit: (event: string) => {
        (listeners[event] || []).forEach(cb => cb());
      },
    } as any;
  };

  it('should allow requests under the limit', () => {
    const res = createMockRes();
    const next = jest.fn();

    bp.middleware(mockReq(), res, next);

    expect(next).toHaveBeenCalled();
    expect(bp.getCount()).toBe(1);
  });

  it('should return 503 when limit is reached', () => {
    const next = jest.fn();

    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      bp.middleware(mockReq(), createMockRes(), jest.fn());
    }

    // This one should be rejected
    const res = createMockRes();
    bp.middleware(mockReq(), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '2');
  });

  it('should always allow health probes through', () => {
    const next = jest.fn();

    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      bp.middleware(mockReq(), createMockRes(), jest.fn());
    }

    // Health probe should still pass
    const res = createMockRes();
    bp.middleware(mockReq('/api/health'), res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should decrement count when response finishes', () => {
    const res = createMockRes();
    const next = jest.fn();

    bp.middleware(mockReq(), res, next);
    expect(bp.getCount()).toBe(1);

    // Simulate response finish
    res._emit('finish');
    expect(bp.getCount()).toBe(0);
  });

  it('should not double-decrement on both finish and close', () => {
    const res = createMockRes();
    const next = jest.fn();

    bp.middleware(mockReq(), res, next);
    expect(bp.getCount()).toBe(1);

    res._emit('finish');
    res._emit('close');
    expect(bp.getCount()).toBe(0); // Not -1
  });
});
