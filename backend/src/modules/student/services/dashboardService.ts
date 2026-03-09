import { supabase } from '../../../config/database';

interface CourseProgress {
  course_id: string;
  course_title: string;
  course_thumbnail: string;
  teacher_name: string;
  progress_percentage: number;
  enrolled_at: string;
  last_accessed?: string;
  completed_lessons: number;
  total_lessons: number;
  quiz_average?: number;
  assignment_average?: number;
  upcoming_deadlines: Array<{
    type: 'assignment' | 'quiz';
    title: string;
    due_date: string;
  }>;
}

export const getStudentDashboard = async (studentId: string): Promise<{
  courses: CourseProgress[];
  overall_stats: {
    total_courses: number;
    completed_courses: number;
    in_progress_courses: number;
    total_certificates: number;
  };
}> => {
  try {
    // Get all enrollments for the student with course and teacher info
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        progress_percentage,
        enrolled_at,
        last_accessed,
        courses!inner (
          id,
          title,
          thumbnail_url,
          teacher_id
        )
      `)
      .eq('student_id', studentId)
      .order('last_accessed', { ascending: false, nullsFirst: false });

    if (enrollError) throw enrollError;

    const courses: CourseProgress[] = [];

    for (const enrollment of enrollments || []) {
      const course = enrollment.courses as any;

      // Get teacher info
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', course.teacher_id)
        .single();

      // Get lesson count for this course
      const { count: totalLessons } = await supabase
        .from('course_lessons')
        .select('id, course_weeks!inner(course_id)', { count: 'exact', head: true })
        .eq('course_weeks.course_id', course.id);

      // Get all lesson IDs for this course
      const { data: lessonData } = await supabase
        .from('course_lessons')
        .select('id, course_weeks!inner(course_id)')
        .eq('course_weeks.course_id', course.id);

      const lessonIds = lessonData?.map(l => l.id) || [];

      // Get completed lessons for this student
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('student_id', studentId)
        .eq('is_completed', true)
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['none']);

      const completedLessons = progressData?.length || 0;

      // Get upcoming deadlines (assignments without submissions)
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          id,
          due_date,
          course_lessons!inner (
            title,
            course_weeks!inner (
              course_id
            )
          )
        `)
        .eq('course_lessons.course_weeks.course_id', course.id)
        .gt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(3);

      const upcomingDeadlines: Array<{ type: 'assignment' | 'quiz'; title: string; due_date: string }> = [];
      
      for (const assignment of assignments || []) {
        const { data: submission } = await supabase
          .from('assignment_submissions')
          .select('id')
          .eq('assignment_id', assignment.id)
          .eq('student_id', studentId)
          .maybeSingle();

        if (!submission) {
          upcomingDeadlines.push({
            type: 'assignment',
            title: (assignment.course_lessons as any)?.title || 'Assignment',
            due_date: assignment.due_date
          });
        }
      }

      courses.push({
        course_id: course.id,
        course_title: course.title,
        course_thumbnail: course.thumbnail_url,
        teacher_name: teacherProfile?.full_name || 'Unknown',
        progress_percentage: enrollment.progress_percentage || 0,
        enrolled_at: enrollment.enrolled_at,
        last_accessed: enrollment.last_accessed,
        completed_lessons: completedLessons,
        total_lessons: totalLessons || 0,
        quiz_average: undefined,
        assignment_average: undefined,
        upcoming_deadlines: upcomingDeadlines
      });
    }

    // Calculate overall stats
    const overall_stats = {
      total_courses: courses.length,
      completed_courses: courses.filter(c => c.progress_percentage >= 100).length,
      in_progress_courses: courses.filter(c => c.progress_percentage > 0 && c.progress_percentage < 100).length,
      total_certificates: courses.filter(c => c.progress_percentage >= 100).length
    };

    return { courses, overall_stats };
  } catch (error) {
    console.error('Error in getStudentDashboard:', error);
    throw error;
  }
};
