import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import pool from '../config/database';
import '../types/express';

const router = Router();

// Get all enrolled students for a course with detailed information
router.get('/courses/:courseId/students', requireAuth, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Verify teacher owns this course (or is admin)
    if (req.auth?.role !== 'admin') {
      const courseCheck = await pool.query(
        'SELECT teacher_id FROM courses WHERE id = $1',
        [courseId]
      );
      
      if (courseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }
      
      const teacherProfile = await pool.query(
        'SELECT id FROM profiles WHERE clerk_user_id = $1',
        [userId]
      );
      
      if (courseCheck.rows[0].teacher_id !== teacherProfile.rows[0]?.id) {
        return res.status(403).json({ error: 'Not authorized to view students for this course' });
      }
    }

    // Get enrolled students with their details
    const studentsQuery = `
      SELECT 
        p.clerk_user_id as id,
        p.clerk_user_id,
        p.email,
        p.full_name as name,
        e.enrolled_at,
        e.progress_percentage as progress,
        e.payment_verified,
        e.payment_receipt_url,
        e.payment_verified_at
      FROM enrollments e
      INNER JOIN profiles p ON p.clerk_user_id = e.student_id
      WHERE e.course_id = $1::uuid
      ORDER BY p.full_name
    `;

    const result = await pool.query(studentsQuery, [courseId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// Get student's detailed performance by week
router.get('/courses/:courseId/students/:studentId/performance', requireAuth, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;

    // Get profile ID from clerk_user_id
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE clerk_user_id = $1',
      [studentId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = profileResult.rows[0].id;

    // Get performance by week
    const performanceQuery = `
      SELECT 
        cw.id as week_id,
        cw.week_number,
        cw.title as week_title,
        
        -- Assignment submissions for this week
        (
          SELECT json_agg(
            json_build_object(
              'assignment_id', a.id,
              'assignment_title', l.title,
              'submission_id', asub.id,
              'submitted_at', asub.submitted_at,
              'grade', asub.grade,
              'max_points', a.max_points,
              'status', asub.status,
              'feedback', asub.feedback,
              'file_url', asub.file_url,
              'file_type', asub.file_type,
              'link_url', asub.link_url,
              'text_content', asub.text_content
            )
          )
          FROM assignments a
          INNER JOIN lessons l ON l.id = a.lesson_id
          LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = $2
          WHERE l.week_id = cw.id
        ) as assignments,
        
        -- Quiz attempts for this week
        (
          SELECT json_agg(
            json_build_object(
              'quiz_id', q.id,
              'quiz_title', l.title,
              'attempt_id', qa.id,
              'score', qa.score,
              'max_score', q.total_points,
              'completed_at', qa.completed_at,
              'time_taken', qa.time_taken_seconds
            )
          )
          FROM quizzes q
          INNER JOIN lessons l ON l.id = q.lesson_id
          LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = $2
          WHERE l.week_id = cw.id
        ) as quizzes
        
      FROM course_weeks cw
      WHERE cw.course_id = $1
      ORDER BY cw.week_number
    `;

    const result = await pool.query(performanceQuery, [courseId, profileId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching student performance:', error);
    res.status(500).json({ error: 'Failed to fetch student performance' });
  }
});

// Get student's attendance records
router.get('/courses/:courseId/students/:studentId/attendance', requireAuth, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;

    // Get profile ID
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE clerk_user_id = $1',
      [studentId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = profileResult.rows[0].id;

    const attendanceQuery = `
      SELECT 
        lcs.id as schedule_id,
        lcs.title,
        lcs.scheduled_date,
        lcs.start_time,
        lcs.end_time,
        lcs.status as class_status,
        cw.week_number,
        cw.title as week_title,
        lca.status as attendance_status,
        lca.joined_at,
        lca.left_at,
        lca.duration_minutes
      FROM live_class_schedules lcs
      LEFT JOIN live_class_attendance lca ON lca.schedule_id = lcs.id AND lca.student_id = $2
      LEFT JOIN course_weeks cw ON cw.id = lcs.week_id
      WHERE lcs.course_id = $1
      ORDER BY lcs.scheduled_date DESC, lcs.start_time DESC
    `;

    const result = await pool.query(attendanceQuery, [courseId, profileId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Get leaderboard for a course
router.get('/courses/:courseId/leaderboard', requireAuth, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { weekId } = req.query;

    let leaderboardQuery = `
      SELECT 
        p.clerk_user_id as clerk_id,
        COALESCE(SPLIT_PART(p.full_name, ' ', 1), p.email) as first_name,
        COALESCE(SPLIT_PART(p.full_name, ' ', 2), '') as last_name,
        
        -- Assignment score
        COALESCE(
          (
            SELECT SUM(asub.grade)
            FROM assignment_submissions asub
            INNER JOIN assignments a ON a.id = asub.assignment_id
            INNER JOIN lessons l ON l.id = a.lesson_id
            INNER JOIN course_weeks cw ON cw.id = l.week_id
            WHERE asub.student_id = p.id
            AND cw.course_id = $1
            ${weekId ? 'AND cw.id = $2' : ''}
            AND asub.status = 'graded'
          ), 0
        ) as assignment_points,
        
        -- Quiz score
        COALESCE(
          (
            SELECT SUM(qa.score)
            FROM quiz_attempts qa
            INNER JOIN quizzes q ON q.id = qa.quiz_id
            INNER JOIN lessons l ON l.id = q.lesson_id
            INNER JOIN course_weeks cw ON cw.id = l.week_id
            WHERE qa.student_id = p.id
            AND cw.course_id = $1
            ${weekId ? 'AND cw.id = $2' : ''}
          ), 0
        ) as quiz_points,
        
        -- Total assignments for percentage
        (
          SELECT COUNT(*)
          FROM assignments a
          INNER JOIN lessons l ON l.id = a.lesson_id
          INNER JOIN course_weeks cw ON cw.id = l.week_id
          WHERE cw.course_id = $1
          ${weekId ? 'AND cw.id = $2' : ''}
        ) as total_assignments,
        
        -- Completed assignments
        (
          SELECT COUNT(*)
          FROM assignment_submissions asub
          INNER JOIN assignments a ON a.id = asub.assignment_id
          INNER JOIN lessons l ON l.id = a.lesson_id
          INNER JOIN course_weeks cw ON cw.id = l.week_id
          WHERE asub.student_id = p.id
          AND asub.status = 'graded'
          AND cw.course_id = $1
          ${weekId ? 'AND cw.id = $2' : ''}
        ) as completed_assignments

      FROM enrollments e
      INNER JOIN profiles p ON p.id = e.student_id
      WHERE e.course_id = $1
      ORDER BY (assignment_points + quiz_points) DESC
      LIMIT 50
    `;

    const params = weekId ? [courseId, weekId] : [courseId];
    const result = await pool.query(leaderboardQuery, params);

    res.json({
      success: true,
      data: result.rows.map((row: any, index: number) => ({
        rank: index + 1,
        clerk_id: row.clerk_id,
        full_name: `${row.first_name} ${row.last_name}`,
        profile_image_url: null,
        assignment_points: parseFloat(row.assignment_points),
        quiz_points: parseFloat(row.quiz_points),
        total_points: parseFloat(row.assignment_points) + parseFloat(row.quiz_points),
        completed_assignments: parseInt(row.completed_assignments),
        total_assignments: parseInt(row.total_assignments),
        completion_rate: row.total_assignments > 0 
          ? Math.round((parseInt(row.completed_assignments) / parseInt(row.total_assignments)) * 100)
          : 0
      }))
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Grade an assignment submission
router.post('/submissions/:submissionId/grade', requireAuth, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback, maxPoints } = req.body;
    const userId = req.auth?.userId;

    // Get teacher profile ID
    const teacherProfile = await pool.query(
      'SELECT id FROM profiles WHERE clerk_user_id = $1',
      [userId]
    );

    if (teacherProfile.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Update submission with grade
    const updateQuery = `
      UPDATE assignment_submissions
      SET 
        grade = $1,
        feedback = $2,
        status = 'graded',
        graded_by = $3,
        graded_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      grade,
      feedback,
      teacherProfile.rows[0].id,
      submissionId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ error: 'Failed to grade submission' });
  }
});

// Mark attendance for a student
router.post('/courses/:courseId/schedules/:scheduleId/attendance', requireAuth, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { studentId, status, duration } = req.body;

    // Get student profile ID
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE clerk_user_id = $1',
      [studentId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const profileId = profileResult.rows[0].id;

    // Upsert attendance record
    const upsertQuery = `
      INSERT INTO live_class_attendance (schedule_id, student_id, status, duration_minutes, joined_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (schedule_id, student_id)
      DO UPDATE SET 
        status = $3,
        duration_minutes = $4,
        left_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [
      scheduleId,
      profileId,
      status,
      duration
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

export default router;
