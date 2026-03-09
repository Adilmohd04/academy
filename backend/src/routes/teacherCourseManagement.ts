/**
 * Teacher Course Routes (Enhanced)
 * 
 * Routes for teacher course management:
 * - Submit for approval
 * - Live class scheduling
 * - Quiz management with marks
 * - Final exam management
 * - Grade calculations
 */

/// <reference path="../types/express.d.ts" />

import express, { Request, Response } from 'express';
import '../types/express'; // Ensure type augmentation is loaded
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as courseApprovalService from '../modules/admin/services/courseApprovalService';
import * as liveClassController from '../modules/teacher/controllers/liveClassController';
import * as enhancedQuizController from '../modules/teacher/controllers/enhancedQuizController';
import * as finalExamController from '../modules/teacher/controllers/finalExamController';
import * as gradeCalculationService from '../modules/shared/services/gradeCalculationService';
import * as gradeDashboardController from '../modules/teacher/controllers/gradeDashboardController';
import * as teacherResourceController from '../modules/teacher/controllers/teacherResourceController';
import * as courseArchivalController from '../modules/admin/controllers/courseArchivalController';
import { TeacherCourseManagementController } from '../modules/teacher/controllers/courseManagementController';
import * as teacherCourseController from '../modules/teacher/controllers/teacherCourseController';

const router = express.Router();
const courseManagementController = new TeacherCourseManagementController();

// All routes require teacher role
const teacherAuth = [requireAuth, requireRole(['teacher', 'admin'])];

// ==========================================
// COMPREHENSIVE COURSE CRUD
// ==========================================

// Get all my courses
router.get('/my-courses', ...teacherAuth, teacherCourseController.getMyCourses);

// Get course details with full structure
router.get('/my-courses/:courseId', ...teacherAuth, teacherCourseController.getCourseDetails);

// Create new course
router.post('/my-courses', ...teacherAuth, teacherCourseController.createCourse);

// Update course
router.put('/my-courses/:courseId', ...teacherAuth, teacherCourseController.updateCourse);

// Publish/unpublish course
router.put('/my-courses/:courseId/publish', ...teacherAuth, teacherCourseController.togglePublishCourse);

// Delete course
router.delete('/my-courses/:courseId', ...teacherAuth, teacherCourseController.deleteCourse);

// ==========================================
// WEEK/MODULE MANAGEMENT
// ==========================================

// Add week to course
router.post('/my-courses/:courseId/weeks', ...teacherAuth, teacherCourseController.addWeek);
router.post('/courses/:courseId/weeks', ...teacherAuth, teacherCourseController.addWeek);

// Update week
router.put('/my-weeks/:weekId', ...teacherAuth, teacherCourseController.updateWeek);
router.put('/courses/:courseId/weeks/:weekId', ...teacherAuth, teacherCourseController.updateWeek);

// Delete week
router.delete('/my-weeks/:weekId', ...teacherAuth, teacherCourseController.deleteWeek);
router.delete('/courses/:courseId/weeks/:weekId', ...teacherAuth, teacherCourseController.deleteWeek);

// ==========================================
// LESSON MANAGEMENT
// ==========================================

// Add lesson to week
router.post('/my-weeks/:weekId/lessons', ...teacherAuth, teacherCourseController.addLesson);

// Update lesson
router.put('/my-lessons/:lessonId', ...teacherAuth, teacherCourseController.updateLesson);

// Delete lesson
router.delete('/my-lessons/:lessonId', ...teacherAuth, teacherCourseController.deleteLesson);

// ==========================================
// LIVE SESSION SCHEDULING (NEW)
// ==========================================

// Schedule live session
router.post('/my-courses/:courseId/sessions', ...teacherAuth, teacherCourseController.scheduleLiveSession);

// Update live session
router.put('/my-sessions/:sessionId', ...teacherAuth, teacherCourseController.updateLiveSession);

// Delete live session
router.delete('/my-sessions/:sessionId', ...teacherAuth, teacherCourseController.deleteLiveSession);

// ==========================================
// COURSE ANNOUNCEMENTS
// ==========================================

