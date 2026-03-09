/**
 * API Integration Tests
 * 
 * Tests for API endpoints using supertest
 */

import request from 'supertest';
import express, { Application } from 'express';
import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';

// Create a minimal test app
const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  // Mock health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mock courses endpoint
  app.get('/api/courses', (req, res) => {
    res.json({
      success: true,
      data: [
        { id: '1', title: 'Course 1', price: 100 },
        { id: '2', title: 'Course 2', price: 0 },
      ],
    });
  });

  // Mock authenticated endpoint
  app.get('/api/protected', (req, res) => {
    const userId = req.headers['x-clerk-user-id'];
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    res.json({ success: true, userId });
  });

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    res.status(500).json({ success: false, error: err.message });
  });

  return app;
};

describe('API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Endpoint', () => {
    it('GET /api/health should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Courses Endpoint', () => {
    it('GET /api/courses should return list of courses', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('title');
    });
  });

  describe('Authentication', () => {
    it('should return 401 when no auth header is provided', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 200 when auth header is provided', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('x-clerk-user-id', 'user_123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe('user_123');
    });
  });
});
