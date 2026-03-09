import { supabase } from '../../../config/database';

export interface CourseEnrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  progress: number;
  total_marks: number;
  status: 'active' | 'completed' | 'failed';
}

export interface EnrollStudentInput {
  course_id: string;
  student_id: string;
}

/**
 * Enroll student in course (check cap first)
 */
export const enrollStudent = async (input: EnrollStudentInput): Promise<CourseEnrollment> => {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', input.course_id)
    .eq('student_id', input.student_id)
    .single();

  if (existing) throw new Error('Already enrolled in this course');

  // Check enrollment cap
  const { data: course } = await supabase
    .from('courses')
    .select('enrollment_cap, enrolled_count')
    .eq('id', input.course_id)
    .single();

  if (!course) throw new Error('Course not found');

  if (course.enrollment_cap && course.enrolled_count >= course.enrollment_cap) {
    throw new Error('Course is full');
  }

  // Enroll student
  const { data: enrollment, error } = await supabase
    .from('course_enrollments')
    .insert([input])
    .select()
    .single();

  if (error) throw new Error(`Failed to enroll: ${error.message}`);

  // Increment enrolled_count
  await supabase
    .from('courses')
    .update({ enrolled_count: (course.enrolled_count || 0) + 1 })
    .eq('id', input.course_id);

  return enrollment;
};

/**
 * Get student's enrollments
 */
export const getMyEnrollments = async (studentId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      courses:courses(*)
    `)
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch enrollments: ${error.message}`);
  return data || [];
};

/**
 * Check if student is enrolled
 */
export const isEnrolled = async (courseId: string, studentId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .single();

  return !!data;
};

/**
 * Update student progress
 */
