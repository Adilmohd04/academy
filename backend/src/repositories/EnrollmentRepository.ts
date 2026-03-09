/**
 * Enrollment Repository
 * 
 * Database access layer for enrollments table.
 */

import { BaseRepository } from './BaseRepository';

export interface EnrollmentRecord {
  id: string;
  course_id: string;
  user_id: string;
  student_id?: string;
  status: 'active' | 'completed' | 'dropped' | 'expired';
  progress: number;
  enrolled_at: string;
  completed_at?: string;
  payment_status?: string;
  [key: string]: unknown;
}

class EnrollmentRepository extends BaseRepository<EnrollmentRecord> {
  constructor() {
    super('enrollments');
  }

  /**
   * Find enrollments for a specific student.
   */
  async findByStudent(userId: string): Promise<EnrollmentRecord[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select(`
        *,
        courses(id, title, thumbnail_url, course_image_url, teacher_id, 
                profiles!courses_teacher_id_fkey(full_name))
      `)
      .or(`user_id.eq.${userId},student_id.eq.${userId}`)
      .order('enrolled_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch student enrollments: ${error.message}`);
    return (data || []) as EnrollmentRecord[];
  }

  /**
   * Find all enrollments for a course.
   */
  async findByCourse(courseId: string): Promise<EnrollmentRecord[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select(`
        *,
        profiles!enrollments_user_id_fkey(full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch course enrollments: ${error.message}`);
    return (data || []) as EnrollmentRecord[];
  }

  /**
   * Check if a student is enrolled in a course.
   */
  async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const { count, error } = await this.client
      .from(this.table)
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .or(`user_id.eq.${userId},student_id.eq.${userId}`)
      .eq('status', 'active');

    if (error) return false;
    return (count ?? 0) > 0;
  }

  /**
   * Get enrollment count for a course.
   */
  async countByCourse(courseId: string): Promise<number> {
    return this.count({ course_id: courseId, status: 'active' });
  }
}

export const enrollmentRepository = new EnrollmentRepository();
export default EnrollmentRepository;
