import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/clerkAuth';
import { requireEnrollment } from '../middleware/enrollmentCheck';
import * as courseProgressController from '../modules/student/controllers/courseProgressController';
import * as quizController from '../modules/student/controllers/quizController';
import * as assignmentController from '../modules/student/controllers/assignmentController';
import * as dashboardController from '../modules/student/controllers/dashboardController';
import * as courseEnrollmentController from '../modules/student/controllers/courseEnrollmentController';
import * as liveSessionController from '../modules/student/controllers/liveSessionController';
import * as certificateController from '../modules/student/controllers/certificateController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Student dashboard
router.get(
  '/student/dashboard',
  requireAuth,
  dashboardController.getStudentDashboard
);

// Course browsing & enrollment
router.get(
  '/student/courses/browse',
  requireAuth,
  courseEnrollmentController.getBrowseCourses
);

router.get(
  '/student/courses/:courseId/overview',
  requireAuth,
  courseEnrollmentController.getCourseOverview
);

router.post(
  '/student/courses/:courseId/enroll',
  requireAuth,
  courseEnrollmentController.enrollInCourse
);

// Course content & progress (requires enrollment)
router.get(
  '/courses/:courseId/content',
  requireAuth,
  requireEnrollment,
  courseProgressController.getCourseContent
);

router.post(
  '/lessons/:lessonId/complete',
  requireAuth,
  requireEnrollment,
  courseProgressController.markLessonComplete
);

// Quiz endpoints (requires enrollment)
router.get(
  '/lessons/:lessonId/quiz',
  requireAuth,
  requireEnrollment,
  quizController.getQuiz
);

router.post(
  '/lessons/:lessonId/quiz/submit',
  requireAuth,
  requireEnrollment,
  quizController.submitQuiz
);

// Assignment endpoints (requires enrollment)
router.get(
  '/lessons/:lessonId/assignment',
  requireAuth,
  requireEnrollment,
  assignmentController.getAssignment
);

router.post(
  '/lessons/:lessonId/assignment/submit',
  requireAuth,
  requireEnrollment,
  upload.single('file'),
  assignmentController.submitAssignment
);

// Live session endpoints (requires enrollment)
router.get(
  '/lessons/:lessonId/live-session',
  requireAuth,
  requireEnrollment,
  liveSessionController.getLessonLiveSession
);

router.post(
  '/live-sessions/:sessionId/attend',
  requireAuth,
  requireEnrollment,
  liveSessionController.markAttendance
);

router.get(
  '/courses/:courseId/live-sessions',
  requireAuth,
  requireEnrollment,
  liveSessionController.getCourseLiveSessions
);

// Certificate endpoints
router.post(
  '/enrollments/:enrollmentId/certificate',
  requireAuth,
  certificateController.generateCertificate
);

router.get(
  '/student/certificates',
  requireAuth,
  certificateController.getStudentCertificates
);

router.get(
  '/certificates/:certificateId',
  requireAuth,
  certificateController.getCertificate
);

export default router;
