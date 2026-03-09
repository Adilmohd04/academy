import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/clerkAuth';
import pool from '../config/database';

const router = Router();

/**
 * GET /api/teacher/courses/:courseId/students/grades
 * Get all students with week-wise grades
 */
router.get('/courses/:courseId/students/grades', requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).auth?.userId;

    const client = await pool.connect();
    try {
      // Verify teacher owns this course
      const courseCheck = await client.query(
        `SELECT id FROM courses WHERE id = $1 AND teacher_id = (SELECT id FROM profiles WHERE clerk_user_id = $2)`,
        [courseId, userId]
      );

      if (courseCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get all enrolled students
      const studentsResult = await client.query(
        `SELECT 
          e.student_id,
          p.full_name as student_name,
          p.email as student_email,
          e.enrolled_at,
          e.progress_percentage,
          e.internal_score,
          e.final_exam_score,
          e.total_score,
          e.certificate_eligible
         FROM enrollments e
         INNER JOIN profiles p ON p.clerk_user_id = e.student_id
         WHERE e.course_id = $1
         ORDER BY p.full_name`,
        [courseId]
      );

      const students = await Promise.all(
        studentsResult.rows.map(async (student: any) => {
          // Get all weeks for this course
          const weeksResult = await client.query(
            `SELECT 
              w.week_number,
              w.title as week_title,
              w.id as week_id
             FROM course_weeks w
             WHERE w.course_id = $1
             ORDER BY w.week_number`,
            [courseId]
          );

          const weeks = await Promise.all(
            weeksResult.rows.map(async (week: any) => {
              // Get quiz grade for this week
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
                [student.student_id, week.week_id]
              );

              // Get assignment grade for this week
              const assignmentResult = await client.query(
                `SELECT 
                  asub.grade as assignment_score,
                  asub.total_points as assignment_max_score,
                  asub.submitted_at as assignment_submitted_at,
                  asub.feedback as assignment_comment
                 FROM assignments a
                 LEFT JOIN assignment_submissions asub ON asub.lesson_id IN (
                   SELECT id FROM course_lessons WHERE week_id = $2
                 ) AND asub.student_id = $1
                 WHERE a.week_id = $2
                 ORDER BY asub.submitted_at DESC
                 LIMIT 1`,
                [student.student_id, week.week_id]
              );

              return {
                week_number: week.week_number,
                week_title: week.week_title,
                quiz_score: quizResult.rows[0]?.quiz_score,
                quiz_max_score: quizResult.rows[0]?.quiz_max_score,
                quiz_submitted_at: quizResult.rows[0]?.quiz_submitted_at,
                quiz_comment: quizResult.rows[0]?.quiz_comment,
                assignment_score: assignmentResult.rows[0]?.assignment_score,
                assignment_max_score: assignmentResult.rows[0]?.assignment_max_score,
                assignment_submitted_at: assignmentResult.rows[0]?.assignment_submitted_at,
                assignment_comment: assignmentResult.rows[0]?.assignment_comment,
              };
            })
          );

          // Calculate averages
          const quizScores = weeks
            .filter((w) => w.quiz_score !== undefined && w.quiz_score !== null)
            .map((w) => (w.quiz_score! / (w.quiz_max_score || 100)) * 100);
          const quizAverage = quizScores.length > 0
            ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length
            : 0;

          const assignmentScores = weeks
            .filter((w) => w.assignment_score !== undefined && w.assignment_score !== null)
            .map((w) => (w.assignment_score! / (w.assignment_max_score || 100)) * 100);
          const assignmentAverage = assignmentScores.length > 0
            ? assignmentScores.reduce((sum, score) => sum + score, 0) / assignmentScores.length
            : 0;

          return {
            ...student,
            weeks,
            quiz_average: quizAverage,
            assignment_average: assignmentAverage,
          };
        })
      );

      res.json({ students });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Failed to fetch student grades' });
  }
});

/**
 * POST /api/teacher/courses/:courseId/students/:studentId/grades
 * Save a grade for a specific week's quiz or assignment
 */
