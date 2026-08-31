import { supabase } from '../../../config/database';

interface EnrolledStudent {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  enrolled_at: string;
  progress_percentage: number;
  last_accessed?: string;
  completed_lessons: number;
  total_lessons: number;
  quiz_average?: number;
  assignment_average?: number;
}

interface CourseStats {
  total_students: number;
  average_progress: number;
  completed_students: number;
  average_quiz_score?: number;
  average_assignment_score?: number;
  total_lessons: number;
}

// Older rows may use either a Clerk user ID or a profiles.id UUID in
// courses.teacher_id. Resolve both forms before checking ownership so valid
// teachers are not locked out, while still denying other teachers.
const getTeacherIdCandidates = async (clerkUserId: string): Promise<string[]> => {
  const candidates = [clerkUserId];
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (profile?.id) candidates.push(profile.id);
  return candidates;
};

export const getCourseEnrollments = async (
  courseId: string,
  teacherId: string
): Promise<{ students: EnrolledStudent[]; stats: CourseStats }> => {
  // Verify teacher owns this course
  const { data: courseCheck, error: courseCheckError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .in('teacher_id', await getTeacherIdCandidates(teacherId))
    .single();

  if (courseCheckError || !courseCheck) {
    throw new Error('Course not found or unauthorized');
  }

  // Get total lessons count safely
  const { data: weekRows, error: weekRowsError } = await supabase
    .from('course_weeks')
    .select('id')
    .eq('course_id', courseId);

  if (weekRowsError) throw weekRowsError;

  const weekIds = (weekRows || []).map((w: any) => w.id);
  let totalLessons = 0;

  if (weekIds.length > 0) {
    const { count, error: countError } = await supabase
      .from('course_lessons')
      .select('*', { count: 'exact', head: true })
      .in('week_id', weekIds);
    if (countError) throw countError;
    totalLessons = count || 0;
  }

  // Get enrolled students with their progress using safe Supabase queries
  const { data: enrollmentsData, error: studentsError } = await supabase
    .from('enrollments')
    .select('student_id, enrolled_at, progress_percentage, last_accessed')
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false });

  if (studentsError) throw studentsError;

  const enrolledStudentIds = (enrollmentsData || []).map((e: any) => e.student_id);
  let profileMap: Record<string, { full_name: string; email: string }> = {};

  if (enrolledStudentIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', enrolledStudentIds);

    (profilesData || []).forEach((p: any) => {
      profileMap[p.clerk_user_id] = { full_name: p.full_name, email: p.email };
    });
  }

  const studentsResult = (enrollmentsData || []).map((e: any) => ({
    student_id: e.student_id,
    student_name: profileMap[e.student_id]?.full_name || 'Unknown',
    email: profileMap[e.student_id]?.email || '',
    enrolled_at: e.enrolled_at,
    progress_percentage: e.progress_percentage || 0,
    last_accessed: e.last_accessed,
    completed_lessons: 0,
    quiz_average: undefined,
    assignment_average: undefined,
  }));
  const students = studentsResult.map((row: any) => ({
    ...row,
    total_lessons: totalLessons,
  }));

  // Calculate course stats
  const stats: CourseStats = {
    total_students: students.length,
    average_progress: students.length > 0
      ? Math.round(students.reduce((sum: number, s: any) => sum + s.progress_percentage, 0) / students.length)
      : 0,
    completed_students: students.filter((s: any) => s.progress_percentage >= 100).length,
    average_quiz_score: students.length > 0
      ? Math.round(students.reduce((sum: number, s: any) => sum + (s.quiz_average || 0), 0) / students.length)
      : undefined,
    average_assignment_score: students.length > 0
      ? Math.round(students.reduce((sum: number, s: any) => sum + (s.assignment_average || 0), 0) / students.length)
      : undefined,
    total_lessons: totalLessons
  };

  return { students, stats };
};

