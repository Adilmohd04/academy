import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import pool from '../config/database';

const router = Router();

/**
 * GET /api/student/courses/:courseId/grades
 * Get student's grades for a course (week-wise)
 */
router.get('/courses/:courseId/grades', requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = (req as any).auth?.userId;

    const client = await pool.connect();
    try {
      // Get all weeks for this course
      const weeksResult = await client.query(
        `SELECT id, week_number, title 
         FROM course_weeks 
         WHERE course_id = $1 
         ORDER BY week_number`,
        [courseId]
      );

      const weeks = await Promise.all(
        weeksResult.rows.map(async (week: any) => {
          // Get quiz attempt for this week
          const quizResult = await client.query(
            `SELECT 
              qa.score as quiz_score,
              qa.total_points as quiz_max_score,
              qa.submitted_at as quiz_submitted_at,
              qa.teacher_comment as quiz_comment
             FROM quizzes q
             LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = $1
             WHERE q.week_id = $2
             ORDER BY qa.submitted_at DESC
             LIMIT 1`,
            [studentId, week.id]
          );

          // Get assignment submission for this week
          const assignmentResult = await client.query(
            `SELECT 
              asub.grade as assignment_score,
              asub.total_points as assignment_max_score,
              asub.submitted_at as assignment_submitted_at,
              asub.feedback as assignment_comment,
              asub.status as assignment_status
             FROM assignments a
             LEFT JOIN assignment_submissions asub ON asub.lesson_id IN (
               SELECT id FROM course_lessons WHERE week_id = $2
             ) AND asub.student_id = $1
             WHERE a.week_id = $2
             ORDER BY asub.submitted_at DESC
             LIMIT 1`,
            [studentId, week.id]
          );

          const quiz = quizResult.rows[0] || {};
          const assignment = assignmentResult.rows[0] || {};

          return {
            week_number: week.week_number,
            week_title: week.title,
            quiz_score: quiz.quiz_score,
            quiz_max_score: quiz.quiz_max_score,
            quiz_percentage: quiz.quiz_score && quiz.quiz_max_score 
              ? (quiz.quiz_score / quiz.quiz_max_score) * 100 
              : null,
            quiz_submitted_at: quiz.quiz_submitted_at,
            quiz_comment: quiz.quiz_comment,
            assignment_score: assignment.assignment_score,
            assignment_max_score: assignment.assignment_max_score,
            assignment_percentage: assignment.assignment_score && assignment.assignment_max_score
              ? (assignment.assignment_score / assignment.assignment_max_score) * 100
              : null,
            assignment_submitted_at: assignment.assignment_submitted_at,
            assignment_comment: assignment.assignment_comment,
            assignment_status: assignment.assignment_status
          };
        })
      );

      // Calculate averages
      const quizScores = weeks
        .filter(w => w.quiz_percentage !== null)
        .map(w => w.quiz_percentage!);
      const quizAverage = quizScores.length > 0
        ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length
        : 0;

      const assignmentScores = weeks
        .filter(w => w.assignment_percentage !== null)
        .map(w => w.assignment_percentage!);
      const assignmentAverage = assignmentScores.length > 0
        ? assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length
        : 0;

      // Get enrollment and grading policy
      const enrollmentResult = await client.query(
        `SELECT 
          e.internal_score,
          e.total_score,
          e.certificate_eligible,
          c.min_score_for_certificate
         FROM enrollments e
         INNER JOIN courses c ON c.id = e.course_id
         WHERE e.course_id = $1 AND e.student_id = $2`,
        [courseId, studentId]
      );

      const enrollment = enrollmentResult.rows[0] || {
        internal_score: null,
        total_score: null,
        certificate_eligible: false,
        min_score_for_certificate: 60
      };

      res.json({
        weeks,
        quiz_average: quizAverage,
        assignment_average: assignmentAverage,
        internal_score: enrollment.internal_score,
        total_score: enrollment.total_score,
        certificate_eligible: enrollment.certificate_eligible,
        min_score_for_certificate: enrollment.min_score_for_certificate || 60
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
});

export default router;
