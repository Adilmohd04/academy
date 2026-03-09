import express from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as studentTrackingController from '../modules/shared/controllers/studentTrackingController';

const router = express.Router();


// ============================================
// STUDENT ROUTES - Own tracking data
// ============================================

// Get my tracking data for a course
router.get(
  '/student/courses/:courseId/tracking',
  requireAuth,
  studentTrackingController.getMyTrackingData
);

// Submit quiz
router.post(
  '/student/courses/:courseId/quizzes/:quizId/submit',
  requireAuth,
  studentTrackingController.submitQuiz
);

// Submit assignment
router.post(
  '/student/courses/:courseId/assignments/:assignmentId/submit',
  requireAuth,
  studentTrackingController.submitAssignment
);

// Log activity
router.post(
  '/student/courses/:courseId/activity',
  requireAuth,
  studentTrackingController.logStudentActivity
);

// ============================================
// TEACHER ROUTES - View all students' tracking
// ============================================

// Get all students tracking for a course
router.get(
  '/teacher/courses/:courseId/students/tracking',
  requireAuth,
  studentTrackingController.getCourseStudentsTracking
);

// Get specific student's tracking data
router.get(
  '/teacher/courses/:courseId/students/:studentId/tracking',
  requireAuth,
  studentTrackingController.getStudentTrackingData
);

// Get student performance view
router.get(
  '/teacher/courses/:courseId/performance',
  requireAuth,
  studentTrackingController.getStudentPerformance
);

// Grade an assignment
router.put(
  '/teacher/assignments/submissions/:submissionId/grade',
  requireAuth,
  studentTrackingController.gradeAssignment
);

// Grade submission (alternative route used by frontend)
router.post(
  '/submissions/:submissionId/grade',
  requireAuth,
  studentTrackingController.gradeAssignment
);

// Update student progress totals
router.post(
  '/teacher/courses/:courseId/students/:studentId/update-progress',
  requireAuth,
  studentTrackingController.updateStudentProgress
);

// Recalculate quiz scores for a course (fixes scoring from old logic)
router.post(
  '/teacher/courses/:courseId/recalculate-quiz-scores',
  requireAuth,
  studentTrackingController.recalculateQuizScores
);

// ============================================
// ADMIN ROUTES - Same as teacher for now
// ============================================

// Admin can also view student performance
router.get(
  '/admin/courses/:courseId/performance',
  requireAuth,
  studentTrackingController.getStudentPerformance
);

router.get(
  '/admin/courses/:courseId/students/tracking',
  requireAuth,
  studentTrackingController.getCourseStudentsTracking
);

export default router;
