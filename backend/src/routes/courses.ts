/**
 * Course Routes
 * 
 * Handles all course-related API endpoints:
 * - Create course (Teacher)
 * - List courses (All)
 * - Get single course (All)
 * - Update course (Teacher)
 * - Delete course (Teacher/Admin)
 * - Get teacher's courses (Teacher)
 */

import { Router } from 'express';
import { optionalAuth, requireAuth, requireRole } from '../middleware/clerkAuth';
import * as courseController from '../modules/teacher/controllers/courseController';

const router = Router();

// Public routes (no auth required)
router.get('/courses', optionalAuth, courseController.getAllCourses);
router.get('/courses/:id', courseController.getCourseById);

// Protected routes (auth required)
router.post('/courses', requireAuth, requireRole(['teacher']), courseController.createCourse);
router.put('/courses/:id', requireAuth, requireRole(['teacher', 'admin']), courseController.updateCourse);
router.delete('/courses/:id', requireAuth, requireRole(['teacher', 'admin']), courseController.deleteCourse);

// Teacher-specific routes
router.get('/teacher/courses', requireAuth, requireRole(['teacher']), courseController.getTeacherCourses);

export default router;