router.post(
  '/courses/:courseId/students/:studentId/grades',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { courseId, studentId } = req.params;
      const { week_number, type, score, comment } = req.body;
      const userId = (req as any).auth?.userId;

      const client = await pool.connect();
      try {
        // Verify teacher owns this course
        const courseCheck = await client.query(
          `SELECT id FROM courses WHERE id = $1 AND teacher_id = (SELECT id FROM profiles WHERE clerk_user_id = $2)`,
          [courseId, userId]
        );

        if (courseCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get week_id
        const weekResult = await client.query(
          `SELECT id FROM course_weeks WHERE course_id = $1 AND week_number = $2`,
          [courseId, week_number]
        );

        if (weekResult.rows.length === 0) {
          return res.status(404).json({ error: 'Week not found' });
        }

        const weekId = weekResult.rows[0].id;

        if (type === 'quiz') {
          // Update quiz attempt
          await client.query(
            `UPDATE quiz_attempts 
             SET score = $1, teacher_comment = $2, graded_at = NOW()
             WHERE quiz_id IN (SELECT id FROM quizzes WHERE week_id = $3)
               AND student_id = $4`,
            [score, comment, weekId, studentId]
          );
        } else if (type === 'assignment') {
          // Update assignment submission (linked to lesson, not assignment directly)
          await client.query(
            `UPDATE assignment_submissions 
             SET grade = $1, feedback = $2, graded_at = NOW(), status = 'graded'
             WHERE lesson_id IN (SELECT id FROM course_lesson WHERE week_id = $3)
               AND student_id = $4`,
            [score, comment, weekId, studentId]
          );
        }

        res.json({ success: true, message: 'Grade saved successfully' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      res.status(500).json({ error: 'Failed to save grade' });
    }
  }
);

/**
 * POST /api/teacher/courses/:courseId/calculate-internal-scores
 * Calculate internal scores for all students
 */
router.post(
  '/courses/:courseId/calculate-internal-scores',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { courseId } = req.params;
      const userId = (req as any).auth?.userId;

      const client = await pool.connect();
      try {
        // Verify teacher owns this course
        const courseCheck = await client.query(
          `SELECT id FROM courses WHERE id = $1 AND teacher_id = (SELECT id FROM profiles WHERE clerk_user_id = $2)`,
          [courseId, userId]
        );

        if (courseCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get grading policy
        const policyResult = await client.query(
          `SELECT quiz_weight, assignment_weight FROM courses WHERE id = $1`,
          [courseId]
        );

        const quizWeight = policyResult.rows[0]?.quiz_weight || 20;
        const assignmentWeight = policyResult.rows[0]?.assignment_weight || 20;

        // Calculate internal scores for all students
        await client.query(
          `UPDATE enrollments e
           SET internal_score = (
             COALESCE((
               SELECT AVG((qa.score::float / NULLIF(qa.total_points, 0)) * 100)
               FROM quiz_attempts qa
               JOIN quizzes q ON q.id = qa.quiz_id
               JOIN course_weeks w ON w.id = q.week_id
               WHERE w.course_id = $1 AND qa.student_id = e.student_id
             ), 0) * ($2 / 100.0) +
             COALESCE((
               SELECT AVG((asub.grade::float / NULLIF(asub.total_points, 0)) * 100)
               FROM assignment_submissions asub
               JOIN course_lessons l ON l.id = asub.lesson_id
               JOIN course_weeks w ON w.id = l.week_id
               WHERE w.course_id = $1 AND asub.student_id = e.student_id
             ), 0) * ($3 / 100.0)
           ),
           updated_at = NOW()
           WHERE e.course_id = $1`,
          [courseId, quizWeight, assignmentWeight]
        );

        res.json({ success: true, message: 'Internal scores calculated successfully' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error calculating internal scores:', error);
      res.status(500).json({ error: 'Failed to calculate internal scores' });
    }
  }
);

/**
 * GET /api/teacher/courses/:courseId/grading-policy
 * Get grading policy for a course
 */
router.get('/courses/:courseId/grading-policy', requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).auth?.userId;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT quiz_weight, assignment_weight, final_exam_weight, min_score_for_certificate
         FROM courses 
         WHERE id = $1 AND teacher_id = (SELECT id FROM profiles WHERE clerk_user_id = $2)`,
        [courseId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      res.json({ policy: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching grading policy:', error);
    res.status(500).json({ error: 'Failed to fetch grading policy' });
  }
});

/**
 * PUT /api/teacher/courses/:courseId/grading-policy
 * Update grading policy for a course
 */
router.put('/courses/:courseId/grading-policy', requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { quiz_weight, assignment_weight, final_exam_weight, min_score_for_certificate } = req.body;
    const userId = (req as any).auth?.userId;

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE courses 
         SET quiz_weight = $1,
             assignment_weight = $2,
             final_exam_weight = $3,
             min_score_for_certificate = $4,
             updated_at = NOW()
         WHERE id = $5 AND teacher_id = (SELECT id FROM profiles WHERE clerk_user_id = $6)`,
        [quiz_weight, assignment_weight, final_exam_weight, min_score_for_certificate, courseId, userId]
      );

      res.json({ success: true, message: 'Grading policy updated successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating grading policy:', error);
    res.status(500).json({ error: 'Failed to update grading policy' });
  }
});

export default router;
