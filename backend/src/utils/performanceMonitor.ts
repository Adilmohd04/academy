/**
 * Performance Monitoring Utility
 * 
 * Tracks response times, database queries, and system metrics.
 * Essential for maintaining performance with 10K+ concurrent users.
 */

import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  totalRequests: number;
  averageResponseTime: number;
  slowestEndpoints: Map<string, number>;
  activeConnections: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    averageResponseTime: 0,
    slowestEndpoints: new Map(),
    activeConnections: 0,
  };

  private responseTimes: number[] = [];

  /**
   * Express middleware to track request performance
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      this.metrics.activeConnections++;

      // Capture response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        this.recordMetric(req.path, duration);
        this.metrics.activeConnections--;
      });

      next();
    };
  }

  /**
   * Record a metric
   */
  private recordMetric(endpoint: string, duration: number) {
    this.metrics.totalRequests++;
    this.responseTimes.push(duration);

    // Keep only last 1000 response times to avoid memory bloat
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    // Update average
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.responseTimes.length;

    // Track slowest endpoints
    const currentSlowest = this.metrics.slowestEndpoints.get(endpoint) || 0;
    if (duration > currentSlowest) {
      this.metrics.slowestEndpoints.set(endpoint, duration);
    }

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️  Slow request detected: ${endpoint} took ${duration}ms`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealthStatus(): { status: string; metrics: PerformanceMetrics } {
    const avgTime = this.metrics.averageResponseTime;
    let status = 'healthy';

    if (avgTime > 1000) {
      status = 'degraded';
    } else if (avgTime > 500) {
      status = 'warning';
    }

    return {
      status,
      metrics: this.getMetrics(),
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      averageResponseTime: 0,
      slowestEndpoints: new Map(),
      activeConnections: 0,
    };
    this.responseTimes = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
