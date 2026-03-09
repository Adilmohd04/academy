import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import {
  // Course CRUD
  getMyCourses,
  getCourseDetails,
  createCourse,
  updateCourse,
  togglePublishCourse,
  deleteCourse,
  markCourseComplete,
  
  // Week Management
  addWeek,
  updateWeek,
  deleteWeek,
  
  // Lesson Management
  addLesson,
  updateLesson,
  deleteLesson,
  
  // Live Sessions
  scheduleLiveSession,
  updateLiveSession,
  deleteLiveSession,
  
  // Announcements
  createAnnouncement
} from '../modules/teacher/controllers/teacherCourseController';

import {
  getCourseStudents,
  getCourseSubmissions,
  getCourseAnnouncements,
  getCourseClasses,
  createCourseAnnouncement,
  updateCourseAnnouncement,
  deleteCourseAnnouncement
} from '../modules/teacher/controllers/courseController';

const router = express.Router();

// Apply authentication and teacher role requirement to all routes
router.use(requireAuth);
router.use(requireRole(['teacher']));

// ============================================
// COURSE ROUTES
// ============================================
router.get('/courses', getMyCourses);
router.get('/courses/:courseId', getCourseDetails);
router.post('/courses', createCourse);
router.put('/courses/:courseId', updateCourse);
router.put('/courses/:courseId/publish', togglePublishCourse);
router.post('/courses/:courseId/complete', markCourseComplete);
router.delete('/courses/:courseId', deleteCourse);

// Course Data Routes
// router.get('/courses/:id/students', getCourseStudents); // ❌ DISABLED: Returns basic enrollment only - use teacherStudentManagement.ts for comprehensive tracking with grades
router.get('/courses/:id/submissions', getCourseSubmissions);
router.get('/courses/:id/announcements', getCourseAnnouncements);
router.get('/courses/:id/classes', getCourseClasses);

// ============================================
// WEEK ROUTES
// ============================================
router.post('/courses/:courseId/weeks', addWeek);
router.put('/weeks/:weekId', updateWeek);
router.delete('/weeks/:weekId', deleteWeek);

// ============================================
// LESSON ROUTES
// ============================================
router.post('/weeks/:weekId/lessons', addLesson);
router.put('/lessons/:lessonId', updateLesson);
router.delete('/lessons/:lessonId', deleteLesson);

// ============================================
// LIVE SESSION ROUTES
// ============================================
router.post('/courses/:courseId/sessions', scheduleLiveSession);
router.put('/sessions/:sessionId', updateLiveSession);
router.delete('/sessions/:sessionId', deleteLiveSession);

// ============================================
// ANNOUNCEMENT ROUTES
// ============================================
router.get('/courses/:courseId/announcements', getCourseAnnouncements);
router.post('/courses/:courseId/announcements', createCourseAnnouncement);
router.put('/announcements/:id', updateCourseAnnouncement);
router.delete('/announcements/:id', deleteCourseAnnouncement);

export default router;
