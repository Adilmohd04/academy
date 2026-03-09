import { supabase } from '../config/database';

/**
 * Auto-Grading Service
 * 
 * Handles automatic grading of quizzes and assignments
 * Supports multiple question types with flexible points allocation
 */

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_ar?: string;
  question_ta?: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'essay';
  options?: any;
  correct_answer: string;
  points: number;
  order: number;
  explanation?: string;
} 

interface GradingResult {
  question_id: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
  needs_manual_grading: boolean;
  feedback?: string;
}

interface QuizGradingResult {
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  results: GradingResult[];
}

/**
 * Grade a single question based on its type
 */
export const gradeQuestion = (
  question: QuizQuestion,
  studentAnswer: any
): GradingResult => {
  const correctAnswer = question.correct_answer;
  const points = question.points || 1;
  
  let isCorrect = false;
  let needsManualGrading = false;
  let feedback = '';

  // Normalize answers for comparison
  const normalizeAnswer = (answer: any): string => {
    if (answer === null || answer === undefined) return '';
    return answer.toString().trim().toLowerCase();
  };

  const normalizedStudent = normalizeAnswer(studentAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  switch (question.type) {
    case 'mcq':
      // Multiple choice - exact match
      isCorrect = normalizedStudent === normalizedCorrect;
      break;

    case 'true_false':
      // True/False - exact match (case-insensitive)
      isCorrect = normalizedStudent === normalizedCorrect;
      break;

    case 'short_answer':
      // Short answer - check for exact match or contains correct answer
      if (normalizedStudent === normalizedCorrect) {
        isCorrect = true;
      } else if (normalizedStudent.includes(normalizedCorrect)) {
        // Partial match - might need review
        isCorrect = true;
        feedback = 'Auto-graded based on keyword match. May need manual review.';
      } else {
        // Check for reverse (correct answer contains student answer)
        if (normalizedCorrect.includes(normalizedStudent) && normalizedStudent.length > 3) {
          isCorrect = true;
          feedback = 'Partial answer detected. Consider manual review for full credit.';
        } else {
          isCorrect = false;
          needsManualGrading = true;
          feedback = 'Requires manual grading';
        }
      }
      break;

    case 'essay':
      // Essay questions always need manual grading
      needsManualGrading = true;
      feedback = 'Essay question - requires manual grading';
      break;

    default:
      // Unknown question type
      needsManualGrading = true;
      feedback = 'Unknown question type - requires manual grading';
  }

  const pointsEarned = isCorrect ? points : 0;

  return {
    question_id: question.id,
    student_answer: studentAnswer || '',
    correct_answer: correctAnswer,
    is_correct: isCorrect,
    points_earned: pointsEarned,
    points_possible: points,
    needs_manual_grading: needsManualGrading,
    feedback
  };
};

/**
 * Grade an entire quiz submission
 */
export const gradeQuizSubmission = async (
  quizId: string,
  answers: Record<string, any>,
  passingPercentage: number = 70
): Promise<QuizGradingResult> => {
  // Get all questions for the quiz
  const { data: questions, error: questionsError } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', quizId)
    .order('order', { ascending: true });

  if (questionsError || !questions) {
    throw new Error('Failed to fetch quiz questions');
  }

  // Grade each question
  const results = questions.map((question: QuizQuestion) => {
    const studentAnswer = answers[question.id];
    return gradeQuestion(question, studentAnswer);
  });

  // Calculate total score
  const score = results.reduce((sum: number, result: GradingResult) => sum + result.points_earned, 0);
  const totalPoints = results.reduce((sum: number, result: GradingResult) => sum + result.points_possible, 0);
  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
  const passed = percentage >= passingPercentage;

  return {
    score,
    total_points: totalPoints,
    percentage: Math.round(percentage * 100) / 100,
    passed,
    results
  };
};

/**
 * Save quiz attempt with grading results
 */
export const saveQuizAttempt = async (
  quizId: string,
  studentId: string,
  answers: Record<string, any>,
  gradingResult: QuizGradingResult,
  timeTakenSeconds?: number,
  startedAt?: string
): Promise<any> => {
  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      student_id: studentId,
      score: gradingResult.score,
      total_points: gradingResult.total_points,
      percentage: gradingResult.percentage,
      passed: gradingResult.passed,
      answers: answers,
      grading_results: gradingResult.results,
      time_taken_seconds: timeTakenSeconds,
      started_at: startedAt || new Date().toISOString(),
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to save quiz attempt: ' + error.message);
  }

  return attempt;
};