export const updateProgress = async (courseId: string, studentId: string, progress: number): Promise<void> => {
  const { error } = await supabase
    .from('course_enrollments')
    .update({ progress })
    .eq('course_id', courseId)
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to update progress: ${error.message}`);
};

/**
 * Mark lesson as complete
 */
export const markLessonComplete = async (lessonId: string, studentId: string): Promise<void> => {
  const { error } = await supabase
    .from('lesson_progress')
    .upsert([{ lesson_id: lessonId, student_id: studentId }]);

  if (error) throw new Error(`Failed to mark lesson complete: ${error.message}`);
};

/**
 * Get completed lessons for student
 */
export const getCompletedLessons = async (studentId: string, courseId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select(`
      lesson_id,
      section_lessons!inner(
        section_id,
        course_sections!inner(course_id)
      )
    `)
    .eq('student_id', studentId);

  if (error) throw new Error(`Failed to fetch progress: ${error.message}`);

  // Filter by course and extract lesson IDs
  const lessonIds = data
    ?.filter((item: any) => item.section_lessons?.course_sections?.course_id === courseId)
    .map((item: any) => item.lesson_id) || [];

  return lessonIds;
};

/**
 * Calculate total marks for student
 */
export const calculateTotalMarks = async (courseId: string, studentId: string): Promise<number> => {
  // Get all activities for this course
  const { data: sections } = await supabase
    .from('course_sections')
    .select('id')
    .eq('course_id', courseId);

  if (!sections) return 0;

  const sectionIds = sections.map((s) => s.id);

  const { data: lessons } = await supabase
    .from('section_lessons')
    .select('id')
    .in('section_id', sectionIds);

  if (!lessons) return 0;

  const lessonIds = lessons.map((l) => l.id);

  const { data: activities } = await supabase
    .from('lesson_activities')
    .select('id, type')
    .in('lesson_id', lessonIds);

  if (!activities) return 0;

  let totalMarks = 0;

  for (const activity of activities) {
    if (activity.type === 'quiz') {
      // Get quiz marks from student_answers
      const { data: questions } = await supabase
        .from('activity_questions')
        .select('id')
        .eq('activity_id', activity.id);

      if (questions) {
        const questionIds = questions.map((q) => q.id);
        const { data: answers } = await supabase
          .from('student_answers')
          .select('marks_obtained')
          .in('question_id', questionIds)
          .eq('student_id', studentId);

        totalMarks += answers?.reduce((sum, a) => sum + (a.marks_obtained || 0), 0) || 0;
      }
    } else {
      // Get assignment marks from activity_submissions
      const { data: submission } = await supabase
        .from('activity_submissions')
        .select('marks_obtained')
        .eq('activity_id', activity.id)
        .eq('student_id', studentId)
        .single();

      totalMarks += submission?.marks_obtained || 0;
    }
  }

  // Update enrollment total_marks
  await supabase
    .from('course_enrollments')
    .update({ total_marks: totalMarks })
    .eq('course_id', courseId)
    .eq('student_id', studentId);

  return totalMarks;
};

/**
 * Check if student is eligible to enroll in a course
 */
export async function checkEligibility(studentId: string, courseId: string) {
  try {
    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, max_students, approval_status')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    // Check if course is approved
    if (course.approval_status !== 'approved') {
      return {
        eligible: false,
        reason: 'Course is not yet approved for enrollment',
        missing_prerequisites: [],
        has_capacity: false,
        already_enrolled: false
      };
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingEnrollment) {
      return {
        eligible: false,
        reason: 'Already enrolled in this course',
        missing_prerequisites: [],
        has_capacity: true,
        already_enrolled: true
      };
    }

    // Get prerequisites for this course
    const { data: prerequisites, error: prereqError } = await supabase
      .from('course_prerequisites')
      .select(`
        prerequisite_course_id,
        prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey (
          id,
          title
        )
      `)
      .eq('course_id', courseId);

    if (prereqError) {
      console.error('Error fetching prerequisites:', prereqError);
    }

    const missingPrerequisites: any[] = [];

    // Check if student has completed each prerequisite
    if (prerequisites && prerequisites.length > 0) {
      for (const prereq of prerequisites) {
        const { data: completion } = await supabase
          .from('enrollments')
          .select('id, progress')
          .eq('student_id', studentId)
          .eq('course_id', prereq.prerequisite_course_id)
          .eq('status', 'completed')
          .maybeSingle();

        if (!completion) {
          missingPrerequisites.push({
            id: prereq.prerequisite_course_id,
            title: (prereq.prerequisite_course as any)?.title || 'Unknown Course'
          });
        }
      }
    }

    // Check course capacity
    const { count: enrolledCount } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'active');

    const hasCapacity = (enrolledCount || 0) < (course.max_students || 30);

    // Determine eligibility
    const eligible = missingPrerequisites.length === 0 && hasCapacity;

    let reason = '';
    if (missingPrerequisites.length > 0) {
      reason = `Missing prerequisites: ${missingPrerequisites.map(p => p.title).join(', ')}`;
    } else if (!hasCapacity) {
      reason = 'Course is full';
    }

    return {
      eligible,
      reason,
      missing_prerequisites: missingPrerequisites,
      has_capacity: hasCapacity,
      already_enrolled: false,
      current_enrollment: enrolledCount || 0,
      max_students: course.max_students || 30
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    throw error;
  }
}

/**
 * Get student's enrolled courses
 */
export async function getEnrolledCourses(studentId: string) {
  try {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses (
          id,
          title,
          description,
          category,
          teacher_id,
          created_at
        )
      `)
      .eq('student_id', studentId)
      .in('status', ['active', 'completed'])
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrolled courses:', error);
      throw error;
    }

    // Enrich with teacher info
    if (enrollments && enrollments.length > 0) {
      const teacherIds = [...new Set(enrollments.map((e: any) => e.course?.teacher_id).filter(Boolean))];
      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('clerk_user_id, full_name, email')
          .in('clerk_user_id', teacherIds);
        const profileMap = new Map((profiles || []).map(p => [p.clerk_user_id, p]));
        
        enrollments.forEach((e: any) => {
          if (e.course?.teacher_id) {
            const teacher = profileMap.get(e.course.teacher_id);
            e.course.teacher = teacher ? {
              clerk_user_id: teacher.clerk_user_id,
              full_name: teacher.full_name,
              email: teacher.email,
            } : null;
          }
        });
      }
    }

    return enrollments || [];
  } catch (error) {
    console.error('Error getting enrolled courses:', error);
    throw error;
  }
}

/**
 * Check if student has access to a course
 */
export async function checkCourseAccess(studentId: string, courseId: string) {
  try {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();

    return !!enrollment;
  } catch (error) {
    console.error('Error checking course access:', error);
    return false;
  }
}
