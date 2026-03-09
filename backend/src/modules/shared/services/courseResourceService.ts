/**
 * Course Resource Management Service
 * 
 * Enhanced resource management for course materials:
 * - Upload/link resources to courses, weeks, or lessons
 * - Organize by type (PDF, video, audio, document, link)
 * - Track file sizes and URLs
 * - Support hierarchical organization (course > week > lesson)
 * - List resources with filtering
 * - Delete resources (with file cleanup if needed)
 */

import pool from '../../../config/database';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CourseResource {
  id: string;
  course_id: string | null;
  week_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  resource_type: 'pdf' | 'document' | 'image' | 'video' | 'audio' | 'link' | 'other';
  file_url: string;
  file_size_kb: number | null;
  order_index: number;
  created_at: Date;
}

export interface CreateResourceInput {
  course_id?: string;
  week_id?: string;
  lesson_id?: string;
  title: string;
  description?: string;
  resource_type: 'pdf' | 'document' | 'image' | 'video' | 'audio' | 'link' | 'other';
  file_url: string;
  file_size_kb?: number;
  order_index?: number;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  file_url?: string;
  file_size_kb?: number;
  order_index?: number;
}

export interface ResourceFilter {
  course_id?: string;
  week_id?: string;
  lesson_id?: string;
  resource_type?: string;
  search?: string;
}

export interface ResourceStats {
  total_resources: number;
  by_type: {
    pdf: number;
    document: number;
    image: number;
    video: number;
    audio: number;
    link: number;
    other: number;
  };
  total_size_mb: number;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Create a new resource
 */
export const createResource = async (data: CreateResourceInput): Promise<CourseResource> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO course_resources (
        course_id, week_id, lesson_id, title, description,
        resource_type, file_url, file_size_kb, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.course_id || null,
        data.week_id || null,
        data.lesson_id || null,
        data.title,
        data.description || null,
        data.resource_type,
        data.file_url,
        data.file_size_kb || null,
        data.order_index || 0,
      ]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
};

/**
 * Get resource by ID
 */
export const getResourceById = async (resourceId: string): Promise<CourseResource | null> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM course_resources WHERE id = $1',
      [resourceId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
};

/**
 * List resources with optional filtering
 */
