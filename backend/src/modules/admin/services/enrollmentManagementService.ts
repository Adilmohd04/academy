/**
 * Admin Enrollment Service
 * 
 * Handles manual enrollment management by admins
 */

import { supabase } from '../../../config/database';

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_id?: string;
  amount_paid?: number;
  enrolled_at: string;
  student_name?: string;
  student_email?: string;
  course_title?: string;
}

/**
 * Get all enrollments for a course
 */
export const getCourseEnrollments = async (courseId: string): Promise<Enrollment[]> => {
  // Step 1: Fetch enrollments without FK joins
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Step 2: Get student profiles
  const studentIds = [...new Set(data.map((e: any) => e.student_id).filter(Boolean))];
  let profilesMap: Record<string, any> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);
    
    if (profiles) {
      profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
  }

  // Step 3: Get course info
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .single();

  return (data || []).map((e: any) => {
    const profile = profilesMap[e.student_id];
    return {
      ...e,
      student_name: profile?.full_name || 'Unknown',
      student_email: profile?.email,
      course_title: course?.title
    };
  });
};

/**
 * Get all enrollments (admin view)
 */
export const getAllEnrollments = async (filters?: {
  course_id?: string;
  student_id?: string;
  payment_status?: string;
}): Promise<Enrollment[]> => {
  // Step 1: Fetch enrollments without FK joins
  let query = supabase
    .from('enrollments')
    .select('*');

  if (filters?.course_id) {
    query = query.eq('course_id', filters.course_id);
  }

  if (filters?.student_id) {
    query = query.eq('student_id', filters.student_id);
  }

  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status);
  }

  query = query.order('enrolled_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch enrollments: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Step 2: Get student profiles
  const studentIds = [...new Set(data.map((e: any) => e.student_id).filter(Boolean))];
  let profilesMap: Record<string, any> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);
    
    if (profiles) {
      profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
  }

  // Step 3: Get course info
  const courseIds = [...new Set(data.map((e: any) => e.course_id).filter(Boolean))];
  let coursesMap: Record<string, any> = {};
  if (courseIds.length > 0) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds);
    
    if (courses) {
      coursesMap = courses.reduce((acc: Record<string, any>, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {});
    }
  }

  return (data || []).map((e: any) => {
    const profile = profilesMap[e.student_id];
    const course = coursesMap[e.course_id];
    return {
      ...e,
      student_name: profile?.full_name || 'Unknown',
      student_email: profile?.email,
      course_title: course?.title
    };
  });
};

/**
 * Manually enroll a student (Admin)
 */
export const manualEnroll = async (
  courseId: string,
  studentId: string,
  adminId: string,
  notes?: string
): Promise<Enrollment> => {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .single();

  if (existing) {
    throw new Error('Student is already enrolled in this course');
  }

  const { data, error } = await supabase
    .from('enrollments')
    .insert([{
      course_id: courseId,
      student_id: studentId,
      payment_status: 'completed',
      payment_id: `ADMIN_${adminId}_${Date.now()}`,
      amount_paid: 0,
      enrolled_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to enroll student: ${error.message}`);
  }

  return data;
};

/**
 * Remove enrollment (Admin)
 */
export const removeEnrollment = async (enrollmentId: string): Promise<void> => {
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId);

  if (error) {
    throw new Error(`Failed to remove enrollment: ${error.message}`);
  }
};

/**
 * Update enrollment status (Admin)
 */
export const updateEnrollmentStatus = async (
  enrollmentId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded'
): Promise<Enrollment> => {
  const { data, error } = await supabase
    .from('enrollments')
    .update({ payment_status: status })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update enrollment: ${error.message}`);
  }

  return data;
};

/**
 * Get enrollment statistics
 */
export const getEnrollmentStats = async (courseId?: string): Promise<{
  total_enrollments: number;
  completed_payments: number;
  pending_payments: number;
  refunded: number;
  total_revenue: number;
}> => {
  let query = supabase.from('enrollments').select('payment_status, amount_paid');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data } = await query;

  const enrollments = data || [];

  return {
    total_enrollments: enrollments.length,
    completed_payments: enrollments.filter(e => e.payment_status === 'completed').length,
    pending_payments: enrollments.filter(e => e.payment_status === 'pending').length,
    refunded: enrollments.filter(e => e.payment_status === 'refunded').length,
    total_revenue: enrollments
      .filter(e => e.payment_status === 'completed')
      .reduce((sum, e) => sum + (e.amount_paid || 0), 0)
  };
};
