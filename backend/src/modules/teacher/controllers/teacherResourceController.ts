/**
 * Teacher Resource Management Controller
 *
 * Every mutation in this controller is course-scoped.  The backend uses
 * Clerk's `req.auth` contract (not the legacy `req.user` contract), and a
 * course can be owned by either a Clerk id or a legacy profile id.  Co-teacher
 * access is resolved through `course_teachers`.
 */

import { Request, Response } from 'express';
import * as courseResourceService from '../../shared/services/courseResourceService';
import { supabase } from '../../../config/database';

type ResourcePlacement = {
  weekId?: string;
  lessonId?: string;
};

const resourceTypes = new Set([
  'pdf',
  'document',
  'image',
  'video',
  'audio',
  'link',
  'other',
]);

const getActor = (req: Request, res: Response) => {
  const userId = req.auth?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  return {
    userId,
    role: req.auth?.role || 'student',
  };
};

/**
 * Check a teacher/admin against a course without filtering a potentially UUID
 * `teacher_id` column with a Clerk id.  Some older rows store a profile UUID,
 * while newer rows can store a Clerk id, so the comparison is deliberately
 * done after retrieving the course.
 */
const authorizeCourse = async (req: Request, res: Response, courseId: string): Promise<boolean> => {
  const actor = getActor(req, res);
  if (!actor) return false;

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    console.error('Error resolving resource course:', courseError);
    res.status(500).json({ error: 'Unable to verify course access' });
    return false;
  }

  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return false;
  }

  if (actor.role === 'admin') {
    return true;
  }

  if (course.teacher_id === actor.userId) {
    return true;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', actor.userId)
    .maybeSingle();

  if (profileError || !profile) {
    if (profileError) {
      console.error('Error resolving teacher profile for resource access:', profileError);
    }
    res.status(403).json({ error: 'You do not have access to this course' });
    return false;
  }

  if (course.teacher_id === profile.id) {
    return true;
  }

  const { data: coTeacher, error: coTeacherError } = await supabase
    .from('course_teachers')
    .select('id')
    .eq('course_id', courseId)
    .eq('teacher_id', profile.id)
    .maybeSingle();

  if (coTeacherError) {
    console.error('Error resolving co-teacher resource access:', coTeacherError);
    res.status(500).json({ error: 'Unable to verify course access' });
    return false;
  }

  if (!coTeacher) {
    res.status(403).json({ error: 'You do not have access to this course' });
    return false;
  }

  return true;
};

/** Resolve a resource's parent course before authorizing update/delete. */
const authorizeResource = async (req: Request, res: Response, resourceId: string): Promise<boolean> => {
  const { data: resource, error: resourceError } = await supabase
    .from('course_resources')
    .select('id, course_id')
    .eq('id', resourceId)
    .maybeSingle();

  if (resourceError) {
    console.error('Error resolving resource:', resourceError);
    res.status(500).json({ error: 'Unable to verify resource access' });
    return false;
  }

  if (!resource || !resource.course_id) {
    res.status(404).json({ error: 'Resource not found' });
    return false;
  }

  return authorizeCourse(req, res, resource.course_id);
};

/**
 * A resource may be course-, week-, or lesson-level, but supplied child ids
 * must always belong to the course being edited.  A lesson implies its parent
 * week so hierarchy reads remain correct even when the client omits week_id.
 */
