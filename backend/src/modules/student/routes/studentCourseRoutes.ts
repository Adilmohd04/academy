/**
 * Student Course Routes
 * Routes for student course browsing, enrollment, and payment
 */

import express from 'express';
import { requireAuth, requireRole } from '../../../middleware/clerkAuth';
import * as courseController from '../controllers/courseController';
import * as paymentController from '../controllers/paymentController';
import * as lessonController from '../controllers/lessonController';
import * as liveSessionController from '../controllers/liveSessionController';

const router = express.Router();

// Log route registration
console.log('📚 [Student Routes] Registering student course routes...');

// Course browsing and details (public - no auth required)
router.get('/courses/browse', (req, res, next) => {
  console.log('✅ [Student Routes] Hit /courses/browse route - NO AUTH');
  next();
}, courseController.getPublishedCourses);
router.get('/courses/published', courseController.getPublishedCourses);
router.get('/courses/:courseId/details', courseController.getCourseDetails);
router.get('/courses/:courseId/modules', requireAuth, courseController.getCourseModules);
router.get('/courses/:courseId/eligibility', requireAuth, courseController.checkCourseEligibility);

// Student enrolled courses
router.get('/courses/enrolled', requireAuth, courseController.getMyEnrolledCourses);

// Enrollment verification for a specific course (used in learn page)
router.get('/enrollments/course/:courseId', requireAuth, courseController.getEnrollmentForCourse);

// Payment and enrollment
router.post('/payment/create', requireAuth, requireRole(['student']), paymentController.createPaymentOrder);
router.post('/payment/verify', requireAuth, requireRole(['student']), paymentController.verifyPayment);

// Payment history
router.get('/payments', requireAuth, requireRole(['student']), paymentController.getPaymentHistory);
router.get('/payments/:paymentId/slip', requireAuth, requireRole(['student']), paymentController.getPaymentSlip);

// Lesson-specific routes (quiz and assignments)
router.get('/lessons/:lessonId/quiz', requireAuth, lessonController.getLessonQuiz);
router.post('/lessons/:lessonId/quiz/submit', requireAuth, lessonController.submitLessonQuiz);
router.post('/lessons/:lessonId/assignment/submit', requireAuth, lessonController.submitLessonAssignment);

// Grades
router.get('/courses/:courseId/grades', requireAuth, lessonController.getCourseGrades);

// Live sessions
router.get('/courses/:courseId/live-sessions', requireAuth, liveSessionController.getCourseLiveSessions);

export default router;
