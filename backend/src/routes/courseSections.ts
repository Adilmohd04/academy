import express, { NextFunction, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import * as sectionService from '../modules/teacher/services/sectionService';
import * as lessonService from '../modules/student/services/lessonService';

const router = express.Router();

// These are legacy curriculum-editor endpoints. They previously trusted any
// authenticated user and accepted raw section/lesson IDs, which made the
// course structure readable and mutable across tenant boundaries.
//
// Scoped to this router's own paths — it is mounted on the bare `/api` prefix,
// where an unscoped guard would also gate unrelated routes registered later.
const SECTION_ROUTES = ['/courses/:courseId/sections', '/sections', '/lessons'];
router.use(SECTION_ROUTES, requireAuth);
router.use(SECTION_ROUTES, requireRole(['teacher', 'admin']));

const courseNotFound = (res: Response) =>
  res.status(404).json({ error: 'Course structure was not found' });

const getSectionCourseId = async (sectionId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('course_sections')
    .select('course_id')
    .eq('id', sectionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve course section: ${error.message}`);
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

const requireSectionAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sectionId = req.params.sectionId;
    if (!sectionId) {
      return res.status(400).json({ error: 'Section id is required' });
    }

    const courseId = await getSectionCourseId(sectionId);
    if (!courseId || (req.params.courseId && req.params.courseId !== courseId)) {
      return courseNotFound(res);
    }

    if (await canAccessCourse(req, res, courseId)) {
      return next();
    }
  } catch (error) {
    console.error('Section access check failed:', error);
    return res.status(500).json({ error: 'Unable to verify course access' });
  }
};

const requireLessonAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessonId = req.params.lessonId;
    if (!lessonId) {
      return res.status(400).json({ error: 'Lesson id is required' });
    }

    const { data: lesson, error: lessonError } = await supabase
      .from('section_lessons')
      .select('section_id')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError) {
      console.error('Lesson access lookup failed:', lessonError);
      return res.status(500).json({ error: 'Unable to verify course access' });
    }

    if (!lesson?.section_id) {
      return courseNotFound(res);
    }

    const courseId = await getSectionCourseId(lesson.section_id);
    if (!courseId) {
      return courseNotFound(res);
    }

    if (await canAccessCourse(req, res, courseId)) {
      return next();
    }
  } catch (error) {
    console.error('Lesson access check failed:', error);
    return res.status(500).json({ error: 'Unable to verify course access' });
  }
};

const definedFields = (source: Record<string, unknown>, fields: string[]) =>
  Object.fromEntries(fields
    .filter((field) => source[field] !== undefined)
    .map((field) => [field, source[field]]));

// ============================================
// COURSE SECTIONS ROUTES
// ============================================

// Get all sections for a course
router.get('/courses/:courseId/sections', requireCourseAccess, async (req: any, res) => {
  try {
    const { courseId } = req.params;
    const sections = await sectionService.getCourseSections(courseId);
    
    // Fetch lessons for each section
    const sectionsWithLessons = await Promise.all(
      sections.map(async (section) => {
        const lessons = await lessonService.getSectionLessons(section.id);
        return {
          ...section,
          lessons,
        };
      })
    );

    res.json({ success: true, data: sectionsWithLessons });
  } catch (error: any) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new section
router.post('/courses/:courseId/sections', requireCourseAccess, async (req: any, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, order_index, unlock_date } = req.body;

    const section = await sectionService.createSection({
      course_id: courseId,
      title,
      description,
      order_index,
      unlock_date,
    });

    res.json({ success: true, data: section });
  } catch (error: any) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a section
router.put('/sections/:sectionId', requireSectionAccess, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    // Do not let a caller re-parent a section into a course they do not own.
    const updates = definedFields(req.body || {}, [
      'title',
      'description',
      'order_index',
      'unlock_date',
    ]) as Partial<sectionService.CreateSectionInput>;

    const section = await sectionService.updateSection(sectionId, updates);
    res.json({ success: true, data: section });
  } catch (error: any) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a section
router.delete('/sections/:sectionId', requireSectionAccess, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    await sectionService.deleteSection(sectionId);
    res.json({ success: true, message: 'Section deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SECTION LESSONS ROUTES
// ============================================

// Get all lessons for a section
router.get('/sections/:sectionId/lessons', requireSectionAccess, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    const lessons = await lessonService.getSectionLessons(sectionId);
    res.json({ success: true, data: lessons });
  } catch (error: any) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new lesson
router.post('/sections/:sectionId/lessons', requireSectionAccess, async (req: any, res) => {
  try {
    const { sectionId } = req.params;
    const { title, type, video_url, duration_minutes, order_index } = req.body;

    const lesson = await lessonService.createLesson({
      section_id: sectionId,
      title,
      type,
      video_url,
      duration_minutes,
      order_index,
    });

    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a lesson
router.put('/lessons/:lessonId', requireLessonAccess, async (req: any, res) => {
  try {
    const { lessonId } = req.params;
    // Keep the lesson attached to the section resolved by the access check.
    const updates = definedFields(req.body || {}, [
      'title',
      'type',
      'video_url',
      'duration_minutes',
      'order_index',
    ]) as Partial<lessonService.CreateLessonInput>;

    const lesson = await lessonService.updateLesson(lessonId, updates);
    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a lesson
router.delete('/lessons/:lessonId', requireLessonAccess, async (req: any, res) => {
  try {
    const { lessonId } = req.params;
    await lessonService.deleteLesson(lessonId);
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