const resolveResourcePlacement = async (
  courseId: string,
  rawWeekId: unknown,
  rawLessonId: unknown,
): Promise<ResourcePlacement | null> => {
  const weekId = rawWeekId == null ? undefined : typeof rawWeekId === 'string' ? rawWeekId : null;
  const lessonId = rawLessonId == null ? undefined : typeof rawLessonId === 'string' ? rawLessonId : null;

  if (weekId === null || lessonId === null || weekId === '' || lessonId === '') {
    return null;
  }

  if (lessonId) {
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id, week_id')
      .eq('id', lessonId)
      .maybeSingle();

    if (lessonError || !lesson?.week_id) {
      return null;
    }

    const { data: lessonWeek, error: lessonWeekError } = await supabase
      .from('course_weeks')
      .select('id')
      .eq('id', lesson.week_id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (lessonWeekError || !lessonWeek || (weekId && weekId !== lesson.week_id)) {
      return null;
    }

    return { weekId: lesson.week_id, lessonId };
  }

  if (weekId) {
    const { data: week, error: weekError } = await supabase
      .from('course_weeks')
      .select('id')
      .eq('id', weekId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (weekError || !week) {
      return null;
    }
  }

  return weekId ? { weekId } : {};
};

const isValidResourceInput = (resource: Record<string, unknown>): boolean => (
  typeof resource.title === 'string' && resource.title.trim().length > 0 &&
  typeof resource.file_url === 'string' && resource.file_url.trim().length > 0 &&
  typeof resource.resource_type === 'string' && resourceTypes.has(resource.resource_type)
);

/**
 * Get all resources for a course with hierarchy.
 * GET /teacher/courses/:courseId/resources
 */
export const getCourseResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    if (!await authorizeCourse(req, res, courseId)) return;

    const hierarchy = await courseResourceService.getCourseResourcesHierarchy(courseId);
    res.json({ success: true, resources: hierarchy });
  } catch (error) {
    console.error('Error getting course resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

/**
 * Create a new resource.
 * POST /teacher/courses/:courseId/resources
 */
export const createResource = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, description, resource_type, file_url, file_size_kb, week_id, lesson_id, order_index } = req.body;

    if (!await authorizeCourse(req, res, courseId)) return;

    if (!isValidResourceInput({ title, resource_type, file_url })) {
      return res.status(400).json({ error: 'title, resource_type, and file_url are required' });
    }

    const placement = await resolveResourcePlacement(courseId, week_id, lesson_id);
    if (!placement) {
      return res.status(400).json({ error: 'The selected week or lesson does not belong to this course' });
    }

    const resource = await courseResourceService.createResource({
      course_id: courseId,
      week_id: placement.weekId,
      lesson_id: placement.lessonId,
      title: title.trim(),
      description: typeof description === 'string' ? description : undefined,
      resource_type,
      file_url: file_url.trim(),
      file_size_kb: typeof file_size_kb === 'number' ? file_size_kb : undefined,
      order_index: typeof order_index === 'number' ? order_index : undefined,
    });

    res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

/**
 * Bulk create resources.
 * POST /teacher/courses/:courseId/resources/bulk
 */
export const bulkCreateResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { resources } = req.body;

    if (!Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ error: 'Resources array is required' });
    }

    if (!await authorizeCourse(req, res, courseId)) return;

    const resourcesWithCourse: courseResourceService.CreateResourceInput[] = [];

    // Validate every row before creating any rows, preventing partial bulk
    // writes and preventing a teacher from attaching another course's lesson.
    for (const candidate of resources) {
      if (!candidate || typeof candidate !== 'object') {
        return res.status(400).json({ error: 'Each resource must be an object' });
      }

      const resource = candidate as Record<string, unknown>;
      if (!isValidResourceInput(resource)) {
        return res.status(400).json({ error: 'Each resource needs title, resource_type, and file_url' });
      }

      const placement = await resolveResourcePlacement(courseId, resource.week_id, resource.lesson_id);
      if (!placement) {
        return res.status(400).json({ error: 'Every selected week and lesson must belong to this course' });
      }

      resourcesWithCourse.push({
        course_id: courseId,
        week_id: placement.weekId,
        lesson_id: placement.lessonId,
        title: (resource.title as string).trim(),
        description: typeof resource.description === 'string' ? resource.description : undefined,
        resource_type: resource.resource_type as courseResourceService.CreateResourceInput['resource_type'],
        file_url: (resource.file_url as string).trim(),
        file_size_kb: typeof resource.file_size_kb === 'number' ? resource.file_size_kb : undefined,
        order_index: typeof resource.order_index === 'number' ? resource.order_index : undefined,
      });
    }

    const created = await courseResourceService.bulkCreateResources(resourcesWithCourse);
    res.status(201).json({ success: true, resources: created, count: created.length });
  } catch (error) {
    console.error('Error bulk creating resources:', error);
    res.status(500).json({ error: 'Failed to create resources' });
  }
};

/**
 * Update a resource.
 * PUT /teacher/resources/:resourceId
 */
export const updateResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { title, description, file_url, file_size_kb, order_index } = req.body;

    if (!await authorizeResource(req, res, resourceId)) return;

    const updated = await courseResourceService.updateResource(resourceId, {
      title: typeof title === 'string' ? title : undefined,
      description: typeof description === 'string' ? description : undefined,
      file_url: typeof file_url === 'string' ? file_url : undefined,
      file_size_kb: typeof file_size_kb === 'number' ? file_size_kb : undefined,
      order_index: typeof order_index === 'number' ? order_index : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ success: true, resource: updated });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
};

/**
 * Delete a resource.
 * DELETE /teacher/resources/:resourceId
 */
export const deleteResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;

    if (!await authorizeResource(req, res, resourceId)) return;

    const deleted = await courseResourceService.deleteResource(resourceId);

    if (!deleted) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};

/**
 * Get resource statistics for a course.
 * GET /teacher/courses/:courseId/resources/stats
 */
export const getResourceStats = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    if (!await authorizeCourse(req, res, courseId)) return;

    const stats = await courseResourceService.getResourceStats(courseId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting resource stats:', error);
    res.status(500).json({ error: 'Failed to fetch resource statistics' });
  }
};

/**
 * Reorder resources.
 * POST /teacher/courses/:courseId/resources/reorder
 */
export const reorderResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { resource_ids } = req.body;

    if (!Array.isArray(resource_ids) || resource_ids.length === 0 || !resource_ids.every((id) => typeof id === 'string' && id)) {
      return res.status(400).json({ error: 'resource_ids must be a non-empty string array' });
    }

    if (!await authorizeCourse(req, res, courseId)) return;

    const uniqueResourceIds = [...new Set(resource_ids)];
    if (uniqueResourceIds.length !== resource_ids.length) {
      return res.status(400).json({ error: 'resource_ids must not contain duplicates' });
    }

    const { data: courseResources, error: resourceError } = await supabase
      .from('course_resources')
      .select('id')
      .eq('course_id', courseId)
      .in('id', uniqueResourceIds);

    if (resourceError) {
      console.error('Error validating resources for reorder:', resourceError);
      return res.status(500).json({ error: 'Unable to validate resources' });
    }

    if ((courseResources || []).length !== uniqueResourceIds.length) {
      return res.status(403).json({ error: 'Every resource must belong to this course' });
    }

    await courseResourceService.reorderResources(uniqueResourceIds);
    res.json({ success: true, message: 'Resources reordered successfully' });
  } catch (error) {
    console.error('Error reordering resources:', error);
    res.status(500).json({ error: 'Failed to reorder resources' });
  }
};
