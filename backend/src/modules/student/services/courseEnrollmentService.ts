import { supabase } from '../../../config/database';
import { checkPrerequisites } from './prerequisiteService';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  teacher_id: string;
  teacher_name: string;
  price?: number;
  status: string;
  total_lessons: number;
  total_students: number;
  average_rating?: number;
  is_enrolled: boolean;
}

export const getBrowseCourses = async (studentId: string): Promise<Course[]> => {
  // Get only published courses with approved status
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`*`)
    .eq('status', 'published')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Get enrollments for this student
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId);

  const enrolledIds = (enrollments || []).map(e => e.course_id);

  // Filter out enrolled courses from browse list
  return (courses || [])
    .filter(c => !enrolledIds.includes(c.id))
    .map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      thumbnail_url: c.thumbnail_url,
      teacher_id: c.teacher_id,
      teacher_name: c.teacher_name || 'Teacher', // Use existing value or fallback
      price: c.price,
      status: 'available', // Simplified status for students
      total_lessons: 0,
      total_students: 0,
      is_enrolled: false // Already filtered out, so always false
    }));
};

export const enrollInCourse = async (
  courseId: string,
  studentId: string
): Promise<void> => {
  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existingEnrollment) {
    throw new Error('Already enrolled in this course');
  }

  // Check if course exists and is approved
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, enrollment_limit, enrolled_count, prerequisite_courses, approval_status')
    .eq('id', courseId)
    .eq('approval_status', 'approved')
    .single();

  if (courseError || !course) {
    throw new Error('Course not found or not available');
  }

  // This path previously selected prerequisite_courses without ever checking
  // it. Defer to the shared gate rather than reimplementing the rule here.
  const prerequisites = await checkPrerequisites(courseId, studentId);
  if (!prerequisites.satisfied) {
    throw new Error(
      `You must complete the following course(s) before enrolling: ${prerequisites.missing
        .map((course) => course.title)
        .join(', ')}`,
    );
  }

  // Check enrollment capacity if set
  if (course.enrollment_limit && course.enrollment_limit > 0) {
    const currentEnrollments = course.enrolled_count || 0;
    
    if (currentEnrollments >= course.enrollment_limit) {
      throw new Error('Course is full. No more seats available.');
    }
  }

  // Create enrollment
  const { error: enrollError } = await supabase
    .from('enrollments')
    .insert({
      course_id: courseId,
      student_id: studentId,
      enrolled_at: new Date().toISOString(),
      progress: 0,
      status: 'active'
    });

  if (enrollError) {
    console.error('Error creating enrollment:', enrollError);
    if ((enrollError as any)?.code === '23505') {
      throw new Error('Already enrolled in this course');
    }
    throw new Error('Failed to enroll in course');
  }

  // Update enrolled count
  await supabase
    .from('courses')
    .update({ enrolled_count: (course.enrolled_count || 0) + 1 })
    .eq('id', courseId);
};

export const getCourseOverview = async (
  courseId: string,
  studentId: string
): Promise<any> => {
  // Get course details with ALL professional fields
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      short_description,
      long_description,
      course_image_url,
      thumbnail_url,
      thumbnail_image,
      teacher_id,
      tags,
      instructors,
      mentoring_text,
      mentoring_structured,
      schedule_frequency,
      schedule_timezone,
      enrollment_deadline,
      course_format_description,
      teacher_name,
      teacher_title,
      teacher_bio,
      teacher_avatar,
      price,
      is_free,
      enrollment_limit,
      enrolled_count,
      duration_weeks,
      level,
      category,
      syllabus,
      prerequisites,
      prerequisite_courses,
      status,
      approval_status,
      learning_outcomes,
      skills_gained,
      estimated_hours,
      language,
      subtitle_languages,
      average_rating,
      total_reviews,
      total_quizzes,
      total_assignments,
      starts_at,
      ends_at,
      course_type,
      certificate_criteria
    `)
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    throw new Error('Course not found');
  }

  // Count active enrollments dynamically
  const { count: activeEnrollments } = await supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'active');

  // Check if student is enrolled
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle();

  // Get course weeks with lessons
  const { data: weeks } = await supabase
    .from('course_weeks')
    .select(`
      id,
      week_number,
      title,
      description,
      lessons:course_lessons(
        id,
        title,
        content_type,
        video_duration_minutes,
        is_preview
      )
    `)
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  // Count total lessons
  const totalLessons = (weeks || []).reduce((acc, week: any) => {
    return acc + (week.lessons?.length || 0);
  }, 0);

  // Count quizzes and assignments (from lessons content_type)
  const totalQuizzes = (weeks || []).reduce((acc, week: any) => {
    return acc + (week.lessons?.filter((l: any) => l.content_type === 'quiz').length || 0);
  }, 0);

  const totalAssignments = (weeks || []).reduce((acc, week: any) => {
    return acc + (week.lessons?.filter((l: any) => l.content_type === 'assignment').length || 0);
  }, 0);

  return {
    ...course,
    enrolled_count: activeEnrollments || 0,
    total_weeks: weeks?.length || 0,
    total_lessons: totalLessons,
    total_quizzes: totalQuizzes,
    total_assignments: totalAssignments,
    is_enrolled: !!enrollment,
    is_full: course.enrollment_limit && (activeEnrollments || 0) >= course.enrollment_limit,
    weeks: weeks || []
  };
};