// Create announcement (multiple route variations for compatibility)
router.post('/my-courses/:courseId/announcements', ...teacherAuth, teacherCourseController.createAnnouncement);
router.post('/courses/:courseId/announcements', ...teacherAuth, teacherCourseController.createAnnouncement);

// Update announcement
router.put('/courses/:courseId/announcements/:id', ...teacherAuth, teacherCourseController.updateAnnouncement);

// Delete announcement
router.delete('/courses/:courseId/announcements/:id', ...teacherAuth, teacherCourseController.deleteAnnouncement);

// ==========================================
// COURSE MANAGEMENT DASHBOARD
// ==========================================

// Get enrolled students
router.get('/courses/:courseId/enrolled-students', ...teacherAuth, (req, res) => 
  courseManagementController.getEnrolledStudents(req, res)
);

// Get course statistics
router.get('/courses/:courseId/stats', ...teacherAuth, (req, res) => 
  courseManagementController.getCourseStats(req, res)
);

// Get student progress
router.get('/courses/:courseId/student-progress/:studentId', ...teacherAuth, (req, res) => 
  courseManagementController.getStudentProgress(req, res)
);

// ==========================================
// COURSE APPROVAL WORKFLOW
// ==========================================

// Submit course for approval
router.post('/courses/:courseId/submit-for-approval', ...teacherAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const course = await courseApprovalService.submitForApproval(courseId, teacherId);

    res.json({
      success: true,
      message: 'Course submitted for approval',
      data: course
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// LIVE CLASS SCHEDULING
// ==========================================

// Get upcoming live classes for teacher
router.get('/live-classes/upcoming', ...teacherAuth, liveClassController.getUpcomingClasses);

// Create schedule for a course
router.post('/courses/:courseId/schedules', ...teacherAuth, liveClassController.createSchedule);

// Get all schedules for a course
router.get('/courses/:courseId/schedules', ...teacherAuth, liveClassController.getCourseSchedules);

// Update a schedule
router.put('/schedules/:scheduleId', ...teacherAuth, liveClassController.updateSchedule);

// Go live
router.post('/schedules/:scheduleId/go-live', ...teacherAuth, liveClassController.goLive);

// End live class
router.post('/schedules/:scheduleId/end', ...teacherAuth, liveClassController.endLiveClass);

// Cancel schedule
router.post('/schedules/:scheduleId/cancel', ...teacherAuth, liveClassController.cancelSchedule);

// Update schedule status
router.patch('/schedules/:scheduleId/status', ...teacherAuth, liveClassController.updateScheduleStatus);

// Delete schedule
router.delete('/schedules/:scheduleId', ...teacherAuth, liveClassController.deleteSchedule);

// ==========================================
// ENHANCED QUIZ MANAGEMENT
// ==========================================

// Create a quiz
router.post('/quizzes', ...teacherAuth, enhancedQuizController.createQuiz);

// Get quiz by ID
router.get('/quizzes/:quizId', ...teacherAuth, enhancedQuizController.getQuiz);

// Update quiz
router.put('/quizzes/:quizId', ...teacherAuth, enhancedQuizController.updateQuiz);

// Delete quiz
router.delete('/quizzes/:quizId', ...teacherAuth, enhancedQuizController.deleteQuiz);

// Get quiz marks summary (for progress bar)
router.get('/quizzes/:quizId/marks-summary', ...teacherAuth, enhancedQuizController.getMarksSummary);

// Add question to quiz
router.post('/quizzes/:quizId/questions', ...teacherAuth, enhancedQuizController.addQuestion);

// Update question
router.put('/questions/:questionId', ...teacherAuth, enhancedQuizController.updateQuestion);

// Delete question
router.delete('/questions/:questionId', ...teacherAuth, enhancedQuizController.deleteQuestion);

// Get quizzes for a lesson
router.get('/lessons/:lessonId/quizzes', ...teacherAuth, enhancedQuizController.getLessonQuizzes);

// ==========================================
// FINAL EXAM MANAGEMENT
// ==========================================

// Create or update final exam for a course
router.post('/courses/:courseId/final-exam', ...teacherAuth, finalExamController.createOrUpdateExam);

// Get final exam for a course
router.get('/courses/:courseId/final-exam', ...teacherAuth, finalExamController.getExam);

// Add question to final exam
router.post('/final-exams/:examId/questions', ...teacherAuth, finalExamController.addQuestion);

// Update final exam question
router.put('/final-exam-questions/:questionId', ...teacherAuth, finalExamController.updateQuestion);

// Delete final exam question
router.delete('/final-exam-questions/:questionId', ...teacherAuth, finalExamController.deleteQuestion);

// Toggle publish status
router.post('/final-exams/:examId/toggle-publish', ...teacherAuth, finalExamController.togglePublish);

// Get marks summary (for progress bar display)
router.get('/final-exams/:examId/marks-summary', ...teacherAuth, finalExamController.getMarksSummary);

// Get all exam attempts for a course
router.get('/courses/:courseId/final-exam-attempts', ...teacherAuth, finalExamController.getAttempts);

// ==========================================
// GRADE DASHBOARD (Phase 5)
// ==========================================

// Get complete gradebook for a course
router.get('/courses/:courseId/gradebook', ...teacherAuth, gradeDashboardController.getCourseGradebook);

// Get detailed grade for a specific student
router.get('/courses/:courseId/students/:studentId/grade', ...teacherAuth, gradeDashboardController.getStudentGradeDetail);

// Export gradebook to CSV
router.get('/courses/:courseId/gradebook/export', ...teacherAuth, gradeDashboardController.exportGradebook);

// Get grading policy
router.get('/courses/:courseId/grading-policy', ...teacherAuth, gradeDashboardController.getGradingPolicy);

// ==========================================
// RESOURCE MANAGEMENT
// ==========================================

// Get all resources for a course (hierarchical view)
router.get('/courses/:courseId/resources', ...teacherAuth, teacherResourceController.getCourseResources);

// Get resource statistics
router.get('/courses/:courseId/resources/stats', ...teacherAuth, teacherResourceController.getResourceStats);

// Create a new resource
router.post('/courses/:courseId/resources', ...teacherAuth, teacherResourceController.createResource);

// Bulk create resources
router.post('/courses/:courseId/resources/bulk', ...teacherAuth, teacherResourceController.bulkCreateResources);

// Reorder resources
router.post('/courses/:courseId/resources/reorder', ...teacherAuth, teacherResourceController.reorderResources);

// Update a resource
router.put('/resources/:resourceId', ...teacherAuth, teacherResourceController.updateResource);

// Delete a resource
router.delete('/resources/:resourceId', ...teacherAuth, teacherResourceController.deleteResource);

// ==========================================
// GRADE MANAGEMENT (Legacy)
// ==========================================

// Get all student grades for a course
router.get('/courses/:courseId/grades', ...teacherAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const grades = await gradeCalculationService.getCourseGrades(courseId);

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Recalculate grade for a specific student
router.post('/courses/:courseId/students/:studentId/calculate-grade', ...teacherAuth, async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    const result = await gradeCalculationService.calculateFinalGrade(courseId, studentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Check certificate eligibility
router.get('/courses/:courseId/students/:studentId/certificate-eligibility', ...teacherAuth, async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    const result = await gradeCalculationService.checkCertificateEligibility(courseId, studentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Issue certificate (for passed students)
router.post('/courses/:courseId/students/:studentId/issue-certificate', ...teacherAuth, async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    // Check eligibility first
    const eligibility = await gradeCalculationService.checkCertificateEligibility(courseId, studentId);

    if (!eligibility.eligible) {
      return res.status(400).json({
        error: 'Student is not eligible for certificate',
        reason: eligibility.reason
      });
    }

    const certificate = await gradeCalculationService.issueCertificate(courseId, studentId);

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: certificate
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// COURSE ARCHIVAL (Teacher)
// ==========================================

// Get my archived courses
router.get('/archived-courses', ...teacherAuth, courseArchivalController.getMyArchivedCourses);

// Archive my course
router.post('/courses/:courseId/archive', ...teacherAuth, courseArchivalController.archiveCourse);

// Restore my archived course
router.post('/courses/:courseId/restore', ...teacherAuth, courseArchivalController.restoreCourse);

export default router;
