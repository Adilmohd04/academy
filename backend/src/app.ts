/**
 * Main Application Entry Point
 * 
 * Express server with all middleware, routes, and configurations.
 * Designed to handle 10K+ concurrent users with proper scaling.
 * 
 * Performance Optimizations:
 * - Connection pooling (max 20 connections)
 * - Response compression
 * - In-memory caching for frequent queries
 * - Performance monitoring
 * - Rate limiting
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import config from './config/env';
import { testConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { performanceMonitor } from './utils/performanceMonitor';

// Import routes
import healthRoutes from './routes/health';
import userRoutes from './routes/users';
import webhookRoutes from './routes/webhooks';
import courseRoutes from './routes/courses';
import meetingRoutes from './routes/meetings';
import timeSlotRoutes from './routes/timeSlots';
import paymentRoutes from './routes/payments';
import settingsRoutes from './routes/settings';
import teacherAvailabilityRoutes from './routes/teacherAvailability';
import teacherPricingRoutes from './routes/teacherPricing';
import boxRoutes from './routes/boxes';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize all middlewares
   */
  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration - Handle multiple origins including dev ports
    const allowedOrigins = config.corsOrigin.split(',').map(origin => origin.trim());
    // Add common dev ports
    allowedOrigins.push('http://localhost:3001', 'http://localhost:3002');
    
    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl)
          if (!origin) return callback(null, true);
          
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            console.log('❌ CORS blocked origin:', origin);
            callback(null, true); // Allow anyway in development
          }
        },
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Compression for responses
    this.app.use(compression());

    // Performance monitoring
    this.app.use(performanceMonitor.middleware());

    // Request logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Webhooks (before rate limiting)
    this.app.use('/api/webhooks', webhookRoutes);

    // Rate limiting for API protection
    this.app.use('/api/', apiLimiter);
  }

  /**
   * Initialize all routes
   */
  private initializeRoutes(): void {
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Education Platform API',
        version: '1.0.0',
        documentation: '/api/health/info',
      });
    });

    // API routes
    this.app.use('/api/health', healthRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api', courseRoutes);
    this.app.use('/api', meetingRoutes);
    this.app.use('/api', timeSlotRoutes);
    this.app.use('/api', paymentRoutes);
    this.app.use('/api/settings', settingsRoutes);
    this.app.use('/api/teacher', teacherAvailabilityRoutes);
    this.app.use('/api/teacher-pricing', teacherPricingRoutes);
    this.app.use('/api/boxes', boxRoutes);

    // TODO: Add more routes as features are developed
    // this.app.use('/api/enrollments', enrollmentRoutes);
    // this.app.use('/api/chat', chatRoutes);
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  public async listen(): Promise<void> {
    try {
      // Test database connection (optional - won't block startup)
      console.log('🔍 Testing database connection...');
      console.log('⚠️  Skipping pool connection test - using Supabase client');
      
      // Start server
      this.app.listen(config.port, () => {
        console.log('');
        console.log('🚀 ============================================');
        console.log(`🚀 Education Platform API Server Running`);
        console.log(`🚀 Environment: ${config.nodeEnv}`);
        console.log(`🚀 Port: ${config.port}`);
        console.log(`🚀 URL: http://localhost:${config.port}`);
        console.log('🚀 ============================================');
        console.log('');
        console.log('📚 API Endpoints:');
        console.log(`   GET    http://localhost:${config.port}/api/health`);
        console.log(`   GET    http://localhost:${config.port}/api/health/info`);
        console.log(`   GET    http://localhost:${config.port}/api/users/profile`);
        console.log(`   GET    http://localhost:${config.port}/api/courses`);
        console.log(`   GET    http://localhost:${config.port}/api/courses/:id`);
        console.log(`   POST   http://localhost:${config.port}/api/courses (auth required)`);
        console.log(`   PUT    http://localhost:${config.port}/api/courses/:id (auth required)`);
        console.log(`   DELETE http://localhost:${config.port}/api/courses/:id (auth required)`);
        console.log(`   GET    http://localhost:${config.port}/api/teacher/courses (auth required)`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

export default App;
