/**
 * Student Final Exam Service
 * 
 * Handles student interactions with final exams:
 * - Starting exam attempts
 * - Auto-saving answers
 * - Submitting exams
 * - Viewing results
 */

import pool from '../../../config/database';

interface StartExamData {
  exam_id: string;
  student_id: string;
}

interface SaveAnswerData {
  submission_id: string;
  question_id: string;
  answer_text?: string;
  selected_options?: string[];
  uploaded_file_url?: string;
}

/**
 * Get available exams for student
 */
export const getAvailableExams = async (studentId: string) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        ce.id,
        ce.course_id,
        c.title as course_title,
        ce.title,
        ce.description,
        ce.duration_minutes,
        ce.passing_score,
        ce.total_marks,
        ce.is_published,
        ce.max_attempts,
        COUNT(DISTINCT eq.id) as question_count,
        COUNT(DISTINCT es.id) FILTER (WHERE es.student_id = $1) as attempts_used
      FROM course_exams ce
      INNER JOIN courses c ON ce.course_id = c.id
      INNER JOIN enrollments e ON c.id = e.course_id AND e.student_id = $1
      LEFT JOIN exam_questions eq ON ce.id = eq.exam_id
      LEFT JOIN exam_submissions es ON ce.id = es.exam_id
      WHERE ce.is_published = true
      GROUP BY ce.id, c.title
      HAVING COUNT(DISTINCT es.id) FILTER (WHERE es.student_id = $1 AND es.status = 'submitted') < ce.max_attempts
      ORDER BY c.title, ce.title`,
      [studentId]
    );
    
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Get exam details for student (without answers)
 */
export const getExamForStudent = async (examId: string, studentId: string) => {
  const client = await pool.connect();
  
  try {
    // Check if student is enrolled
    const enrollmentCheck = await client.query(
      `SELECT 1 FROM enrollments e
       INNER JOIN course_exams ce ON e.course_id = ce.course_id
       WHERE ce.id = $1 AND e.student_id = $2 AND e.status = 'enrolled'`,
      [examId, studentId]
    );
    
    if (enrollmentCheck.rows.length === 0) {
      throw new Error('You are not enrolled in this course');
    }
    
    // Get exam details
    const examResult = await client.query(
      `SELECT ce.*, c.title as course_title
       FROM course_exams ce
       INNER JOIN courses c ON ce.course_id = c.id
       WHERE ce.id = $1 AND ce.is_published = true`,
      [examId]
    );
    
    if (examResult.rows.length === 0) {
      throw new Error('Exam not found or not published');
    }
    
    const exam = examResult.rows[0];
    
    // Get questions (without answers)
    const questionsResult = await client.query(
      `SELECT id, question_text, question_type, options, marks, order_index, file_type, max_file_size_mb, max_duration_minutes
       FROM exam_questions
       WHERE exam_id = $1
       ORDER BY order_index`,
      [examId]
    );
    
    // Check previous attempts
    const attemptsResult = await client.query(
      `SELECT COUNT(*) as attempts_used
       FROM exam_submissions
       WHERE exam_id = $1 AND student_id = $2 AND status = 'submitted'`,
      [examId, studentId]
    );
    
    return {
      ...exam,
      questions: questionsResult.rows,
      attempts_used: parseInt(attemptsResult.rows[0].attempts_used)
    };
  } finally {
    client.release();
  }
};

/**
 * Start exam attempt
 */
export const startExamAttempt = async (data: StartExamData) => {
  const client = await pool.connect();
  
  try {
    // Check if student can start exam
    const exam = await getExamForStudent(data.exam_id, data.student_id);
    
    if (exam.attempts_used >= exam.max_attempts) {
      throw new Error(`Maximum attempts (${exam.max_attempts}) reached`);
    }
    
    // Check for ongoing attempt
    const ongoingResult = await client.query(
      `SELECT id FROM exam_submissions
       WHERE exam_id = $1 AND student_id = $2 AND status = 'in_progress'`,
      [data.exam_id, data.student_id]
    );
    
    if (ongoingResult.rows.length > 0) {
      return {
        submission_id: ongoingResult.rows[0].id,
        message: 'Resuming existing attempt'
      };
    }
    
    // Create new submission
    const result = await client.query(
      `INSERT INTO exam_submissions (exam_id, student_id, started_at, status)
       VALUES ($1, $2, NOW(), 'in_progress')
       RETURNING id, started_at`,
      [data.exam_id, data.student_id]
    );
    
    return {
      submission_id: result.rows[0].id,
      started_at: result.rows[0].started_at,
      message: 'Exam started successfully'
    };
  } finally {
    client.release();
  }
};

/**
 * Auto-save answer (every 30 seconds)
 */
export const saveAnswer = async (data: SaveAnswerData) => {
  const client = await pool.connect();
  
  try {
    // Verify submission is in progress
    const submissionResult = await client.query(
      `SELECT status, started_at, es.exam_id, ce.duration_minutes
       FROM exam_submissions es
       INNER JOIN course_exams ce ON es.exam_id = ce.id
       WHERE es.id = $1`,
      [data.submission_id]
    );
    
    if (submissionResult.rows.length === 0) {
      throw new Error('Submission not found');
    }
    
    const submission = submissionResult.rows[0];
    
    if (submission.status !== 'in_progress') {
      throw new Error('Cannot save answer - exam is not in progress');
    }
    
    // Check if time is up
    const elapsed = (Date.now() - new Date(submission.started_at).getTime()) / 1000 / 60;
    if (elapsed > submission.duration_minutes) {
      // Auto-submit
      await submitExam(data.submission_id);
      throw new Error('Time limit exceeded - exam auto-submitted');
    }
    
    // Save or update answer
    await client.query(
      `INSERT INTO exam_answers 
        (submission_id, question_id, answer_text, selected_options, uploaded_file_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (submission_id, question_id) 
       DO UPDATE SET 
         answer_text = EXCLUDED.answer_text,
         selected_options = EXCLUDED.selected_options,
         uploaded_file_url = EXCLUDED.uploaded_file_url`,
      [
        data.submission_id,
        data.question_id,
        data.answer_text,
        data.selected_options ? JSON.stringify(data.selected_options) : null,
        data.uploaded_file_url
      ]
    );
    
    return { success: true, message: 'Answer saved' };
  } finally {
    client.release();
  }
};

/**
 * Submit exam
 */
export const submitExam = async (submissionId: string) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get submission details
    const submissionResult = await client.query(
      `SELECT es.*, ce.id as exam_id
       FROM exam_submissions es
       INNER JOIN course_exams ce ON es.exam_id = ce.id
       WHERE es.id = $1`,
      [submissionId]
    );
    
    if (submissionResult.rows.length === 0) {
      throw new Error('Submission not found');
    }
    
    const submission = submissionResult.rows[0];
    
    if (submission.status === 'submitted') {
      throw new Error('Exam already submitted');
    }
    
    // Auto-grade MCQ/True-False questions
    const questionsResult = await client.query(
      `SELECT eq.id, eq.question_type, eq.correct_answer, eq.marks,
         ea.selected_options, ea.answer_text
       FROM exam_questions eq
       LEFT JOIN exam_answers ea ON eq.id = ea.question_id AND ea.submission_id = $1
       WHERE eq.exam_id = $2`,
      [submissionId, submission.exam_id]
    );
    
    let autoGradedScore = 0;
    
    for (const question of questionsResult.rows) {
      if (question.question_type === 'mcq' || question.question_type === 'multiple_choice') {
        const correctAnswer = Array.isArray(question.correct_answer) 
          ? question.correct_answer 
          : JSON.parse(question.correct_answer || '[]');
        const studentAnswer = question.selected_options 
          ? (Array.isArray(question.selected_options) ? question.selected_options : JSON.parse(question.selected_options))
          : [];
        
        const isCorrect = JSON.stringify(correctAnswer.sort()) === JSON.stringify(studentAnswer.sort());
        
        if (isCorrect) {
          autoGradedScore += question.marks;
          await client.query(
            `UPDATE exam_answers SET marks_obtained = $1, is_correct = true 
             WHERE submission_id = $2 AND question_id = $3`,
            [question.marks, submissionId, question.id]
          );
        } else {
          await client.query(
            `UPDATE exam_answers SET marks_obtained = 0, is_correct = false 
             WHERE submission_id = $2 AND question_id = $3`,
            [submissionId, question.id]
          );
        }
      } else if (question.question_type === 'true_false') {
        const isCorrect = question.answer_text?.toLowerCase() === question.correct_answer?.toLowerCase();
        
        if (isCorrect) {
          autoGradedScore += question.marks;
          await client.query(
            `UPDATE exam_answers SET marks_obtained = $1, is_correct = true 
             WHERE submission_id = $2 AND question_id = $3`,
            [question.marks, submissionId, question.id]
          );
        } else {
          await client.query(
            `UPDATE exam_answers SET marks_obtained = 0, is_correct = false 
             WHERE submission_id = $2 AND question_id = $3`,
            [submissionId, question.id]
          );
        }
      }
    }
    
    // Update submission
    await client.query(
      `UPDATE exam_submissions 
       SET status = 'submitted',
           submitted_at = NOW(),
           auto_graded_score = $1
       WHERE id = $2`,
      [autoGradedScore, submissionId]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      auto_graded_score: autoGradedScore,
      message: 'Exam submitted successfully. Teacher will grade subjective questions.'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get submission with answers and results
 */
export const getSubmissionResults = async (submissionId: string, studentId: string) => {
  const client = await pool.connect();
  
  try {
    // Get submission
    const submissionResult = await client.query(
      `SELECT es.*, ce.title as exam_title, ce.total_marks, ce.passing_score, ce.allow_review,
         c.title as course_title
       FROM exam_submissions es
       INNER JOIN course_exams ce ON es.exam_id = ce.id
       INNER JOIN courses c ON ce.course_id = c.id
       WHERE es.id = $1 AND es.student_id = $2`,
      [submissionId, studentId]
    );
    
    if (submissionResult.rows.length === 0) {
      throw new Error('Submission not found');
    }
    
    const submission = submissionResult.rows[0];
    
    if (submission.status !== 'submitted' && submission.status !== 'graded') {
      throw new Error('Cannot view results - exam not submitted yet');
    }
    
    // Get questions with student answers
    const answersResult = await client.query(
      `SELECT 
        eq.id as question_id,
        eq.question_text,
        eq.question_type,
        eq.options,
        eq.marks as max_marks,
        eq.correct_answer,
        ea.answer_text,
        ea.selected_options,
        ea.uploaded_file_url,
        ea.marks_obtained,
        ea.is_correct,
        ea.teacher_comment
       FROM exam_questions eq
       LEFT JOIN exam_answers ea ON eq.id = ea.question_id AND ea.submission_id = $1
       WHERE eq.exam_id = $2
       ORDER BY eq.order_index`,
      [submissionId, submission.exam_id]
    );
    
    return {
      ...submission,
      answers: answersResult.rows,
      passed: submission.total_score >= submission.passing_score
    };
  } finally {
    client.release();
  }
};

/**
 * Get student's exam history
 */
export const getStudentExamHistory = async (studentId: string) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        es.id as submission_id,
        ce.title as exam_title,
        c.title as course_title,
        es.started_at,
        es.submitted_at,
        es.status,
        es.total_score,
        ce.total_marks,
        ce.passing_score,
        CASE 
          WHEN es.total_score >= ce.passing_score THEN true
          ELSE false
        END as passed
       FROM exam_submissions es
       INNER JOIN course_exams ce ON es.exam_id = ce.id
       INNER JOIN courses c ON ce.course_id = c.id
       WHERE es.student_id = $1
       ORDER BY es.started_at DESC`,
      [studentId]
    );
    
    return result.rows;
  } finally {
    client.release();
  }
};
