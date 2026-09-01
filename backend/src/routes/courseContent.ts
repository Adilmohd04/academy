import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import * as courseContentController from '../modules/student/controllers/courseContentController';

const router = Router();

// These pre-curriculum-editor endpoints lack a course-scoped identifier for
// their mutation routes, so they cannot safely establish teacher ownership.
// Keep them only for administrative migration/support work; the active
// teacher editor uses the course-scoped `courseWeeks` routes instead.
//
// Scoped to this router's own paths. Mounted on the bare `/api` prefix, an
// unscoped guard here made every `/api/*` route registered after it in app.ts
// admin-only — which is what returned 403 "Insufficient permissions" on the
// student course endpoints.
router.use(
  ['/weeks', '/content', '/courses/:courseId/weeks'],
  requireAuth,
  requireRole(['admin']),
);

// Weeks
router.post('/weeks', requireAuth, courseContentController.createWeek);
router.get('/courses/:courseId/weeks', courseContentController.getCourseWeeks);

// Content
router.post('/content', requireAuth, courseContentController.createContent);
router.get('/weeks/:weekId/content', courseContentController.getWeekContent);

export default router;