export const listResources = async (filter: ResourceFilter = {}): Promise<CourseResource[]> => {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM course_resources WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Apply filters
    if (filter.course_id) {
      query += ` AND course_id = $${paramCount}`;
      params.push(filter.course_id);
      paramCount++;
    }

    if (filter.week_id) {
      query += ` AND week_id = $${paramCount}`;
      params.push(filter.week_id);
      paramCount++;
    }

    if (filter.lesson_id) {
      query += ` AND lesson_id = $${paramCount}`;
      params.push(filter.lesson_id);
      paramCount++;
    }

    if (filter.resource_type) {
      query += ` AND resource_type = $${paramCount}`;
      params.push(filter.resource_type);
      paramCount++;
    }

    if (filter.search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${filter.search}%`);
      paramCount++;
    }

    query += ' ORDER BY order_index ASC, created_at DESC';

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get resources for a course with hierarchy
 */
export const getCourseResourcesHierarchy = async (courseId: string) => {
  const client = await pool.connect();
  try {
    // Get all resources for the course
    const resourcesResult = await client.query(
      `SELECT 
        cr.*,
        cw.week_number,
        cw.title as week_title,
        cl.title as lesson_title,
        cl.order_index as lesson_order
      FROM course_resources cr
      LEFT JOIN course_weeks cw ON cr.week_id = cw.id
      LEFT JOIN course_lessons cl ON cr.lesson_id = cl.id
      WHERE cr.course_id = $1
      ORDER BY 
        COALESCE(cw.week_number, 999),
        COALESCE(cl.order_index, 999),
        cr.order_index,
        cr.created_at DESC`,
      [courseId]
    );

    // Organize by hierarchy
    const hierarchy = {
      course_level: [] as any[],
      weeks: {} as any,
    };

    resourcesResult.rows.forEach((resource: any) => {
      if (!resource.week_id) {
        // Course-level resource
        hierarchy.course_level.push(resource);
      } else if (!resource.lesson_id) {
        // Week-level resource
        if (!hierarchy.weeks[resource.week_id]) {
          hierarchy.weeks[resource.week_id] = {
            week_number: resource.week_number,
            week_title: resource.week_title,
            resources: [],
            lessons: {},
          };
        }
        hierarchy.weeks[resource.week_id].resources.push(resource);
      } else {
        // Lesson-level resource
        if (!hierarchy.weeks[resource.week_id]) {
          hierarchy.weeks[resource.week_id] = {
            week_number: resource.week_number,
            week_title: resource.week_title,
            resources: [],
            lessons: {},
          };
        }
        if (!hierarchy.weeks[resource.week_id].lessons[resource.lesson_id]) {
          hierarchy.weeks[resource.week_id].lessons[resource.lesson_id] = {
            lesson_title: resource.lesson_title,
            lesson_order: resource.lesson_order,
            resources: [],
          };
        }
        hierarchy.weeks[resource.week_id].lessons[resource.lesson_id].resources.push(resource);
      }
    });

    return hierarchy;
  } finally {
    client.release();
  }
};

/**
 * Update resource
 */
export const updateResource = async (
  resourceId: string,
  data: UpdateResourceInput
): Promise<CourseResource | null> => {
  const client = await pool.connect();
  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramCount}`);
      params.push(data.title);
      paramCount++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(data.description);
      paramCount++;
    }

    if (data.file_url !== undefined) {
      updates.push(`file_url = $${paramCount}`);
      params.push(data.file_url);
      paramCount++;
    }

    if (data.file_size_kb !== undefined) {
      updates.push(`file_size_kb = $${paramCount}`);
      params.push(data.file_size_kb);
      paramCount++;
    }

    if (data.order_index !== undefined) {
      updates.push(`order_index = $${paramCount}`);
      params.push(data.order_index);
      paramCount++;
    }

    if (updates.length === 0) {
      return await getResourceById(resourceId);
    }

    params.push(resourceId);
    const query = `
      UPDATE course_resources 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
};

/**
 * Delete resource
 */
export const deleteResource = async (resourceId: string): Promise<boolean> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM course_resources WHERE id = $1 RETURNING id',
      [resourceId]
    );

    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
};

/**
 * Get resource statistics for a course
 */
export const getResourceStats = async (courseId: string): Promise<ResourceStats> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        COUNT(*) as total_resources,
        SUM(CASE WHEN resource_type = 'pdf' THEN 1 ELSE 0 END) as pdf,
        SUM(CASE WHEN resource_type = 'document' THEN 1 ELSE 0 END) as document,
        SUM(CASE WHEN resource_type = 'image' THEN 1 ELSE 0 END) as image,
        SUM(CASE WHEN resource_type = 'video' THEN 1 ELSE 0 END) as video,
        SUM(CASE WHEN resource_type = 'audio' THEN 1 ELSE 0 END) as audio,
        SUM(CASE WHEN resource_type = 'link' THEN 1 ELSE 0 END) as link,
        SUM(CASE WHEN resource_type = 'other' THEN 1 ELSE 0 END) as other,
        COALESCE(SUM(file_size_kb) / 1024.0, 0) as total_size_mb
      FROM course_resources
      WHERE course_id = $1`,
      [courseId]
    );

    const row = result.rows[0];
    return {
      total_resources: parseInt(row.total_resources) || 0,
      by_type: {
        pdf: parseInt(row.pdf) || 0,
        document: parseInt(row.document) || 0,
        image: parseInt(row.image) || 0,
        video: parseInt(row.video) || 0,
        audio: parseInt(row.audio) || 0,
        link: parseInt(row.link) || 0,
        other: parseInt(row.other) || 0,
      },
      total_size_mb: parseFloat(row.total_size_mb) || 0,
    };
  } finally {
    client.release();
  }
};

/**
 * Reorder resources
 */
export const reorderResources = async (resourceIds: string[]): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < resourceIds.length; i++) {
      await client.query(
        'UPDATE course_resources SET order_index = $1 WHERE id = $2',
        [i, resourceIds[i]]
      );
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
 * Bulk create resources (for batch upload)
 */
export const bulkCreateResources = async (resources: CreateResourceInput[]): Promise<CourseResource[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created: CourseResource[] = [];
    for (const data of resources) {
      const result = await client.query(
        `INSERT INTO course_resources (
          course_id, week_id, lesson_id, title, description,
          resource_type, file_url, file_size_kb, order_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.course_id || null,
          data.week_id || null,
          data.lesson_id || null,
          data.title,
          data.description || null,
          data.resource_type,
          data.file_url,
          data.file_size_kb || null,
          data.order_index || 0,
        ]
      );
      created.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
