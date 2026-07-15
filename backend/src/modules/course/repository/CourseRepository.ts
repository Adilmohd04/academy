/**
 * Course Repository
 * 
 * Database access layer for courses table.
 * Encapsulates all Supabase-specific query logic for courses.
 */

import { BaseRepository, QueryOptions } from '../../../repositories/BaseRepository';

export interface CourseRecord {
  id: string;
  title: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  teacher_id: string;
  teacher_name?: string;
  price: number;
  is_free: boolean;
  thumbnail_url?: string;
  course_image_url?: string;
  duration_weeks: number;
  status: 'draft' | 'published' | 'archived';
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  category?: string;
  level?: string;
  prerequisites?: string;
  enrollment_cap?: number;
  enrolled_count: number;
  passing_threshold: number;
  course_languages?: string[];
  created_at: string;
  updated_at: string;
  published_at?: string;
  [key: string]: unknown;
}

export interface CourseFilters {
  status?: string;
  approval_status?: string;
  teacher_id?: string;
  category?: string;
  is_free?: boolean;
}

class CourseRepository extends BaseRepository<CourseRecord> {
  constructor() {
    super('courses');
  }

  /**
   * Fetch all courses with teacher profile and enrollment count.
   * This is the most common query – replaces the direct Supabase call
   * that was duplicated across admin, teacher, and student services.
   */
  async findAllWithRelations(
    filters: CourseFilters = {},
    options: QueryOptions = {},
  ): Promise<CourseRecord[]> {
    let q = this.client
      .from(this.table)
      .select(`
        *,
        profiles!courses_teacher_id_fkey(full_name, avatar_url, clerk_user_id),
        course_teachers(role, profiles(clerk_user_id, full_name, avatar_url)),
        enrollments(id)
      `);

    if (filters.status) q = q.eq('status', filters.status);
    if (filters.approval_status) q = q.eq('approval_status', filters.approval_status);
    if (filters.teacher_id) q = q.eq('teacher_id', filters.teacher_id);
    if (filters.category) q = q.eq('category', filters.category);
    if (filters.is_free !== undefined) q = q.eq('is_free', filters.is_free);

    if (options.orderBy) {
      q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
    } else {
      q = q.order('created_at', { ascending: false });
    }

    if (options.limit) q = q.limit(options.limit);

    const { data, error } = await q;
    if (error) throw new Error(`Failed to fetch courses: ${error.message}`);
    return (data || []) as CourseRecord[];
  }

  /**
   * Find a single course with full details including weeks and lessons.
   */
  async findByIdWithDetails(id: string): Promise<CourseRecord | null> {
    const { data, error } = await this.client
      .from(this.table)
      .select(`
        *,
        profiles!courses_teacher_id_fkey(full_name, avatar_url, clerk_user_id),
        course_teachers(role, profiles(clerk_user_id, full_name, avatar_url)),
        course_weeks(*, course_lessons(*))
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch course details: ${error.message}`);
    return data as CourseRecord | null;
  }

  /**
   * Find courses by teacher with enrollments.
   */
  async findByTeacher(teacherId: string): Promise<CourseRecord[]> {
    return this.findAllWithRelations({ teacher_id: teacherId });
  }

  /**
   * Find published and approved courses (storefront query).
   */
  async findPublished(options: QueryOptions = {}): Promise<CourseRecord[]> {
    return this.findAllWithRelations(
      { status: 'published', approval_status: 'approved' },
      options,
    );
  }

  /**
   * Find courses pending admin approval.
   */
  async findPendingApproval(): Promise<CourseRecord[]> {
    return this.findAllWithRelations({ approval_status: 'pending_approval' });
  }

  /**
   * Update approval status (admin action).
   */
  async updateApprovalStatus(
    id: string,
    status: 'approved' | 'rejected' | 'pending_approval',
  ): Promise<CourseRecord> {
    return this.update(id, {
      approval_status: status,
      updated_at: new Date().toISOString(),
    } as Partial<CourseRecord>);
  }
}

// Singleton export
export const courseRepository = new CourseRepository();
export default CourseRepository;
