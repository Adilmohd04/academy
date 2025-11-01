/**
 * Main Application Entry Point
 * 
 * Express server with all middleware, routes, and configurations.
 * Designed to handle 10K+ concurrent users with proper scaling.
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

// Import routes
import healthRoutes from './routes/health';
import userRoutes from './routes/users';

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

    // CORS configuration
    this.app.use(
      cors({
        origin: config.corsOrigin,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Compression for responses
    this.app.use(compression());

    // Request logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

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

    // TODO: Add more routes as features are developed
    // this.app.use('/api/courses', courseRoutes);
    // this.app.use('/api/enrollments', enrollmentRoutes);
    // this.app.use('/api/payments', paymentRoutes);
    // this.app.use('/api/meetings', meetingRoutes);
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
      // Test database connection
      console.log('🔍 Testing database connection...');
      const dbConnected = await testConnection();

      if (!dbConnected) {
        console.warn('⚠️  Warning: Database connection failed. Server will start but may not function properly.');
      }

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
        console.log(`   GET  http://localhost:${config.port}/api/health`);
        console.log(`   GET  http://localhost:${config.port}/api/health/info`);
        console.log(`   GET  http://localhost:${config.port}/api/users/profile`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

export default App;
