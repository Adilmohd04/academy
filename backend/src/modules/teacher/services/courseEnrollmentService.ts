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

export const getCourseEnrollments = async (
  courseId: string,
  teacherId: string
): Promise<{ students: EnrolledStudent[]; stats: CourseStats }> => {
  // Verify teacher owns this course
  const { data: courseCheck, error: courseCheckError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('teacher_id', teacherId)
    .single();

  if (courseCheckError || !courseCheck) {
    throw new Error('Course not found or unauthorized');
  }

  // Get total lessons count
  const { data: lessonsCountData, error: lessonsCountError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT COUNT(l.id) as total
       FROM course_lessons l
       INNER JOIN course_weeks w ON w.id = l.week_id
       WHERE w.course_id = '${courseId}'`
  });

  if (lessonsCountError) throw lessonsCountError;
  const totalLessons = parseInt(lessonsCountData?.[0]?.total) || 0;

  // Get enrolled students with their progress
  const { data: studentsResult, error: studentsError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 
      e.student_id,
      p.full_name as student_name,
      p.email,
      e.enrolled_at,
      e.progress_percentage,
      e.last_accessed,
      COUNT(DISTINCT lp.lesson_id) FILTER (WHERE lp.is_completed = true) as completed_lessons,
      ROUND(AVG(qa.score)) as quiz_average,
      ROUND(AVG(asub.score)) as assignment_average
     FROM enrollments e
     LEFT JOIN profiles p ON p.clerk_user_id = e.student_id
     LEFT JOIN course_weeks w ON w.course_id = e.course_id
     LEFT JOIN course_lessons l ON l.week_id = w.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = e.student_id
     LEFT JOIN quizzes q ON q.lesson_id = l.id
     LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = e.student_id AND qa.passed = true
     LEFT JOIN assignments a ON a.lesson_id = l.id
     LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = e.student_id AND asub.status = 'graded'
     WHERE e.course_id = '${courseId}'
     GROUP BY e.student_id, p.full_name, p.email, e.enrolled_at, e.progress_percentage, e.last_accessed
     ORDER BY e.enrolled_at DESC`
  });

  if (studentsError) throw studentsError;

  const students = (studentsResult || []).map((row: any) => ({
    ...row,
    completed_lessons: parseInt(row.completed_lessons) || 0,
    total_lessons: totalLessons,
    quiz_average: row.quiz_average ? parseFloat(row.quiz_average) : undefined,
    assignment_average: row.assignment_average ? parseFloat(row.assignment_average) : undefined
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
    .eq('teacher_id', teacherId)
    .single();

  if (courseCheckError || !courseCheck) {
    throw new Error('Unauthorized');
  }

  // Get student's lesson progress
  const { data: lessonsProgress, error: lessonsError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 
      w.title as week_title,
      w.order_index as week_order,
      l.id as lesson_id,
      l.title as lesson_title,
      l.content_type,
      l.order_index as lesson_order,
      lp.is_completed,
      lp.completed_at
     FROM course_weeks w
     INNER JOIN course_lessons l ON l.week_id = w.id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = '${studentId}'
     WHERE w.course_id = '${courseId}'
     ORDER BY w.order_index, l.order_index`
  });

  if (lessonsError) throw lessonsError;

  // Get quiz attempts
  const { data: quizAttempts, error: quizError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 
      l.title as lesson_title,
      qa.score,
      qa.passed,
      qa.attempt_number,
      qa.submitted_at
     FROM quiz_attempts qa
     INNER JOIN quizzes q ON q.id = qa.quiz_id
     INNER JOIN course_lessons l ON l.id = q.lesson_id
     INNER JOIN course_weeks w ON w.id = l.week_id
     WHERE w.course_id = '${courseId}' AND qa.student_id = '${studentId}'
     ORDER BY qa.submitted_at DESC`
  });

  if (quizError) throw quizError;

  // Get assignment submissions
  const { data: assignments, error: assignmentsError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 
      l.title as lesson_title,
      asub.score,
      asub.status,
      asub.submitted_at,
      asub.graded_at,
      asub.feedback
     FROM assignment_submissions asub
     INNER JOIN assignments a ON a.id = asub.assignment_id
     INNER JOIN course_lessons l ON l.id = a.lesson_id
     INNER JOIN course_weeks w ON w.id = l.week_id
     WHERE w.course_id = '${courseId}' AND asub.student_id = '${studentId}'
     ORDER BY asub.submitted_at DESC`
  });

  if (assignmentsError) throw assignmentsError;

  return {
    lessons: lessonsProgress || [],
    quizzes: quizAttempts || [],
    assignments: assignments || []
  };
};
