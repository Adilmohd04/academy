import { supabase } from '../../../config/database';

interface QuizAttemptDetail {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
  answers: Array<{
    question_id: string;
    question_text: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    points_earned: number;
  }>;
}

export const getQuizAttempts = async (
  quizId: string,
  teacherId: string
): Promise<QuizAttemptDetail[]> => {
  // Verify teacher owns this quiz's course
  const { data: verifyData, error: verifyError } = await supabase
    .from('quizzes')
    .select(`
      id,
      course_lessons!inner (
        id,
        course_weeks!inner (
          id,
          courses!inner (
            id,
            teacher_id
          )
        )
      )
    `)
    .eq('id', quizId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error('Quiz not found');
  }

  const course = (verifyData.course_lessons as any)?.course_weeks?.courses;
  if (!course || course.teacher_id !== teacherId) {
    throw new Error('Unauthorized');
  }

  // Get all attempts
  const { data: attemptsData, error: attemptsError } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      student_id,
      score,
      passed,
      attempt_number,
      submitted_at
    `)
    .eq('quiz_id', quizId)
    .order('submitted_at', { ascending: false });

  if (attemptsError) {
    throw attemptsError;
  }

  // Manually fetch student profiles
  const studentIds = (attemptsData || []).map((a: any) => a.student_id).filter(Boolean);
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

  const attempts: QuizAttemptDetail[] = [];

  // Get answers for each attempt
  for (const attempt of attemptsData || []) {
    const { data: answersData, error: answersError } = await supabase
      .from('quiz_answers')
      .select(`
        question_id,
        student_answer,
        is_correct,
        points_earned,
        quiz_questions!inner (
          question_text,
          correct_answer,
          order_index
        )
      `)
      .eq('attempt_id', attempt.id)
      .order('quiz_questions(order_index)');

    if (answersError) {
      throw answersError;
    }

    const studentProfile = profilesMap[attempt.student_id];
    attempts.push({
      id: attempt.id,
      student_id: attempt.student_id,
      student_name: studentProfile?.full_name || 'Unknown',
      student_email: studentProfile?.email || '',
      score: attempt.score,
      passed: attempt.passed,
      attempt_number: attempt.attempt_number,
      submitted_at: attempt.submitted_at,
      answers: (answersData || []).map(ans => ({
        question_id: ans.question_id,
        question_text: (ans.quiz_questions as any)?.question_text || '',
        student_answer: ans.student_answer,
        correct_answer: (ans.quiz_questions as any)?.correct_answer || '',
        is_correct: ans.is_correct,
        points_earned: ans.points_earned
      }))
    });
  }

  return attempts;
};

export const updateQuizScore = async (
  attemptId: string,
  newScore: number,
  teacherId: string
): Promise<void> => {
  // Verify ownership
  const { data: verifyData, error: verifyError } = await supabase
    .from('quiz_attempts')
    .select(`
      id,
      quizzes!inner (
        passing_score,
        course_lessons!inner (
          course_weeks!inner (
            courses!inner (
              teacher_id
            )
          )
        )
      )
    `)
    .eq('id', attemptId)
    .single();

  if (verifyError || !verifyData) {
    throw new Error('Attempt not found');
  }

  const course = (verifyData.quizzes as any)?.course_lessons?.course_weeks?.courses;
  if (!course || course.teacher_id !== teacherId) {
    throw new Error('Unauthorized');
  }

  const passingScore = (verifyData.quizzes as any).passing_score;
  const passed = newScore >= passingScore;

  const { error: updateError } = await supabase
    .from('quiz_attempts')
    .update({ score: newScore, passed })
    .eq('id', attemptId);

  if (updateError) {
    throw updateError;
  }
};
