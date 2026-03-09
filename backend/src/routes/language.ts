import { Router } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import * as languageController from '../controllers/languageController';
import { requireEnrollment } from '../middleware/enrollmentCheck';

const router = Router();

// Teacher routes - Manage lesson languages
router.post(
  '/teacher/lessons/:lessonId/language',
  requireAuth,
  languageController.addLessonLanguage
);

router.delete(
  '/teacher/lessons/:lessonId/language/:language',
  requireAuth,
  languageController.deleteLessonLanguage
);

// Student routes - Access content with language preference
router.get(
  '/student/lessons/:lessonId',
  requireAuth,
  requireEnrollment,
  languageController.getLessonWithLanguage
);

router.get(
  '/lessons/:lessonId/languages',
  requireAuth,
  languageController.getAllLessonLanguages
);

router.get(
  '/student/courses/:courseId/content-language',
  requireAuth,
  requireEnrollment,
  languageController.getCourseContentWithLanguage
);

export default router;
