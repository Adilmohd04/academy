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
import { requireAuth } from '../middleware/clerkAuth';
import * as courseController from '../controllers/courseController';

const router = Router();

// Public routes (no auth required)
router.get('/courses', courseController.getAllCourses);
router.get('/courses/:id', courseController.getCourseById);

// Protected routes (auth required)
router.post('/courses', requireAuth, courseController.createCourse);
router.put('/courses/:id', requireAuth, courseController.updateCourse);
router.delete('/courses/:id', requireAuth, courseController.deleteCourse);

// Teacher-specific routes
router.get('/teacher/courses', requireAuth, courseController.getTeacherCourses);

export default router;
