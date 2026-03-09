import { supabase } from '../../../config/database';

export interface Certificate {
  id: string;
  enrollment_id: string;
  course_id: string;
  student_id: string;
  course_title: string;
  student_name: string;
  teacher_name: string;
  completion_date: string;
  certificate_url?: string;
  generated_at: string;
}

export const generateCertificate = async (
  enrollmentId: string
): Promise<Certificate> => {
  // Get enrollment details with related data
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select(`
      id,
      course_id,
      student_id,
      enrolled_at,
      progress_percentage,
      courses!inner(
        title,
        teacher_id
      )
    `)
    .eq('id', enrollmentId)
    .single();

  if (enrollmentError || !enrollment) {
    throw new Error('Enrollment not found');
  }

  if (enrollment.progress_percentage < 100) {
    throw new Error('Course not completed yet');
  }

  // Get student name
  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('clerk_user_id', enrollment.student_id)
    .single();

  if (studentError || !student) {
    throw new Error('Student not found');
  }

  // Get teacher name
  const teacherId = (enrollment.courses as any).teacher_id;
  const { data: teacher, error: teacherError } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('clerk_user_id', teacherId)
    .single();

  if (teacherError || !teacher) {
    throw new Error('Teacher not found');
  }

  const courseTitle = (enrollment.courses as any).title;
  const studentName = student.full_name || '';
  const teacherName = teacher.full_name || '';

  // Check if certificate already exists
  const { data: existingCert, error: existingError } = await supabase
    .from('certificates')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingCert) {
    return existingCert;
  }

  // Create certificate record
  const { data: newCert, error: insertError } = await supabase
    .from('certificates')
    .insert({
      enrollment_id: enrollmentId,
      course_id: enrollment.course_id,
      student_id: enrollment.student_id,
      course_title: courseTitle,
      student_name: studentName,
      teacher_name: teacherName,
      completion_date: new Date().toISOString(),
      generated_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (insertError || !newCert) {
    throw insertError || new Error('Failed to create certificate');
  }

  return newCert;
};

export const getStudentCertificates = async (
  studentId: string
): Promise<Certificate[]> => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('student_id', studentId)
    .order('generated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
};

export const getCertificate = async (
  certificateId: string,
  studentId: string
): Promise<Certificate | null> => {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certificateId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};
