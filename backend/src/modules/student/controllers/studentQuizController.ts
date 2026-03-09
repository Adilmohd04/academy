import { Request, Response } from 'express';
import { supabase } from '../../../config/database';
import autoGradingService from '../../../services/autoGradingService';

/**
 * Student Quiz Controller
 * Handles quiz taking, submission, and viewing results
 */

// Get available quizzes for a course (student view)
export const getAvailableQuizzes = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Verify student is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', profile.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Get published quizzes for the course
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, description, passing_score, time_limit_minutes, max_attempts, display_order')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (quizzesError) {
      console.error('Error fetching quizzes:', quizzesError);
      return res.status(500).json({ error: 'Failed to fetch quizzes' });
    }

    // Get student's attempt history for each quiz
    const quizzesWithAttempts = await Promise.all(
      (quizzes || []).map(async (quiz) => {
        // Get all attempts for this quiz
        const { data: attempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('id, score, percentage, passed, submitted_at')
          .eq('quiz_id', quiz.id)
          .eq('student_id', profile.id)
          .order('submitted_at', { ascending: false });

        const attemptsTaken = attempts?.length || 0;
        const canAttempt = attemptsTaken < (quiz.max_attempts || 3);
        const bestScore = attempts && attempts.length > 0
          ? Math.max(...attempts.map(a => a.percentage || 0))
          : null;
        const hasPassed = attempts && attempts.some(a => a.passed);

        return {
          ...quiz,
          attempts_taken: attemptsTaken,
          can_attempt: canAttempt,
          best_score: bestScore,
          has_passed: hasPassed,
          recent_attempts: attempts?.slice(0, 3) || []
        };
      })
    );

    res.json({ quizzes: quizzesWithAttempts });
  } catch (error: any) {
    console.error('Error in getAvailableQuizzes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Start a quiz attempt (get questions without answers)
export const startQuizAttempt = async (req: any, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.auth?.userId;

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, course_id, title, description, passing_score, time_limit_minutes, max_attempts, is_published')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (!quiz.is_published) {
      return res.status(403).json({ error: 'This quiz is not available yet' });
    }

    // Verify student is enrolled
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', profile.id)
      .eq('course_id', quiz.course_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Check attempt limit
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('student_id', profile.id);

    if (!attemptsError && attempts && attempts.length >= (quiz.max_attempts || 3)) {
      return res.status(403).json({ error: 'Maximum attempts reached for this quiz' });
    }

    // Get questions (without correct answers)
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question_text, question_type, options, points, display_order')
      .eq('quiz_id', quizId)
      .order('display_order', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    const started_at = new Date().toISOString();

    res.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passing_score: quiz.passing_score,
        time_limit_minutes: quiz.time_limit_minutes,
        questions: questions || []
      },
      started_at,
      message: 'Quiz started. Good luck!'
    });
  } catch (error: any) {
    console.error('Error in startQuizAttempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Submit quiz attempt and get results
export const submitQuizAttempt = async (req: any, res: Response) => {
  try {
    const { quizId } = req.params;
    const { answers, started_at, time_taken_seconds } = req.body;
    const userId = req.auth?.userId;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get quiz details with passing score from course if not on quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        course_id,
        max_attempts,
        courses!inner (
          passing_score
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Get passing score from course (not from quiz anymore)
    const courseData = Array.isArray(quiz.courses) ? quiz.courses[0] : quiz.courses;
    const passingScore = courseData?.passing_score || 70;

    // Check attempt limit
    const { data: previousAttempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('student_id', profile.id);

    if (!attemptsError && previousAttempts && previousAttempts.length >= (quiz.max_attempts || 3)) {
      return res.status(403).json({ error: 'Maximum attempts reached' });
    }

    // Use auto-grading service to grade the quiz
    const gradingResult = await autoGradingService.gradeQuizSubmission(
      quizId,
      answers,
      passingScore
    );

    // Save the quiz attempt
    const attempt = await autoGradingService.saveQuizAttempt(
      quizId,
      profile.id,
      answers,
      gradingResult,
      time_taken_seconds,
      started_at
    );

    // Update course progress if quiz was passed
    if (gradingResult.passed && quiz.course_id) {
      try {
        // Get total lessons and quizzes count
        const { data: progressData } = await supabase.rpc('calculate_course_progress', {
          p_course_id: quiz.course_id,
          p_student_id: profile.id
        });

        if (progressData) {
          // Update enrollment progress
          await supabase
            .from('enrollments')
            .update({ progress_percentage: progressData.progress_percentage })
            .eq('course_id', quiz.course_id)
            .eq('student_id', profile.id);
        }
      } catch (progressError) {
        console.error('Error updating course progress:', progressError);
        // Don't fail the request if progress update fails
      }
    }

    res.json({
      attempt_id: attempt.id,
      score: gradingResult.score,
      total_points: gradingResult.total_points,
      percentage: gradingResult.percentage,
      passed: gradingResult.passed,
      passing_score: passingScore,
      results: gradingResult.results,
      message: gradingResult.passed 
        ? 'Congratulations! You passed the quiz!' 
        : 'Keep practicing! You can try again.'
    });
  } catch (error: any) {
    console.error('Error in submitQuizAttempt:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get quiz attempt results
export const getAttemptResults = async (req: any, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = req.auth?.userId;

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes!inner (
          id,
          title,
          description,
          passing_score,
          course_id
        )
      `)
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return res.status(404).json({ error: 'Quiz attempt not found' });
    }

    // Verify student owns this attempt
    if (attempt.student_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get questions with correct answers
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', attempt.quiz_id)
      .order('display_order', { ascending: true });

    if (questionsError) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Build detailed results
    const results = (questions || []).map((question) => {
      const studentAnswer = attempt.answers[question.id] || '';
      const correctAnswer = question.correct_answer;
      const points = question.points || 1;

      let isCorrect = false;
      if (question.question_type === 'mcq' || question.question_type === 'true_false') {
        isCorrect = studentAnswer.toString().trim().toLowerCase() === correctAnswer.toString().trim().toLowerCase();
      } else if (question.question_type === 'short_answer') {
        const normalizedStudent = studentAnswer.toString().trim().toLowerCase();
        const normalizedCorrect = correctAnswer.toString().trim().toLowerCase();
        isCorrect = normalizedStudent === normalizedCorrect;
      }

      return {
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options,
        student_answer: studentAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        points_earned: isCorrect ? points : 0,
        points_possible: points,
        explanation: question.explanation
      };
    });

    res.json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        total_points: attempt.total_points,
        percentage: attempt.percentage,
        passed: attempt.passed,
        time_taken_seconds: attempt.time_taken_seconds,
        submitted_at: attempt.submitted_at
      },
      quiz: {
        id: attempt.quizzes.id,
        title: attempt.quizzes.title,
        description: attempt.quizzes.description,
        passing_score: attempt.quizzes.passing_score,
        course_id: attempt.quizzes.course_id
      },
      results
    });
  } catch (error: any) {
    console.error('Error in getAttemptResults:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get student's quiz history
export const getStudentQuizHistory = async (req: any, res: Response) => {
  try {
    const userId = req.auth?.userId;

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Get all attempts with quiz and course details
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        score,
        total_points,
        percentage,
        passed,
        submitted_at,
        quizzes!inner (
          id,
          title,
          course_id,
          courses!inner (
            id,
            title
          )
        )
      `)
      .eq('student_id', profile.id)
      .order('submitted_at', { ascending: false });

    if (attemptsError) {
      console.error('Error fetching quiz history:', attemptsError);
      return res.status(500).json({ error: 'Failed to fetch quiz history' });
    }

    const history = (attempts || []).map((attempt: any) => ({
      attempt_id: attempt.id,
      score: attempt.score,
      total_points: attempt.total_points,
      percentage: attempt.percentage,
      passed: attempt.passed,
      submitted_at: attempt.submitted_at,
      quiz_id: attempt.quizzes.id,
      quiz_title: attempt.quizzes.title,
      course_id: attempt.quizzes.course_id,
      course_title: attempt.quizzes.courses.title
    }));

    res.json({ history });
  } catch (error: any) {
    console.error('Error in getStudentQuizHistory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
