/**
 * Course Archival Controller
 * 
 * Handles course archival operations for teachers and admins
 */

import { Request, Response } from 'express';
import * as archivalService from '../../shared/services/courseArchivalService';
import pool from '../../../config/database';

/**
 * POST /api/admin/courses/:courseId/archive
 * Archive a course
 */
export const archiveCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    const { reason, notify_students } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is teacher or admin
    const { data: courseCheck, error: courseError } = await pool
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !courseCheck) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await archivalService.archiveCourse(courseId, userId, {
      reason,
      notify_students: notify_students ?? true,
    });

    res.json({ success: true, message: 'Course archived successfully' });
  } catch (error) {
    console.error('Error archiving course:', error);
    res.status(500).json({ error: 'Failed to archive course' });
  }
};

/**
 * POST /api/admin/courses/:courseId/restore
 * Restore an archived course
 */
export const restoreCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id || (req as any).auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await archivalService.restoreCourse(courseId, userId);

    res.json({ success: true, message: 'Course restored successfully' });
  } catch (error) {
    console.error('Error restoring course:', error);
    res.status(500).json({ error: 'Failed to restore course' });
  }
};

/**
 * GET /api/admin/courses/archived
 * Get all archived courses
 */
export const getArchivedCourses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;
    const { limit, offset } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const courses = await archivalService.getArchivedCourses({
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ success: true, courses, count: courses.length });
  } catch (error) {
    console.error('Error fetching archived courses:', error);
    res.status(500).json({ error: 'Failed to fetch archived courses' });
  }
};

/**
 * GET /api/teacher/courses/archived
 * Get teacher's archived courses
 */
export const getMyArchivedCourses = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?.id || (req as any).auth?.userId;
    const { limit, offset } = req.query;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const courses = await archivalService.getArchivedCourses({
      teacher_id: teacherId,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({ success: true, courses, count: courses.length });
  } catch (error) {
    console.error('Error fetching archived courses:', error);
    res.status(500).json({ error: 'Failed to fetch archived courses' });
  }
};

/**
 * GET /api/admin/courses/:courseId/archive-details
 * Get detailed information about an archived course
 */
export const getCourseArchiveDetails = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id || (req as any).auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const details = await archivalService.getCourseArchiveDetails(courseId);

    if (!details) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ success: true, details });
  } catch (error) {
    console.error('Error fetching archive details:', error);
    res.status(500).json({ error: 'Failed to fetch archive details' });
  }
};

/**
 * DELETE /api/admin/courses/:courseId/permanent
 * Permanently delete an archived course (admin only)
 */
export const permanentlyDeleteCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id || (req as any).auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Additional check: course must be archived first
    const details = await archivalService.getCourseArchiveDetails(courseId);
    if (!details || details.status !== 'archived') {
      return res.status(400).json({ error: 'Course must be archived before permanent deletion' });
    }

    await archivalService.permanentlyDeleteCourse(courseId, userId);

    res.json({ success: true, message: 'Course permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting course:', error);
    res.status(500).json({ error: 'Failed to permanently delete course' });
  }
};

/**
 * GET /api/admin/archive-statistics
 * Get archival statistics
 */
export const getArchiveStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await archivalService.getArchiveStatistics();

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching archive statistics:', error);
    res.status(500).json({ error: 'Failed to fetch archive statistics' });
  }
};

/**
 * POST /api/admin/courses/:courseId/convert-to-prerecorded
 * Convert an archived live/hybrid course to pre-recorded (admin only)
 */
export const convertToPreRecorded = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user?.id || (req as any).auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();
    try {
      // Check if course exists and is archived
      const courseCheck = await client.query(
        `SELECT id, title, course_type, archived_at, ends_at 
         FROM courses 
         WHERE id = $1`,
        [courseId]
      );

      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const course = courseCheck.rows[0];

      // Verify it's archived
      if (!course.archived_at) {
        return res.status(400).json({ 
          error: 'Course must be archived first',
          message: 'Only archived courses can be converted to pre-recorded'
        });
      }

      // Verify it's a live or hybrid course
      if (course.course_type !== 'live' && course.course_type !== 'hybrid') {
        return res.status(400).json({ 
          error: 'Invalid course type',
          message: 'Only live or hybrid courses can be converted to pre-recorded'
        });
      }

      // Convert the course
      await client.query(
        `UPDATE courses 
         SET course_type = 'pre-recorded',
             archived_at = NULL,
             ends_at = NULL,
             status = 'draft',
             approval_status = 'pending',
             updated_at = NOW()
         WHERE id = $1`,
        [courseId]
      );

      res.json({ 
        success: true, 
        message: 'Course converted to pre-recorded successfully',
        data: {
          course_id: courseId,
          title: course.title,
          previous_type: course.course_type,
          new_type: 'pre-recorded',
          status: 'draft - requires re-approval'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error converting course to pre-recorded:', error);
    res.status(500).json({ error: 'Failed to convert course' });
  }
};
