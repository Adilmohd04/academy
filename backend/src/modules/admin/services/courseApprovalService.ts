/**
 * Course Approval Service
 * 
 * Handles course approval workflow:
 * - Teacher requests course approval
 * - Admin approves/rejects courses
 * - View pending approvals
 */

import { supabase } from '../../../config/database';

export interface CourseApprovalRequest {
  id: string;
  title: string;
  description?: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_email?: string;
  course_type: 'pre_recorded' | 'live' | 'hybrid';
  category?: string;
  level?: string;
  price: number;
  approval_status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

/**
 * Submit course for approval (Teacher)
 */
export const submitForApproval = async (courseId: string, teacherId: string): Promise<CourseApprovalRequest> => {
  // First verify the teacher owns this course
  const { data: course, error: fetchError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (fetchError || !course) {
    throw new Error('Course not found or you do not have permission');
  }

  if (course.approval_status === 'pending_approval') {
    throw new Error('Course is already pending approval');
  }

  if (course.approval_status === 'approved') {
    throw new Error('Course is already approved');
  }

  // Update to pending approval
  const { data, error } = await supabase
    .from('courses')
    .update({
      approval_status: 'pending_approval',
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit for approval: ${error.message}`);
  }

  return data;
};

/**
 * Get all pending approval requests (Admin)
 */
export const getPendingApprovals = async (): Promise<CourseApprovalRequest[]> => {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('approval_status', 'pending_approval')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch pending approvals: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // Enrich with teacher info from profiles
  const teacherIds = [...new Set(data.map(c => c.teacher_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('clerk_user_id, full_name, email')
    .in('clerk_user_id', teacherIds);

  const profileMap = new Map((profiles || []).map(p => [p.clerk_user_id, p]));

  return data.map((course: any) => {
    const teacher = profileMap.get(course.teacher_id);
    return {
      ...course,
      teacher_name: teacher?.full_name || 'Unknown',
      teacher_email: teacher?.email || null
    };
  });
};

/**
 * Approve a course (Admin)
 */
export const approveCourse = async (courseId: string, adminId: string): Promise<CourseApprovalRequest> => {
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('courses')
    .update({
      approval_status: 'approved',
      updated_at: timestamp
    })
    .eq('id', courseId)
    .eq('approval_status', 'pending_approval')
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to approve course: ${error.message}`);
  }

  if (!data) {
    throw new Error('Course approval returned no data');
  }

  let teacherName = 'Unknown Teacher';
  let teacherEmail: string | null = null;

  if (data.teacher_id) {
    const { data: teacherProfileByClerk } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', data.teacher_id)
      .maybeSingle();

    const { data: teacherProfileById } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', data.teacher_id)
      .maybeSingle();

    const teacherProfile = teacherProfileByClerk || teacherProfileById;

    teacherName = teacherProfile?.full_name || teacherName;
    teacherEmail = teacherProfile?.email || null;
  }

  return {
    ...data,
    teacher_name: teacherName,
    teacher_email: teacherEmail,
  };
};

/**
 * Reject a course (Admin)
 */
export const rejectCourse = async (
  courseId: string, 
  adminId: string, 
  reason: string
): Promise<CourseApprovalRequest> => {
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('courses')
    .update({
      approval_status: 'rejected',
      rejection_reason: reason,
      updated_at: timestamp
    })
    .eq('id', courseId)
    .eq('approval_status', 'pending_approval')
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reject course: ${error.message}`);
  }

  return data;
};

/**
 * Get all courses for admin (with any status)
 */
export const getAllCoursesAdmin = async (filters?: {
  approval_status?: string;
  status?: string;
  teacher_id?: string;
}): Promise<CourseApprovalRequest[]> => {
  let query = supabase
    .from('courses')
    .select('*');

  if (filters?.approval_status) {
    query = query.eq('approval_status', filters.approval_status);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch courses: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // Enrich with teacher info from profiles
  const teacherIds = [...new Set(data.map(c => c.teacher_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('clerk_user_id, full_name, email')
    .in('clerk_user_id', teacherIds);

  const profileMap = new Map((profiles || []).map(p => [p.clerk_user_id, p]));

  return data.map((course: any) => {
    const teacher = profileMap.get(course.teacher_id);
    return {
      ...course,
      teacher_name: teacher?.full_name || 'Unknown',
      teacher_email: teacher?.email || null
    };
  });
};

/**
 * Delete course (Admin)
 */
export const deleteCourseAdmin = async (courseId: string): Promise<void> => {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) {
    throw new Error(`Failed to delete course: ${error.message}`);
  }
};
