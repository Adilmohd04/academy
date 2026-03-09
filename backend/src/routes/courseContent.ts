import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as courseContentController from '../modules/student/controllers/courseContentController';

const router = Router();

// Weeks
router.post('/weeks', requireAuth, courseContentController.createWeek);
router.get('/courses/:courseId/weeks', courseContentController.getCourseWeeks);

// Content
router.post('/content', requireAuth, courseContentController.createContent);
router.get('/weeks/:weekId/content', courseContentController.getWeekContent);

export default router;
