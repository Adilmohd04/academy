import { supabase } from '../../../config/database';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  passing_score: number;
  max_attempts?: number;
  questions: QuizQuestion[];
}

interface QuizSubmission {
  attempt_id: string;
  score: number;
  passed: boolean;
  correct_answers: number;
  total_questions: number;
  attempt_number: number;
  question_results: Array<{
    question_id: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    points_earned: number;
  }>;
}

export const getQuizByLesson = async (
  lessonId: string,
  studentId: string
): Promise<{ quiz: Quiz; attempts: any[] }> => {
  // Get quiz details
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .select('id, lesson_id, title, description, time_limit_minutes, passing_score, max_attempts')
    .eq('lesson_id', lessonId)
    .single();

  if (quizError || !quizData) {
    throw new Error('Quiz not found');
  }

  const quiz = quizData;

  // Get questions (without showing correct answers initially - will be shown after submission)
  const { data: questionsData, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('id, question_text, question_type, options, points, order_index, correct_answer')
    .eq('quiz_id', quiz.id)
    .order('order_index');

  if (questionsError) {
    throw questionsError;
  }

  // Get previous attempts
  const { data: attemptsData, error: attemptsError } = await supabase
    .from('quiz_attempts')
    .select('attempt_number, score, passed, submitted_at')
    .eq('quiz_id', quiz.id)
    .eq('student_id', studentId)
    .order('attempt_number', { ascending: false });

  if (attemptsError) {
    throw attemptsError;
  }

  return {
    quiz: {
      ...quiz,
      questions: questionsData || []
    },
    attempts: attemptsData || []
  };
};

export const submitQuiz = async (
  lessonId: string,
  studentId: string,
  answers: { [questionId: string]: string }
): Promise<QuizSubmission> => {
  // Get quiz
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .select('id, passing_score, max_attempts')
    .eq('lesson_id', lessonId)
    .single();

  if (quizError || !quizData) {
    throw new Error('Quiz not found');
  }

  const quiz = quizData;

  // Check attempt limit
  const { count: attemptCount, error: countError } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quiz.id)
    .eq('student_id', studentId);

  if (countError) {
    throw countError;
  }

  const currentAttemptCount = attemptCount || 0;

  if (quiz.max_attempts && currentAttemptCount >= quiz.max_attempts) {
    throw new Error('Maximum attempts reached');
  }

  // Get all questions
  const { data: questionsData, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('id, correct_answer, points, question_text')
    .eq('quiz_id', quiz.id);

  if (questionsError) {
    throw questionsError;
  }

  const questions = questionsData || [];

  // Grade the quiz
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;
  const questionResults = [];

  for (const question of questions) {
    totalPoints += question.points;
    const studentAnswer = answers[question.id] || '';
    const isCorrect = studentAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();

    const pointsEarned = isCorrect ? question.points : 0;
    earnedPoints += pointsEarned;

    if (isCorrect) correctCount++;

    questionResults.push({
      question_id: question.id,
      student_answer: studentAnswer,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      points_earned: pointsEarned
    });
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= quiz.passing_score;
  const attemptNumber = currentAttemptCount + 1;

  // Save quiz attempt
  const { data: attemptData, error: attemptError } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: quiz.id,
      student_id: studentId,
      score,
      passed,
      attempt_number: attemptNumber,
      submitted_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (attemptError || !attemptData) {
    throw attemptError || new Error('Failed to create quiz attempt');
  }

  const attemptId = attemptData.id;

  // Save individual answers
  const answersToInsert = questionResults.map(result => ({
    attempt_id: attemptId,
    question_id: result.question_id,
    student_answer: result.student_answer,
    is_correct: result.is_correct,
    points_earned: result.points_earned
  }));

  const { error: answersError } = await supabase
    .from('quiz_answers')
    .insert(answersToInsert);

  if (answersError) {
    throw answersError;
  }

  // If passed, mark lesson as complete
  if (passed) {
    const { error: progressError } = await supabase
      .from('lesson_progress')
      .upsert({
        lesson_id: lessonId,
        student_id: studentId,
        is_completed: true,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'lesson_id,student_id'
      });

    if (progressError) {
      console.error('Error updating lesson progress:', progressError);
    }

    // Update course enrollment progress
    const { data: courseData } = await supabase
      .from('course_lessons')
      .select('week:course_weeks(course_id)')
      .eq('id', lessonId)
      .single();

    if (courseData?.week) {
      const courseId = (courseData.week as any).course_id;

      // Get progress stats using a direct query
      const { data: lessonStats } = await supabase
        .from('course_lessons')
        .select('id')
        .eq('week_id', courseData.week);

      const { data: completedStats } = await supabase
        .from('lesson_progress')
        .select('id')
        .eq('student_id', studentId)
        .eq('is_completed', true);

      if (lessonStats && completedStats) {
        const totalLessons = lessonStats.length;
        const completedLessons = completedStats.length;
        const progressPercentage = totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

        await supabase
          .from('enrollments')
          .update({
            progress_percentage: progressPercentage,
            last_accessed: new Date().toISOString()
          })
          .eq('course_id', courseId)
          .eq('student_id', studentId);
      }
    }
  }

  return {
    attempt_id: attemptId,
    score,
    passed,
    correct_answers: correctCount,
    total_questions: questions.length,
    attempt_number: attemptNumber,
    question_results: questionResults
  };
};

export const getQuizAttempts = async (
  quizId: string,
  studentId: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      attempt_number,
      score,
      passed,
      submitted_at,
      quiz_answers (
        question_id,
        student_answer,
        is_correct,
        points_earned
      )
    `)
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .order('attempt_number', { ascending: false });

  if (error) {
    throw error;
  }

  // Transform to match expected format
  return (data || []).map(attempt => ({
    ...attempt,
    answers: attempt.quiz_answers
  }));
};