export const getStudentCourseDetails = async (
  courseId: string,
  studentId: string,
  teacherId: string
): Promise<any> => {
  // Verify teacher owns course
  const { data: courseCheck, error: courseCheckError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .in('teacher_id', await getTeacherIdCandidates(teacherId))
    .single();

  if (courseCheckError || !courseCheck) {
    throw new Error('Unauthorized');
  }

  // Get lessons with progress for this student using safe Supabase queries
  const { data: weeksData, error: weeksErr } = await supabase
    .from('course_weeks')
    .select('id, title, order_index')
    .eq('course_id', courseId)
    .order('order_index');

  if (weeksErr) throw weeksErr;

  const courseWeekIds = (weeksData || []).map((w: any) => w.id);
  const weekTitleMap: Record<string, { title: string; order_index: number }> = {};
  (weeksData || []).forEach((w: any) => {
    weekTitleMap[w.id] = { title: w.title, order_index: w.order_index };
  });

  let lessonsProgress: any[] = [];
  if (courseWeekIds.length > 0) {
    const { data: lessonsData, error: lessonsErr } = await supabase
      .from('course_lessons')
      .select('id, title, content_type, order_index, week_id')
      .in('week_id', courseWeekIds)
      .order('order_index');

    if (lessonsErr) throw lessonsErr;

    const lessonIds = (lessonsData || []).map((l: any) => l.id);
    let progressMap: Record<string, { is_completed: boolean; completed_at: string | null }> = {};

    if (lessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, is_completed, completed_at')
        .in('lesson_id', lessonIds)
        .eq('student_id', studentId);

      (progressData || []).forEach((p: any) => {
        progressMap[p.lesson_id] = { is_completed: p.is_completed, completed_at: p.completed_at };
      });
    }

    lessonsProgress = (lessonsData || []).map((l: any) => ({
      week_title: weekTitleMap[l.week_id]?.title || '',
      week_order: weekTitleMap[l.week_id]?.order_index || 0,
      lesson_id: l.id,
      lesson_title: l.title,
      content_type: l.content_type,
      lesson_order: l.order_index,
      is_completed: progressMap[l.id]?.is_completed || false,
      completed_at: progressMap[l.id]?.completed_at || null,
    }));
  }

  // Get quiz attempts for this student in this course (safe query)
  const { data: quizAttempts, error: quizError } = await supabase
    .from('quiz_attempts')
    .select('score, passed, attempt_number, submitted_at, quizzes!inner(lesson_id, course_lessons!inner(title, course_weeks!inner(course_id)))')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (quizError) throw quizError;

  const filteredQuizAttempts = (quizAttempts || [])
    .filter((qa: any) => {
      const quiz = Array.isArray(qa.quizzes) ? qa.quizzes[0] : qa.quizzes;
      const lesson = Array.isArray(quiz?.course_lessons) ? quiz?.course_lessons[0] : quiz?.course_lessons;
      const week = Array.isArray(lesson?.course_weeks) ? lesson?.course_weeks[0] : lesson?.course_weeks;
      return week?.course_id === courseId;
    })
    .map((qa: any) => {
      const quiz = Array.isArray(qa.quizzes) ? qa.quizzes[0] : qa.quizzes;
      const lesson = Array.isArray(quiz?.course_lessons) ? quiz?.course_lessons[0] : quiz?.course_lessons;
      return {
        lesson_title: lesson?.title || '',
        score: qa.score,
        passed: qa.passed,
        attempt_number: qa.attempt_number,
        submitted_at: qa.submitted_at,
      };
    });

  // Get assignment submissions for this student in this course (safe query)
  const { data: assignmentSubs, error: assignmentsError } = await supabase
    .from('assignment_submissions')
    .select('score, status, submitted_at, graded_at, feedback, assignments!inner(lesson_id, course_lessons!inner(title, course_weeks!inner(course_id)))')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (assignmentsError) throw assignmentsError;

  const filteredAssignments = (assignmentSubs || [])
    .filter((asub: any) => {
      const assignment = Array.isArray(asub.assignments) ? asub.assignments[0] : asub.assignments;
      const lesson = Array.isArray(assignment?.course_lessons) ? assignment?.course_lessons[0] : assignment?.course_lessons;
      const week = Array.isArray(lesson?.course_weeks) ? lesson?.course_weeks[0] : lesson?.course_weeks;
      return week?.course_id === courseId;
    })
    .map((asub: any) => {
      const assignment = Array.isArray(asub.assignments) ? asub.assignments[0] : asub.assignments;
      const lesson = Array.isArray(assignment?.course_lessons) ? assignment?.course_lessons[0] : assignment?.course_lessons;
      return {
        lesson_title: lesson?.title || '',
        score: asub.score,
        status: asub.status,
        submitted_at: asub.submitted_at,
        graded_at: asub.graded_at,
        feedback: asub.feedback,
      };
    });

  return {
    lessons: lessonsProgress,
    quizzes: filteredQuizAttempts,
    assignments: filteredAssignments,
  };
};
