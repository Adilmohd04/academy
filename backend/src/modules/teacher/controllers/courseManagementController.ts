import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

export class TeacherCourseManagementController {
  /**
   * Get enrolled students for a course
   * GET /api/teacher/courses/:courseId/enrolled-students
   */
  async getEnrolledStudents(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const teacherId = req.auth?.userId;

      // Verify teacher owns this course
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', courseId)
        .single();

      if (!course || course.teacher_id !== teacherId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get enrolled students with their progress
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_id,
          enrolled_at,
          progress,
          total_score,
          status
        `)
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      // Enrich with student names
      const enrichedStudents = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name') // Removed role, not needed or maybe included if useful
            .eq('clerk_user_id', enrollment.student_id)
            .single();

          return {
            ...enrollment,
            total_marks: enrollment.total_score, // Map total_score to total_marks for frontend compatibility
            student_name: profile?.full_name || 'Unknown Student'
          };
        })
      );

      res.json(enrichedStudents);
    } catch (error: any) {
      console.error('Error fetching enrolled students:', error);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  }

  /**
   * Get course statistics
   * GET /api/teacher/courses/:courseId/stats
   */
  async getCourseStats(req: Request, res: Response) {
    try {
      const { courseId } = req.params;
      const teacherId = req.auth?.userId;

      // Verify teacher owns this course
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', courseId)
        .single();

      if (!course || course.teacher_id !== teacherId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get total enrollments
      const { count: totalEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      // Get active students
      const { count: activeStudents } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'active');

      // Get completed students
      const { count: completedStudents } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'completed');

      // Get average grade
      const { data: grades } = await supabase
        .from('student_grades')
        .select('total_percentage')
        .eq('course_id', courseId);

      const averageGrade = grades && grades.length > 0
        ? grades.reduce((sum: number, g: any) => sum + (Number(g.total_percentage) || 0), 0) / grades.length
        : 0;

      // Get pending assignments
      const { count: pendingAssignments } = await supabase
        .from('activity_submissions')
        .select('*, lesson_activities!inner(lesson_id, section_lessons!inner(section_id, course_sections!inner(course_id)))', { count: 'exact', head: true })
        .is('marks_obtained', null)
        .eq('lesson_activities.section_lessons.course_sections.course_id', courseId);

      // Get discussions count
      const { count: totalDiscussions } = await supabase
        .from('course_discussions')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      res.json({
        total_enrollments: totalEnrollments || 0,
        active_students: activeStudents || 0,
        completion_rate: totalEnrollments && completedStudents
          ? (completedStudents / totalEnrollments) * 100
          : 0,
        average_grade: averageGrade,
        pending_assignments: pendingAssignments || 0,
        total_discussions: totalDiscussions || 0
      });
    } catch (error: any) {
      console.error('Error fetching course stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  /**
   * Get student progress details
   * GET /api/teacher/courses/:courseId/student-progress/:studentId
   */
  async getStudentProgress(req: Request, res: Response) {
    try {
      const { courseId, studentId } = req.params;
      const teacherId = req.auth?.userId;

      // Verify teacher owns this course
      const { data: course } = await supabase
        .from('courses')
        .select('teacher_id')
        .eq('id', courseId)
        .single();

      if (!course || course.teacher_id !== teacherId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get enrollment info
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .single();

      if (!enrollment) {
        return res.status(404).json({ error: 'Student not enrolled' });
      }

      // Get lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select(`
          *,
          section_lessons!inner(
            id,
            title,
            section_id,
            course_sections!inner(course_id)
          )
        `)
        .eq('student_id', studentId)
        .eq('section_lessons.course_sections.course_id', courseId);

      // Get grades
      const { data: grades } = await supabase
        .from('student_grades')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .single();

      res.json({
        enrollment,
        lesson_progress: lessonProgress || [],
        grades: grades || null
      });
    } catch (error: any) {
      console.error('Error fetching student progress:', error);
      res.status(500).json({ error: 'Failed to fetch progress' });
    }
  }
}
