import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { requireEnrollment } from '../middleware/enrollmentCheck';
import * as teacherQuizController from '../modules/teacher/controllers/quizController';
import * as studentQuizController from '../modules/student/controllers/studentQuizController';

const router = express.Router();

/**
 * Quiz Routes
 * 
 * Teacher routes: Create, manage quizzes and questions
 * Student routes: Take quizzes, view results
 */

// ==================== TEACHER ROUTES ====================

// Quiz Management
router.post(
  '/teacher/courses/:courseId/quizzes',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.createQuiz
);

router.get(
  '/teacher/courses/:courseId/quizzes',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.getCourseQuizzes
);

router.get(
  '/teacher/quizzes/:quizId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.getQuizDetails
);

router.put(
  '/teacher/courses/:courseId/quizzes/:quizId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.updateQuiz
);

router.delete(
  '/teacher/quizzes/:quizId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.deleteQuiz
);

// Question Management
router.post(
  '/teacher/quizzes/:quizId/questions',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.addQuestion
);

router.put(
  '/teacher/quizzes/:quizId/questions/:questionId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.updateQuestion
);

router.delete(
  '/teacher/quizzes/:quizId/questions/:questionId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  teacherQuizController.deleteQuestion
);

// ==================== STUDENT ROUTES ====================

// Get available quizzes for a course (requires enrollment)
router.get(
  '/student/courses/:courseId/quizzes',
  requireAuth,
  requireEnrollment,
  studentQuizController.getAvailableQuizzes
);

// Start a quiz attempt (requires enrollment)
router.post(
  '/student/quizzes/:quizId/start',
  requireAuth,
  requireEnrollment,
  studentQuizController.startQuizAttempt
);

// Submit quiz answers (requires enrollment)
router.post(
  '/student/quizzes/:quizId/submit',
  requireAuth,
  requireEnrollment,
  studentQuizController.submitQuizAttempt
);

// Get quiz attempt results (requires enrollment)
router.get(
  '/student/quiz-attempts/:attemptId',
  requireAuth,
  requireEnrollment,
  studentQuizController.getAttemptResults
);

// Get student's quiz history
router.get(
  '/student/quiz-history',
  requireAuth,
  studentQuizController.getStudentQuizHistory
);

export default router;
