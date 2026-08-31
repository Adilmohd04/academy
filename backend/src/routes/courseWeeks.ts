/**
 * Course Weeks Routes
 * 
 * API routes for course week management
 */

import { NextFunction, Request, Response, Router } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import * as weekController from '../modules/teacher/controllers/courseWeekController';
import * as contentController from '../modules/teacher/controllers/weekContentController';

const router = Router();

// These endpoints power the teacher curriculum editor. A verified session on
// its own is not enough: a student (or another teacher) must never be able to
// inspect or mutate a course just by guessing a week/content UUID.
//
// Scoped to this router's own path. This router is mounted on the bare `/api`
// prefix, so an unscoped `router.use` guard runs for *every* `/api/*` request
// that reaches it — including student routes mounted later in app.ts, which it
// was rejecting before they were ever matched.
const WEEK_ROUTES = '/courses/:courseId/weeks';
router.use(WEEK_ROUTES, requireAuth);
router.use(WEEK_ROUTES, requireRole(['teacher', 'admin']));

const courseNotFound = (res: Response) =>
  res.status(404).json({ error: 'Course structure was not found' });

const getWeekCourseId = async (weekId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('course_weeks')
    .select('course_id')
    .eq('id', weekId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve course week: ${error.message}`);
  }

  return data?.course_id || null;
};

const canAccessCourse = async (
  req: Request,
  res: Response,
  courseId: string,
): Promise<boolean> => {
  const userId = req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    console.error('Course structure access check failed:', courseError);
    res.status(500).json({ error: 'Unable to verify course access' });
    return false;
  }

  if (!course) {
    courseNotFound(res);
    return false;
  }

  // Administrators retain their cross-course oversight access, but only for
  // a course which actually exists.
  if (req.auth?.role === 'admin') {
    return true;
  }

  // Modern course records store the Clerk id directly and can be authorized
  // without depending on a legacy profile row.
  if (course.teacher_id === userId) {
    return true;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Teacher profile lookup failed:', profileError);
    res.status(500).json({ error: 'Unable to verify course access' });
    return false;
  }

  if (!profile) {
    res.status(403).json({ error: 'Teacher profile not found' });
    return false;
  }

  // Historical rows use either the Clerk id or the profile UUID for the
  // primary teacher. Co-teacher rows normally use profile UUIDs; supporting
  // both forms keeps the access gate correct during the identity migration.
  if (course.teacher_id === profile.id) {
    return true;
  }

  const { data: coTeacher, error: coTeacherError } = await supabase
    .from('course_teachers')
    .select('id')
    .eq('course_id', courseId)
    .in('teacher_id', [profile.id, userId])
    .maybeSingle();

  if (coTeacherError) {
    console.error('Co-teacher access lookup failed:', coTeacherError);
    res.status(500).json({ error: 'Unable to verify course access' });
    return false;
  }

  if (!coTeacher) {
    res.status(403).json({ error: 'You do not have access to this course' });
    return false;
  }

  return true;
};

const requireCourseAccess = async (req: Request, res: Response, next: NextFunction) => {
  const courseId = req.params.courseId;
  if (!courseId) {
    return res.status(400).json({ error: 'Course id is required' });
  }

  if (await canAccessCourse(req, res, courseId)) {
    return next();
  }
};

const requireWeekAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, weekId } = req.params;
    if (!courseId || !weekId) {
      return res.status(400).json({ error: 'Course and week ids are required' });
    }

    const resolvedCourseId = await getWeekCourseId(weekId);
    // Treat an ID from a different course as not found rather than revealing
    // that it exists to a caller with access to another course.
    if (!resolvedCourseId || resolvedCourseId !== courseId) {
      return courseNotFound(res);
    }

    if (await canAccessCourse(req, res, resolvedCourseId)) {
      return next();
    }
  } catch (error) {
    console.error('Week access check failed:', error);
    return res.status(500).json({ error: 'Unable to verify course access' });
  }
};

const requireContentAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, weekId, contentId } = req.params;
    if (!courseId || !weekId || !contentId) {
      return res.status(400).json({ error: 'Course, week, and content ids are required' });
    }

    const resolvedCourseId = await getWeekCourseId(weekId);
    if (!resolvedCourseId || resolvedCourseId !== courseId) {
      return courseNotFound(res);
    }

    const { data: content, error: contentError } = await supabase
      .from('course_content')
      .select('week_id')
      .eq('id', contentId)
      .maybeSingle();

    if (contentError) {
      console.error('Course content access lookup failed:', contentError);
      return res.status(500).json({ error: 'Unable to verify course access' });
    }

    if (!content || content.week_id !== weekId) {
      return courseNotFound(res);
    }

    if (await canAccessCourse(req, res, resolvedCourseId)) {
      return next();
    }
  } catch (error) {
    console.error('Course content access check failed:', error);
    return res.status(500).json({ error: 'Unable to verify course access' });
  }
};

const extractIds = (items: unknown): string[] | null => {
  if (!Array.isArray(items)) return null;
  const ids = items.map((item) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined));
  return ids.every((id) => typeof id === 'string' && id.length > 0) ? ids as string[] : null;
};

const requireWeekReorderScope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = extractIds(req.body?.weekOrders);
    if (ids === null) {
      return res.status(400).json({ error: 'weekOrders must contain valid week ids' });
    }

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return next();

    const { data: weeks, error } = await supabase
      .from('course_weeks')
      .select('id, course_id')
      .in('id', uniqueIds);

    if (error) {
      console.error('Week reorder scope lookup failed:', error);
      return res.status(500).json({ error: 'Unable to verify course access' });
    }

    if (
      !weeks ||
      weeks.length !== uniqueIds.length ||
      weeks.some((week) => week.course_id !== req.params.courseId)
    ) {
      return courseNotFound(res);
    }

    return next();
  } catch (error) {
    console.error('Week reorder scope check failed:', error);
    return res.status(500).json({ error: 'Unable to verify course access' });
  }
};

const requireContentReorderScope = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = extractIds(req.body?.contentOrders);
    if (ids === null) {
      return res.status(400).json({ error: 'contentOrders must contain valid content ids' });
    }

    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return next();

    const { data: contentItems, error } = await supabase
      .from('course_content')
      .select('id, week_id')
      .in('id', uniqueIds);

    if (error) {
      console.error('Content reorder scope lookup failed:', error);
      return res.status(500).json({ error: 'Unable to verify course access' });
    }

    if (
      !contentItems ||
      contentItems.length !== uniqueIds.length ||
      contentItems.some((content) => content.week_id !== req.params.weekId)
    ) {
      return courseNotFound(res);
    }

    return next();
  } catch (error) {
    console.error('Content reorder scope check failed:', error);
    return res.status(500).json({ error: 'Unable to verify course access' });
  }
};

// Week routes
router.get('/courses/:courseId/weeks', requireCourseAccess, weekController.getCourseWeeks);
router.get('/courses/:courseId/weeks/:weekId', requireWeekAccess, weekController.getWeekById);
router.post('/courses/:courseId/weeks', requireCourseAccess, weekController.createWeek);
router.put('/courses/:courseId/weeks/:weekId', requireWeekAccess, weekController.updateWeek);
router.delete('/courses/:courseId/weeks/:weekId', requireWeekAccess, weekController.deleteWeek);
router.post('/courses/:courseId/weeks/reorder', requireCourseAccess, requireWeekReorderScope, weekController.reorderWeeks);

// Content routes
router.get('/courses/:courseId/weeks/:weekId/content', requireWeekAccess, contentController.getWeekContent);
router.get('/courses/:courseId/weeks/:weekId/content/:contentId', requireContentAccess, contentController.getContentById);
router.post('/courses/:courseId/weeks/:weekId/content', requireWeekAccess, contentController.createContent);
router.put('/courses/:courseId/weeks/:weekId/content/:contentId', requireContentAccess, contentController.updateContent);
router.delete('/courses/:courseId/weeks/:weekId/content/:contentId', requireContentAccess, contentController.deleteContent);
router.post('/courses/:courseId/weeks/:weekId/content/reorder', requireWeekAccess, requireContentReorderScope, contentController.reorderContent);

export default router;
