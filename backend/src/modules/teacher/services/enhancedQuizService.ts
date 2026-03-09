/**
 * Enhanced Quiz Service
 * 
 * Handles quiz management with individual question marks:
 * - Create quizzes with marks per question
 * - Track total marks with progress bar
 * - Calculate scores automatically
 */

import { supabase } from '../../../config/database';

export interface Quiz {
  id: string;
  lesson_id?: string;
  week_id?: string;
  title: string;
  description?: string;
  total_marks: number;
  passing_marks: number;
  time_limit_minutes?: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  is_graded: boolean;
  weight_percentage: number;
  created_at: string;
  updated_at: string;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  marks: number;
  order_index: number;
  explanation?: string;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface CreateQuizInput {
  lesson_id?: string;
  week_id?: string;
  title: string;
  description?: string;
  total_marks?: number;
  passing_marks?: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  shuffle_questions?: boolean;
  show_correct_answers?: boolean;
  is_graded?: boolean;
  weight_percentage?: number;
}

export interface CreateQuestionInput {
  quiz_id: string;
  question_text: string;
  question_type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  marks: number;
  order_index?: number;
  explanation?: string;
  options?: {
    option_text: string;
    is_correct: boolean;
    order_index?: number;
  }[];
}

/**
 * Create a new quiz
 */
export const createQuiz = async (data: CreateQuizInput): Promise<Quiz> => {
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .insert([{
      ...data,
      total_marks: data.total_marks || 100,
      passing_marks: data.passing_marks || 60,
      max_attempts: data.max_attempts || 3,
      shuffle_questions: data.shuffle_questions ?? false,
      show_correct_answers: data.show_correct_answers ?? true,
      is_graded: data.is_graded ?? true,
      weight_percentage: data.weight_percentage || 100
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create quiz: ${error.message}`);
  }

  return quiz;
};

/**
 * Get quiz by ID with questions and options
 */
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select(`
      *,
      quiz_questions (*)
    `)
    .eq('id', quizId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch quiz: ${error.message}`);
  }

  return {
    ...quiz,
    questions: (quiz.quiz_questions || []).map((q: any) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      question: q.question_text,
      question_ar: q.question_ar,
      question_ta: q.question_ta,
      type: q.question_type,
      options: q.options || [],
      correct_answer: q.correct_answer,
      points: q.points,
      order: q.display_order
    }))
  };
};

/**
 * Add a question to quiz
 */
export const addQuestion = async (data: CreateQuestionInput): Promise<QuizQuestion> => {
  // Get current question count for order
  const { count } = await supabase
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', data.quiz_id);

  const orderIndex = data.order_index ?? (count || 0);

  // Insert question
  const { data: question, error } = await supabase
    .from('quiz_questions')
    .insert([{
      quiz_id: data.quiz_id,
      question_text: data.question_text,
      question_type: data.question_type || 'multiple_choice',
      marks: data.marks,
      order_index: orderIndex,
      explanation: data.explanation
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add question: ${error.message}`);
  }

  // Insert options if provided
  if (data.options && data.options.length > 0) {
    const optionsWithQuestionId = data.options.map((opt, idx) => ({
      question_id: question.id,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      order_index: opt.order_index ?? idx
    }));

    const { error: optError } = await supabase
      .from('quiz_options')
      .insert(optionsWithQuestionId);

    if (optError) {
      throw new Error(`Failed to add options: ${optError.message}`);
    }
  }

  // Update quiz total marks
  await recalculateTotalMarks(data.quiz_id);

  return question;
};

/**
 * Update a question
 */
export const updateQuestion = async (
  questionId: string,
  updates: Partial<CreateQuestionInput>
): Promise<QuizQuestion> => {
  const { data: question, error } = await supabase
    .from('quiz_questions')
    .update({
      question_text: updates.question_text,
      question_type: updates.question_type,
      marks: updates.marks,
      explanation: updates.explanation
    })
    .eq('id', questionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update question: ${error.message}`);
  }

  // Update options if provided
  if (updates.options) {
    // Delete existing options
    await supabase
      .from('quiz_options')
      .delete()
      .eq('question_id', questionId);

    // Insert new options
    const optionsWithQuestionId = updates.options.map((opt, idx) => ({
      question_id: questionId,
      option_text: opt.option_text,
      is_correct: opt.is_correct,
      order_index: opt.order_index ?? idx
    }));

    await supabase
      .from('quiz_options')
      .insert(optionsWithQuestionId);
  }

  // Recalculate total marks
  if (updates.marks !== undefined) {
    const { data: q } = await supabase
      .from('quiz_questions')
      .select('quiz_id')
      .eq('id', questionId)
      .single();
    
    if (q) {
      await recalculateTotalMarks(q.quiz_id);
    }
  }

  return question;
};

/**
 * Delete a question
 */
export const deleteQuestion = async (questionId: string): Promise<void> => {
  // Get quiz_id first
  const { data: question } = await supabase
    .from('quiz_questions')
    .select('quiz_id')
    .eq('id', questionId)
    .single();

  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    throw new Error(`Failed to delete question: ${error.message}`);
  }

  // Recalculate total marks
  if (question) {
    await recalculateTotalMarks(question.quiz_id);
  }
};

/**
 * Recalculate and update total marks for a quiz
 */
export const recalculateTotalMarks = async (quizId: string): Promise<number> => {
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('marks')
    .eq('quiz_id', quizId);

  const totalMarks = (questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);

  await supabase
    .from('quizzes')
    .update({ 
      total_marks: totalMarks,
      updated_at: new Date().toISOString()
    })
    .eq('id', quizId);

  return totalMarks;
};

/**
 * Get quiz marks summary (for progress bar)
 */
export const getQuizMarksSummary = async (quizId: string): Promise<{
  total_marks: number;
  question_count: number;
  marks_breakdown: { question_id: string; marks: number }[];
}> => {
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, marks')
    .eq('quiz_id', quizId)
    .order('order_index');

  const totalMarks = (questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);

  return {
    total_marks: totalMarks,
    question_count: questions?.length || 0,
    marks_breakdown: (questions || []).map(q => ({
      question_id: q.id,
      marks: q.marks
    }))
  };
};

/**
 * Get quizzes for a lesson
 */
export const getLessonQuizzes = async (lessonId: string): Promise<Quiz[]> => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('lesson_id', lessonId);

  if (error) {
    throw new Error(`Failed to fetch quizzes: ${error.message}`);
  }

  return data || [];
};

/**
 * Update quiz settings
 */
export const updateQuiz = async (quizId: string, updates: Partial<CreateQuizInput>): Promise<Quiz> => {
  const { data, error } = await supabase
    .from('quizzes')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', quizId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update quiz: ${error.message}`);
  }

  return data;
};

/**
 * Delete a quiz
 */
export const deleteQuiz = async (quizId: string): Promise<void> => {
  const { error } = await supabase
    .from('quizzes')
    .delete()
    .eq('id', quizId);

  if (error) {
    throw new Error(`Failed to delete quiz: ${error.message}`);
  }
};