/**
 * Get questions that need manual grading
 */
export const getQuestionsNeedingManualGrading = async (
  quizId: string
): Promise<any[]> => {
  // Get all attempts with questions that need manual grading
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      quiz_id,
      student_id,
      grading_results,
      submitted_at
    `)
    .eq('quiz_id', quizId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch quiz attempts: ' + error.message);
  }

  // Manually fetch student profiles
  const studentIds = (attempts || []).map((a: any) => a.student_id).filter(Boolean);
  let profilesMap: Record<string, any> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', studentIds);
    profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.clerk_user_id] = p;
      return acc;
    }, {});
  }

  // Filter attempts that have questions needing manual grading and attach profiles
  const needsGrading = (attempts || [])
    .map((attempt: any) => ({
      ...attempt,
      profiles: profilesMap[attempt.student_id] || null
    }))
    .filter((attempt: any) => {
      const results = attempt.grading_results || [];
      return results.some((r: GradingResult) => r.needs_manual_grading);
    });

  return needsGrading;
};

/**
 * Update manual grade for a specific question in an attempt
 */
export const updateManualGrade = async (
  attemptId: string,
  questionId: string,
  pointsAwarded: number,
  feedback?: string
): Promise<void> => {
  // Get the attempt
  const { data: attempt, error: fetchError } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('id', attemptId)
    .single();

  if (fetchError || !attempt) {
    throw new Error('Quiz attempt not found');
  }

  // Update the grading results
  const results = attempt.grading_results || [];
  const updatedResults = results.map((result: GradingResult) => {
    if (result.question_id === questionId) {
      return {
        ...result,
        points_earned: pointsAwarded,
        needs_manual_grading: false,
        feedback: feedback || result.feedback,
        manually_graded: true
      };
    }
    return result;
  });

  // Recalculate total score
  const newScore = updatedResults.reduce((sum: number, r: any) => sum + r.points_earned, 0);
  const totalPoints = updatedResults.reduce((sum: number, r: any) => sum + r.points_possible, 0);
  const newPercentage = totalPoints > 0 ? (newScore / totalPoints) * 100 : 0;

  // Get passing score from quiz
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('passing_score')
    .eq('id', attempt.quiz_id)
    .single();

  const passingScore = quiz?.passing_score || 70;
  const passed = newPercentage >= passingScore;

  // Update the attempt
  const { error: updateError } = await supabase
    .from('quiz_attempts')
    .update({
      grading_results: updatedResults,
      score: newScore,
      percentage: Math.round(newPercentage * 100) / 100,
      passed,
      graded_at: new Date().toISOString()
    })
    .eq('id', attemptId);

  if (updateError) {
    throw new Error('Failed to update manual grade: ' + updateError.message);
  }
};

/**
 * Calculate student's best quiz score
 */
export const getBestQuizScore = async (
  quizId: string,
  studentId: string
): Promise<number | null> => {
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('percentage')
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .order('percentage', { ascending: false })
    .limit(1);

  if (error || !attempts || attempts.length === 0) {
    return null;
  }

  return attempts[0].percentage;
};

/**
 * Check if student has passed a quiz (any attempt)
 */
export const hasPassedQuiz = async (
  quizId: string,
  studentId: string
): Promise<boolean> => {
  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('passed')
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .eq('passed', true)
    .limit(1);

  if (error) {
    return false;
  }

  return attempts && attempts.length > 0;
};

export default {
  gradeQuestion,
  gradeQuizSubmission,
  saveQuizAttempt,
  getQuestionsNeedingManualGrading,
  updateManualGrade,
  getBestQuizScore,
  hasPassedQuiz
};
