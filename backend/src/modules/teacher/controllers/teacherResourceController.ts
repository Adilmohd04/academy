/**
 * Teacher Resource Management Controller
 * 
 * Handles resource management for teachers:
 * - Upload resources to courses/weeks/lessons
 * - Update and delete resources
 * - View resource statistics
 * - Bulk operations
 */

import { Request, Response } from 'express';
import * as courseResourceService from '../../shared/services/courseResourceService';
import pool from '../../../config/database';

/**
 * Get all resources for a course with hierarchy
 * GET /teacher/courses/:courseId/resources
 */
export const getCourseResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = (req as any).user.id;

    // Verify teacher owns/teaches this course
    const client = await pool.connect();
    try {
      const courseCheck = await client.query(
        'SELECT id FROM courses WHERE id = $1 AND teacher_id = $2',
        [courseId, teacherId]
      );

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this course' });
      }
    } finally {
      client.release();
    }

    const hierarchy = await courseResourceService.getCourseResourcesHierarchy(courseId);
    res.json({ success: true, resources: hierarchy });
  } catch (error) {
    console.error('Error getting course resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
};

/**
 * Create a new resource
 * POST /teacher/courses/:courseId/resources
 */
export const createResource = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = (req as any).user.id;
    const { title, description, resource_type, file_url, file_size_kb, week_id, lesson_id, order_index } = req.body;

    // Verify teacher owns/teaches this course
    const { data: courseCheck2, error: courseError2 } = await pool
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (courseError2 || !courseCheck2) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    const resource = await courseResourceService.createResource({
      course_id: courseId,
      week_id,
      lesson_id,
      title,
      description,
      resource_type,
      file_url,
      file_size_kb,
      order_index,
    });

    res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error('Error creating resource:', error);
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

/**
 * Bulk create resources
 * POST /teacher/courses/:courseId/resources/bulk
 */
export const bulkCreateResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = (req as any).user.id;
    const { resources } = req.body;

    if (!Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ error: 'Resources array is required' });
    }

    // Verify teacher owns/teaches this course
    const { data: courseCheck3, error: courseError3 } = await pool
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (courseError3 || !courseCheck3) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    // Add course_id to each resource
    const resourcesWithCourse = resources.map((r) => ({ ...r, course_id: courseId }));
    const created = await courseResourceService.bulkCreateResources(resourcesWithCourse);

    res.status(201).json({ success: true, resources: created, count: created.length });
  } catch (error) {
    console.error('Error bulk creating resources:', error);
    res.status(500).json({ error: 'Failed to create resources' });
  }
};

/**
 * Update a resource
 * PUT /teacher/resources/:resourceId
 */
export const updateResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const teacherId = (req as any).user.id;
    const { title, description, file_url, file_size_kb, order_index } = req.body;

    // Verify teacher owns the course this resource belongs to
    const { data: resourceCheck, error: resourceError } = await pool
      .from('course_resources')
      .select('cr.id')
      .eq('cr.id', resourceId)
      .eq('c.teacher_id', teacherId)
      .limit(1)
      .maybeSingle();

    if (resourceError || !resourceCheck) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

    const updated = await courseResourceService.updateResource(resourceId, {
      title,
      description,
      file_url,
      file_size_kb,
      order_index,
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
 * Delete a resource
 * DELETE /teacher/resources/:resourceId
 */
export const deleteResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const teacherId = (req as any).user.id;

    // Verify teacher owns the course this resource belongs to
    const { data: resourceCheck2, error: resourceError2 } = await pool
      .from('course_resources')
      .select('cr.id')
      .eq('cr.id', resourceId)
      .limit(1)
      .maybeSingle();

    if (resourceError2 || !resourceCheck2) {
      return res.status(403).json({ error: 'Access denied to this resource' });
    }

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
 * Get resource statistics for a course
 * GET /teacher/courses/:courseId/resources/stats
 */
export const getResourceStats = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = (req as any).user.id;

    // Verify teacher owns/teaches this course
    const { data: courseCheck4, error: courseError4 } = await pool
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (courseError4 || !courseCheck4) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    const stats = await courseResourceService.getResourceStats(courseId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting resource stats:', error);
    res.status(500).json({ error: 'Failed to fetch resource statistics' });
  }
};

/**
 * Reorder resources
 * POST /teacher/courses/:courseId/resources/reorder
 */
export const reorderResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = (req as any).user.id;
    const { resource_ids } = req.body;

    if (!Array.isArray(resource_ids) || resource_ids.length === 0) {
      return res.status(400).json({ error: 'resource_ids array is required' });
    }

    // Verify teacher owns/teaches this course
    const { data: courseCheck5, error: courseError5 } = await pool
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('teacher_id', teacherId)
      .maybeSingle();

    if (courseError5 || !courseCheck5) {
      return res.status(403).json({ error: 'Access denied to this course' });
    }

    await courseResourceService.reorderResources(resource_ids);
    res.json({ success: true, message: 'Resources reordered successfully' });
  } catch (error) {
    console.error('Error reordering resources:', error);
    res.status(500).json({ error: 'Failed to reorder resources' });
  }
};
