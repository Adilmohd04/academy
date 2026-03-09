/**
 * Student Final Exam Routes
 */

import express from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as studentExamController from '../modules/student/controllers/studentExamController';
import * as studentGradeDashboardController from '../modules/student/controllers/studentGradeDashboardController';
import * as studentResourceController from '../modules/student/controllers/studentResourceController';
import * as paymentController from '../modules/student/controllers/paymentController';

const router = express.Router();

const authRequired = [requireAuth];

// ==========================================
// STUDENT EXAM ROUTES
// ==========================================

/**
 * GET /api/student/exams/available
 * Get all available exams for enrolled courses
 */
router.get('/exams/available', ...authRequired, studentExamController.getAvailableExams);

/**
 * GET /api/student/exams/:examId
 * Get exam details (questions without answers)
 */
router.get('/exams/:examId', ...authRequired, studentExamController.getExamDetails);

/**
 * POST /api/student/exams/:examId/start
 * Start exam attempt (creates submission)
 */
router.post('/exams/:examId/start', ...authRequired, studentExamController.startExam);

/**
 * POST /api/student/exam-submissions/:submissionId/answers
 * Auto-save answer (called every 30 seconds)
 */
router.post('/exam-submissions/:submissionId/answers', ...authRequired, studentExamController.saveAnswer);

/**
 * POST /api/student/exam-submissions/:submissionId/submit
 * Submit exam (final submission)
 */
router.post('/exam-submissions/:submissionId/submit', ...authRequired, studentExamController.submitExam);

/**
 * GET /api/student/exam-submissions/:submissionId/results
 * Get submission results
 */
router.get('/exam-submissions/:submissionId/results', ...authRequired, studentExamController.getSubmissionResults);

/**
 * GET /api/student/exam-history
 * Get student's exam history
 */
router.get('/exam-history', ...authRequired, studentExamController.getExamHistory);

// ==========================================
// STUDENT GRADE DASHBOARD (Phase 5)
// ==========================================

/**
 * GET /api/student/courses/:courseId/grade
 * Get my grade for a course
 */
router.get('/courses/:courseId/grade', ...authRequired, studentGradeDashboardController.getMyGrade);

/**
 * GET /api/student/grade-history
 * Get grade history across all courses
 */
router.get('/grade-history', ...authRequired, studentGradeDashboardController.getMyGradeHistory);

/**
 * GET /api/student/courses/:courseId/grading-policy
 * Get grading policy for a course
 */
router.get('/courses/:courseId/grading-policy', ...authRequired, studentGradeDashboardController.getGradingPolicy);

// ==========================================
// STUDENT RESOURCE ROUTES
// ==========================================

/**
 * GET /api/student/courses/:courseId/resources
 * Get all resources for a course (hierarchical view)
 */
router.get('/courses/:courseId/resources', ...authRequired, studentResourceController.getCourseResources);

/**
 * GET /api/student/courses/:courseId/resources/search
 * Search/filter resources in a course
 */
router.get('/courses/:courseId/resources/search', ...authRequired, studentResourceController.searchResources);

/**
 * GET /api/student/courses/:courseId/resources/stats
 * Get resource statistics for a course
 */
router.get('/courses/:courseId/resources/stats', ...authRequired, studentResourceController.getResourceStats);

/**
 * GET /api/student/resources/:resourceId
 * Get a specific resource (with enrollment check)
 */
router.get('/resources/:resourceId', ...authRequired, studentResourceController.getResource);

// ==========================================
// STUDENT PAYMENT ROUTES
// ==========================================

/**
 * GET /api/student/payments
 * Get payment history for the logged-in student
 */
router.get('/payments', ...authRequired, paymentController.getPaymentHistory);

/**
 * GET /api/student/payments/:paymentId/slip
 * Get payment slip/receipt data
 */
router.get('/payments/:paymentId/slip', ...authRequired, paymentController.getPaymentSlip);

export default router;
