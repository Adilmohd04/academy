/**
 * Live Classes Routes
 * 
 * Routes for live class management and views
 */

import { Router } from 'express';
import * as liveClassesController from '../controllers/liveClassesController';
import { requireAuth as authenticate, requireRole } from '../../../middleware/clerkAuth';

// Helper to match existing route pattern
const authorizeRole = (roles: string[]) => requireRole(roles);

const router = Router();

// ============================================
// STUDENT ENDPOINTS
// ============================================

/**
 * Get my classes categorized (upcoming, live, completed)
 * GET /api/live-classes/my
 * 
 * Query params:
 *   - courseId: Filter by course
 *   - limit: Limit per category (default 10)
 */
router.get('/my', authenticate, liveClassesController.getMyClassesCategorized);

/**
 * Get currently live classes
 * GET /api/live-classes/my/live
 */
router.get('/my/live', authenticate, liveClassesController.getMyLiveClasses);

/**
 * Get next upcoming class
 * GET /api/live-classes/my/next
 */
router.get('/my/next', authenticate, liveClassesController.getNextUpcomingClass);

/**
 * Get completed classes with recordings
 * GET /api/live-classes/my/recordings
 * 
 * Query params:
 *   - courseId: Filter by course
 *   - limit: Number of results (default 20)
 */
router.get('/my/recordings', authenticate, liveClassesController.getCompletedWithRecordings);

/**
 * Join a live class (record attendance)
 * POST /api/live-classes/:scheduleId/join
 */
router.post('/:scheduleId/join', authenticate, liveClassesController.joinLiveClass);

// ============================================
// COURSE-SPECIFIC ENDPOINTS
// ============================================

/**
 * Get upcoming classes for a course
 * GET /api/live-classes/courses/:courseId/upcoming
 */
router.get('/courses/:courseId/upcoming', authenticate, liveClassesController.getCourseUpcomingClasses);

// ============================================
// TEACHER ENDPOINTS
// ============================================

/**
 * Get teacher's upcoming classes
 * GET /api/live-classes/teacher/upcoming
 * 
 * Query params:
 *   - days: Number of days to look ahead (default 7)
 */
router.get(
  '/teacher/upcoming',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  liveClassesController.getTeacherUpcomingClasses
);

/**
 * Get teacher's classes for today
 * GET /api/live-classes/teacher/today
 */
router.get(
  '/teacher/today',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  liveClassesController.getTeacherTodayClasses
);

/**
 * Start a live class
 * POST /api/live-classes/:scheduleId/start
 */
router.post(
  '/:scheduleId/start',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  liveClassesController.startLiveClass
);

/**
 * End a live class
 * POST /api/live-classes/:scheduleId/end
 * 
 * Body: { recording_url? }
 */
router.post(
  '/:scheduleId/end',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  liveClassesController.endLiveClass
);

/**
 * Get class attendance report
 * GET /api/live-classes/:scheduleId/attendance
 */
router.get(
  '/:scheduleId/attendance',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  liveClassesController.getClassAttendance
);

// ============================================
// CALENDAR ENDPOINTS
// ============================================

/**
 * Get classes for calendar view
 * GET /api/live-classes/calendar
 * 
 * Query params:
 *   - year: Year (default current)
 *   - month: Month 1-12 (default current)
 */
router.get('/calendar', authenticate, liveClassesController.getCalendarClasses);

export default router;
