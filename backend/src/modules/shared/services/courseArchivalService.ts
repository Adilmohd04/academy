/**
 * Course Archival Service
 * 
 * Manages course lifecycle:
 * - Archive courses (soft delete - preserves data)
 * - Restore archived courses
 * - List archived courses
 * - Cleanup old archived courses
 */

import pool from '../../../config/database';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ArchivedCourse {
  id: string;
  title: string;
  teacher_id: string;
  teacher_name: string;
  status: string;
  archived_at: Date;
  archived_by: string;
  archive_reason: string | null;
  enrolled_count: number;
  total_lessons: number;
  total_resources: number;
}

export interface ArchiveOptions {
  reason?: string;
  notify_students?: boolean;
  preserve_data?: boolean; // Default true
}

// ============================================
// ARCHIVE OPERATIONS
// ============================================

/**
 * Archive a course (soft delete)
 */
export const archiveCourse = async (
  courseId: string,
  archivedBy: string,
  options: ArchiveOptions = {}
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update course status to archived
    await client.query(
      `UPDATE courses 
       SET status = 'archived',
           updated_at = NOW()
       WHERE id = $1`,
      [courseId]
    );

    // Log archive action
    await client.query(
      `INSERT INTO course_archive_log (course_id, archived_by, archive_reason, action, performed_at)
       VALUES ($1, $2, $3, 'archived', NOW())`,
      [courseId, archivedBy, options.reason || 'No reason provided']
    );

    // Optionally notify enrolled students
    if (options.notify_students) {
      const studentsResult = await client.query(
        `SELECT DISTINCT student_id FROM course_enrollments 
         WHERE course_id = $1 AND status = 'active'`,
        [courseId]
      );

      const courseResult = await client.query(
        'SELECT title FROM courses WHERE id = $1',
        [courseId]
      );
      const courseTitle = courseResult.rows[0]?.title || 'Unknown Course';

      // Create notifications for enrolled students
      for (const row of studentsResult.rows) {
        await client.query(
          `INSERT INTO user_notifications (user_id, type, category, title, message, related_id, related_type)
           VALUES ($1, 'announcement', 'info', 'Course Archived', 
                   'The course "${courseTitle}" has been archived. You can still access your progress and materials.', 
                   $2, 'course')`,
          [row.student_id, courseId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Restore an archived course
 */
export const restoreCourse = async (
  courseId: string,
  restoredBy: string
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update course status to draft (teacher can re-publish)
    await client.query(
      `UPDATE courses 
       SET status = 'draft',
           updated_at = NOW()
       WHERE id = $1`,
      [courseId]
    );

    // Log restore action
    await client.query(
      `INSERT INTO course_archive_log (course_id, archived_by, action, performed_at)
       VALUES ($1, $2, 'restored', NOW())`,
      [courseId, restoredBy]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all archived courses
 */
export const getArchivedCourses = async (filters?: {
  teacher_id?: string;
  limit?: number;
  offset?: number;
}): Promise<ArchivedCourse[]> => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT 
        c.id,
        c.title,
        c.teacher_id,
        p.full_name as teacher_name,
        c.status,
        cal.performed_at as archived_at,
        cal.archived_by,
        cal.archive_reason,
        c.enrolled_count,
        (SELECT COUNT(*) FROM course_lessons cl 
         JOIN course_weeks cw ON cl.week_id = cw.id 
         WHERE cw.course_id = c.id) as total_lessons,
        (SELECT COUNT(*) FROM course_resources WHERE course_id = c.id) as total_resources
      FROM courses c
      LEFT JOIN profiles p ON c.teacher_id = p.clerk_user_id
      LEFT JOIN LATERAL (
        SELECT * FROM course_archive_log 
        WHERE course_id = c.id AND action = 'archived'
        ORDER BY performed_at DESC 
        LIMIT 1
      ) cal ON true
      WHERE c.status = 'archived'
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters?.teacher_id) {
      query += ` AND c.teacher_id = $${paramCount}`;
      params.push(filters.teacher_id);
      paramCount++;
    }

    query += ' ORDER BY cal.performed_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
      paramCount++;
    }

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get course archive details
 */
export const getCourseArchiveDetails = async (courseId: string): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT c.*, 
              cal.archived_by,
              cal.archive_reason,
              cal.performed_at as archived_at,
              (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as total_enrollments,
              (SELECT COUNT(*) FROM course_weeks WHERE course_id = c.id) as total_weeks,
              (SELECT COUNT(*) FROM course_lessons cl 
               JOIN course_weeks cw ON cl.week_id = cw.id 
               WHERE cw.course_id = c.id) as total_lessons,
              (SELECT COUNT(*) FROM course_resources WHERE course_id = c.id) as total_resources
       FROM courses c
       LEFT JOIN LATERAL (
         SELECT * FROM course_archive_log 
         WHERE course_id = c.id AND action = 'archived'
         ORDER BY performed_at DESC 
         LIMIT 1
       ) cal ON true
       WHERE c.id = $1`,
      [courseId]
    );

    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * Permanently delete archived course (admin only)
 * WARNING: This is irreversible!
 */
export const permanentlyDeleteCourse = async (
  courseId: string,
  deletedBy: string
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Log permanent deletion
    await client.query(
      `INSERT INTO course_archive_log (course_id, archived_by, action, performed_at)
       VALUES ($1, $2, 'permanently_deleted', NOW())`,
      [courseId, deletedBy]
    );

    // Delete course (CASCADE will handle related records)
    await client.query('DELETE FROM courses WHERE id = $1', [courseId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get archive statistics
 */
export const getArchiveStatistics = async (teacherId?: string): Promise<any> => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT 
        COUNT(*) as total_archived,
        SUM(enrolled_count) as total_affected_students,
        MIN((SELECT performed_at FROM course_archive_log 
             WHERE course_id = c.id AND action = 'archived' 
             ORDER BY performed_at DESC LIMIT 1)) as oldest_archive,
        MAX((SELECT performed_at FROM course_archive_log 
             WHERE course_id = c.id AND action = 'archived' 
             ORDER BY performed_at DESC LIMIT 1)) as newest_archive
      FROM courses c
      WHERE c.status = 'archived'
    `;

    const params: any[] = [];
    if (teacherId) {
      query += ' AND c.teacher_id = $1';
      params.push(teacherId);
    }

    const result = await client.query(query, params);
    return result.rows[0] || {
      total_archived: 0,
      total_affected_students: 0,
      oldest_archive: null,
      newest_archive: null,
    };
  } finally {
    client.release();
  }
};
