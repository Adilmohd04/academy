/**
 * Course Types
 * 
 * Central location for all TypeScript interfaces and types used in the courses feature.
 */

export interface Course {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  status: 'draft' | 'published' | 'archived';
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  price: number;
  is_free: boolean;
  thumbnail_url?: string;
  duration_weeks: number;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  completion_percentage: number;
}

export interface CourseLesson {
  id: string;
  course_week_id: string;
  title: string;
  content?: string;
  order: number;
  created_at: string;
}

export interface CourseWeek {
  id: string;
  course_id: string;
  week_number: number;
  title: string;
  lessons?: CourseLesson[];
  created_at: string;
}
