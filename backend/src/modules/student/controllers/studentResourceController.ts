/**
 * Student Resource Access Controller
 * 
 * Handles resource access for students:
 * - View course resources (with enrollment verification)
 * - Search and filter resources
 * - Get resource details
 */

import { Request, Response } from 'express';
import * as courseResourceService from '../../shared/services/courseResourceService';
import pool from '../../../config/database';

/**
 * Get all resources for a course (student view)
 * GET /student/courses/:courseId/resources
 */
export const getCourseResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = (req as any).user.id;

    // Verify student is enrolled in this course
    const client = await pool.connect();
    try {
      const enrollmentCheck = await client.query(
        'SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2',
        [courseId, studentId]
      );

      if (enrollmentCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
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
 * Search/filter resources in a course
 * GET /student/courses/:courseId/resources/search
 */
export const searchResources = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = (req as any).user.id;
    const { resource_type, search, week_id, lesson_id } = req.query;

    // Verify student is enrolled in this course
    const { data: enrollmentCheck2, error: enrollmentError2 } = await pool
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (enrollmentError2 || !enrollmentCheck2) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const resources = await courseResourceService.listResources({
      course_id: courseId,
      resource_type: resource_type as string,
      search: search as string,
      week_id: week_id as string,
      lesson_id: lesson_id as string,
    });

    res.json({ success: true, resources, count: resources.length });
  } catch (error) {
    console.error('Error searching resources:', error);
    res.status(500).json({ error: 'Failed to search resources' });
  }
};

/**
 * Get a specific resource (with enrollment check)
 * GET /student/resources/:resourceId
 */
export const getResource = async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const studentId = (req as any).user.id;

    const resource = await courseResourceService.getResourceById(resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Verify student is enrolled in the course this resource belongs to
    if (resource.course_id) {
      const { data: enrollmentCheck3, error: enrollmentError3 } = await pool
        .from('course_enrollments')
        .select('id')
        .eq('course_id', resource.course_id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (enrollmentError3 || !enrollmentCheck3) {
        return res.status(403).json({ error: 'Not enrolled in this course' });
      }
    }

    res.json({ success: true, resource });
  } catch (error) {
    console.error('Error getting resource:', error);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
};

/**
 * Get resource statistics for a course (student view)
 * GET /student/courses/:courseId/resources/stats
 */
export const getResourceStats = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = (req as any).user.id;

    // Verify student is enrolled in this course
    const { data: enrollmentCheck4, error: enrollmentError4 } = await pool
      .from('course_enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (enrollmentError4 || !enrollmentCheck4) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    const stats = await courseResourceService.getResourceStats(courseId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting resource stats:', error);
    res.status(500).json({ error: 'Failed to fetch resource statistics' });
  }
};
