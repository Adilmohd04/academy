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
import type { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

import config from './config/env';
import { testConnection } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { backpressureMiddleware } from './middleware/backpressure';
import { responseCacheMiddleware } from './middleware/responseCache';
import { performanceMonitor } from './utils/performanceMonitor';

// Import routes
import healthRoutes from './routes/health';
import userRoutes from './routes/users';
import webhookRoutes from './routes/webhooks';
import courseRoutes from './routes/courses';
import courseContentRoutes from './routes/courseContent';
import courseProgressRoutes from './routes/courseProgress';
import enrollmentRoutes from './routes/enrollments';
import meetingRoutes from './routes/meetings';
import timeSlotRoutes from './routes/timeSlots';
import paymentRoutes from './routes/payments';
import settingsRoutes from './routes/settings';
import teacherAvailabilityRoutes from './routes/teacherAvailability';
import teacherPricingRoutes from './routes/teacherPricing';
import boxRoutes from './routes/boxes';
import announcementRoutes from './routes/announcements';
import resourceRoutes from './routes/resources';
import discussionRoutes from './routes/discussions';
import adminRoutes from './routes/admin';
import adminCourseRoutes from './routes/adminCourses';
import teacherCourseManagementRoutes from './routes/teacherCourseManagement';
import teacherCoursesRoutes from './routes/teacherCourses';
import courseSectionsRoutes from './routes/courseSections';
import leaderboardRoutes from './routes/leaderboard';
import discussionPortalRoutes from './routes/discussionPortal';
import quizRoutes from './routes/quizzes';
import assignmentRoutes from './routes/assignments';
import finalExamRoutes from './routes/finalExams';
import certificateRoutes from './routes/certificates';
import examMarksRoutes from './modules/shared/routes/examMarks';
import weekDraftRoutes from './modules/shared/routes/weekDraft';
import liveClassesRoutes from './modules/shared/routes/liveClasses';
import notificationRoutes from './routes/notifications';
import teacherAutosaveRoutes from './routes/teacherAutosave';
import teacherAnalyticsRoutes from './routes/teacherAnalytics';
import courseWeeksRoutes from './routes/courseWeeks';
import languageRoutes from './routes/language';
import userPreferenceRoutes from './routes/user';
import studentExamRoutes from './routes/studentExam';
import notificationCenterRoutes from './routes/notificationCenter';
import teacherStudentsRoutes from './routes/teacherStudents';
import teacherStudentManagementRoutes from './routes/teacherStudentManagement';
import studentTrackingRoutes from './routes/studentTracking';
import studentCourseRoutes from './modules/student/routes/studentCourseRoutes';
import teacherGradesRoutes from './routes/teacherGrades';
import studentGradesRoutes from './routes/studentGrades';

// Import notification job
import { startClassNotificationJob } from './jobs/classNotifications';
import { verifyEmailConfig } from './services/emailNotifications';

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
    // Trust reverse proxies (required for accurate IP/rate-limit in production)
    this.app.set('trust proxy', 1);

    // Remove identifying header
    this.app.disable('x-powered-by');

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
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-clerk-user-id', 'Cache-Control', 'If-None-Match'],
      })
    );

    // Body parsing (bounded payloads to reduce memory pressure under heavy traffic)
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Compression for responses
    this.app.use(compression());

    // ── Back-pressure: reject excess requests before they pile up ──
    this.app.use(backpressureMiddleware);

    // Performance monitoring
    this.app.use(performanceMonitor.middleware());

    // Request logging (skip in production to save CPU under load)
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      // Minimal logging in production – only non-2xx responses
      this.app.use(morgan('combined', {
        skip: (_req, res) => res.statusCode < 400,
      }));
    }

    // Webhooks (before rate limiting)
    this.app.use('/api/webhooks', webhookRoutes);

    // Rate limiting for API protection
    this.app.use('/api/', apiLimiter);

    // ── Response cache for hot public endpoints (5 s TTL) ──
    this.app.use('/api/health', responseCacheMiddleware(5));
    this.app.use('/api/courses', responseCacheMiddleware(10));
  }

  /**
   * Initialize all routes
   */
  private initializeRoutes(): void {
    // Root endpoint (ultra-light, cached in-memory)
    const rootPayload = {
      success: true,
      message: 'Education Platform API',
      version: '1.0.0',
      documentation: '/api/health/info',
    };
    this.app.get('/', (_req, res) => {
      res.json(rootPayload);
    });

    // API routes
    this.app.use('/api/health', healthRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api', courseRoutes);
    this.app.use('/api', courseContentRoutes);
    this.app.use('/api', courseProgressRoutes);
    this.app.use('/api', enrollmentRoutes);
    this.app.use('/api', meetingRoutes);
    this.app.use('/api', timeSlotRoutes);
    this.app.use('/api', paymentRoutes);
    this.app.use('/api/settings', settingsRoutes);
    this.app.use('/api/teacher', teacherAvailabilityRoutes);
    this.app.use('/api/teacher-pricing', teacherPricingRoutes);
    this.app.use('/api/boxes', boxRoutes);
    this.app.use('/api', announcementRoutes);
    this.app.use('/api', resourceRoutes);
    this.app.use('/api', discussionRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/admin', adminCourseRoutes);
    this.app.use('/api/teacher', teacherCourseManagementRoutes);
    this.app.use('/api/teacher', teacherCoursesRoutes);
    this.app.use('/api', leaderboardRoutes);
    this.app.use('/api', discussionPortalRoutes);
    this.app.use('/api', quizRoutes);
    this.app.use('/api', assignmentRoutes);
    this.app.use('/api', finalExamRoutes);
    this.app.use('/api', certificateRoutes);
    this.app.use('/api/exam-marks', examMarksRoutes);
    this.app.use('/api/drafts', weekDraftRoutes);
    this.app.use('/api/live-classes', liveClassesRoutes);
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/teacher', teacherAutosaveRoutes);
    this.app.use('/api/teacher', teacherAnalyticsRoutes);
    this.app.use('/api', courseWeeksRoutes);
    this.app.use('/api', languageRoutes);
    this.app.use('/api/user', userPreferenceRoutes);
    this.app.use('/api/student', studentExamRoutes);
    this.app.use('/api/notification-center', notificationCenterRoutes);
    // this.app.use('/api/teacher', teacherStudentsRoutes); // ❌ DISABLED: Old route with pg-pool, conflicts with comprehensive tracking below
    this.app.use('/api', teacherStudentManagementRoutes); // ✅ Comprehensive student tracking with grades
    this.app.use('/api', studentTrackingRoutes); // ✅ Detailed per-student tracking (quiz attempts, assignment submissions)
    this.app.use('/api', enrollmentRoutes);
    this.app.use('/api', courseSectionsRoutes);
    this.app.use('/api/student', studentCourseRoutes);
    this.app.use('/api/teacher', teacherGradesRoutes);
    this.app.use('/api/student', studentGradesRoutes);

    // TODO: Add more routes as features are developed
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
  public async listen(): Promise<Server> {
    try {
      // Test database connection (optional - won't block startup)
      console.log('🔍 Testing database connection...');
      console.log('⚠️  Skipping pool connection test - using Supabase client');
      
      // Verify email configuration and start notification job
      console.log('📧 Verifying email configuration...');
      const emailReady = await verifyEmailConfig();
      if (emailReady) {
        console.log('✅ Email service is ready');
        console.log('🔔 Class notification job disabled - "classes" table not in schema');
        // startClassNotificationJob(); // Disabled - classes table doesn't exist in current schema
      } else {
        console.warn('⚠️  Email service not configured properly - notifications disabled');
        console.warn('   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable');
      }
      
      // Start server with a large TCP listen backlog (default 511 is too low for 10K)
      const LISTEN_BACKLOG = 8192;
      const server = this.app.listen(config.port, '0.0.0.0', LISTEN_BACKLOG, () => {
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
        console.log(`   POST   http://localhost:${config.port}/api/notifications/test`);
        console.log(`   POST   http://localhost:${config.port}/api/notifications/class-reminder`);
        console.log('');
      });

      // Runtime socket tuning for high traffic
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;
      server.requestTimeout = 30000;
      server.maxHeadersCount = 1000;
      // Allow up to 16K simultaneous connections per worker
      server.maxConnections = 16384;
      (server as any).maxRequestsPerSocket = 0; // unlimited

      return server;
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

export default App;
