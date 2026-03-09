/**
 * Course Weeks Routes
 * 
 * API routes for course week management
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as weekController from '../modules/teacher/controllers/courseWeekController';
import * as contentController from '../modules/teacher/controllers/weekContentController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Week routes
router.get('/courses/:courseId/weeks', weekController.getCourseWeeks);
router.get('/courses/:courseId/weeks/:weekId', weekController.getWeekById);
router.post('/courses/:courseId/weeks', weekController.createWeek);
router.put('/courses/:courseId/weeks/:weekId', weekController.updateWeek);
router.delete('/courses/:courseId/weeks/:weekId', weekController.deleteWeek);
router.post('/courses/:courseId/weeks/reorder', weekController.reorderWeeks);

// Content routes
router.get('/courses/:courseId/weeks/:weekId/content', contentController.getWeekContent);
router.get('/courses/:courseId/weeks/:weekId/content/:contentId', contentController.getContentById);
router.post('/courses/:courseId/weeks/:weekId/content', contentController.createContent);
router.put('/courses/:courseId/weeks/:weekId/content/:contentId', contentController.updateContent);
router.delete('/courses/:courseId/weeks/:weekId/content/:contentId', contentController.deleteContent);
router.post('/courses/:courseId/weeks/:weekId/content/reorder', contentController.reorderContent);

export default router;
