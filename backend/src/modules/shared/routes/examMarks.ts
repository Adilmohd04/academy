/**
 * Exam Marks Routes
 * 
 * Routes for admin exam marks management
 */

import { Router } from 'express';
import * as examMarksController from '../controllers/examMarksController';
import { requireAuth as authenticate, requireRole } from '../../../middleware/clerkAuth';

// Helper to match existing route pattern
const authorizeRole = (roles: string[]) => requireRole(roles);

const router = Router();

// ============================================
// STUDENT ENDPOINTS
// ============================================

/**
 * Get my exam marks (student view)
 * GET /api/exam-marks/my
 * 
 * Query params:
 *   - courseId: Optional filter by course
 */
router.get('/my', authenticate, examMarksController.getMyExamMarks);

// ============================================
// EXAM SESSION MANAGEMENT (Admin/Teacher)
// ============================================

/**
 * Create exam session for a course
 * POST /api/exam-marks/courses/:courseId/sessions
 * 
 * Body: { title, description?, exam_date, exam_type, total_marks, passing_marks, duration_minutes?, venue? }
 */
router.post(
  '/courses/:courseId/sessions',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.createExamSession
);

/**
 * Get all exam sessions for a course
 * GET /api/exam-marks/courses/:courseId/sessions
 */
router.get(
  '/courses/:courseId/sessions',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.getCourseExamSessions
);

/**
 * Get exam session by ID
 * GET /api/exam-marks/sessions/:sessionId
 */
router.get(
  '/sessions/:sessionId',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.getExamSession
);

/**
 * Update exam session status
 * PATCH /api/exam-marks/sessions/:sessionId/status
 * 
 * Body: { status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' }
 */
router.patch(
  '/sessions/:sessionId/status',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.updateExamSessionStatus
);

// ============================================
// MARKS ENTRY (Admin/Teacher)
// ============================================

/**
 * Get students for marks entry
 * GET /api/exam-marks/sessions/:sessionId/students
 * 
 * Returns marked and unmarked students
 */
router.get(
  '/sessions/:sessionId/students',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.getStudentsForMarksEntry
);

/**
 * Get all marks for a session
 * GET /api/exam-marks/sessions/:sessionId/marks
 */
router.get(
  '/sessions/:sessionId/marks',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.getExamSessionMarks
);

/**
 * Enter marks for a single student
 * POST /api/exam-marks/sessions/:sessionId/students/:studentId/marks
 * 
 * Body: { marks_obtained, remarks?, attendance_status? }
 */
router.post(
  '/sessions/:sessionId/students/:studentId/marks',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.enterStudentMarks
);

/**
 * Bulk enter marks for multiple students
 * POST /api/exam-marks/sessions/:sessionId/marks/bulk
 * 
 * Body: { marks: [{ student_id, marks_obtained, remarks?, attendance_status? }] }
 */
router.post(
  '/sessions/:sessionId/marks/bulk',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.bulkEnterMarks
);

// ============================================
// VERIFICATION (Admin Only)
// ============================================

/**
 * Verify single mark entry
 * POST /api/exam-marks/marks/:marksId/verify
 */
router.post(
  '/marks/:marksId/verify',
  authenticate,
  authorizeRole(['admin']),
  examMarksController.verifyMarks
);

/**
 * Bulk verify all marks in a session
 * POST /api/exam-marks/sessions/:sessionId/verify-all
 */
router.post(
  '/sessions/:sessionId/verify-all',
  authenticate,
  authorizeRole(['admin']),
  examMarksController.bulkVerifyMarks
);

// ============================================
// SYNC & EXPORT (Admin Only)
// ============================================

/**
 * Sync marks to grades table (for final grade calculation)
 * POST /api/exam-marks/sessions/:sessionId/sync-grades
 */
router.post(
  '/sessions/:sessionId/sync-grades',
  authenticate,
  authorizeRole(['admin']),
  examMarksController.syncMarksToGrades
);

/**
 * Export marks as CSV
 * GET /api/exam-marks/sessions/:sessionId/export
 */
router.get(
  '/sessions/:sessionId/export',
  authenticate,
  authorizeRole(['admin', 'teacher']),
  examMarksController.exportMarks
);

export default router;
