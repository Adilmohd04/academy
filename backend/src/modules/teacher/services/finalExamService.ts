import { supabase } from '../../../config/database';

interface FinalExamQuestion {
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  marks: number;
  order_index: number;
  explanation?: string;
  options?: {
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

interface CreateFinalExamData {
  course_id: string;
  title?: string;
  description?: string;
  total_marks?: number;
  passing_marks?: number;
  time_limit_minutes?: number;
  instructions?: string;
  available_from?: string;
  available_until?: string;
}

/**
 * Create a new final exam for a course
 */
export const createFinalExam = async (data: CreateFinalExamData) => {
  // Use upsert with Supabase
  const { data: result, error } = await supabase
    .from('final_exams')
    .upsert({
      course_id: data.course_id,
      title: data.title || 'Final Examination',
      description: data.description,
      total_marks: data.total_marks || 100,
      passing_marks: data.passing_marks || 40,
      time_limit_minutes: data.time_limit_minutes || 120,
      instructions: data.instructions,
      available_from: data.available_from,
      available_until: data.available_until,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'course_id'
    })
    .select()
    .single();

  if (error) throw error;
  return result;
};

/**
 * Get final exam for a course
 */
export const getFinalExam = async (courseId: string) => {
  // Get the exam
  const { data: exam, error: examError } = await supabase
    .from('final_exams')
    .select('*')
    .eq('course_id', courseId)
    .maybeSingle();

  if (examError) throw examError;
  if (!exam) return null;

  // Get questions with options using Supabase ORM (parameterized, no SQL injection risk)
  const { data: questions, error: questionsError } = await supabase
    .from('final_exam_questions')
    .select('*, final_exam_options(*)')
    .eq('exam_id', exam.id)
    .order('order_index');

  if (questionsError) throw questionsError;

  // Transform nested relation into expected format
  const formattedQuestions = (questions || []).map((q: any) => ({
    ...q,
    options: (q.final_exam_options || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map(({ question_id, ...opt }: any) => opt),
  }));

  return {
    ...exam,
    questions: formattedQuestions
  };
};

/**
 * Add a question to the final exam
 */
export const addQuestion = async (
  examId: string,
  question: FinalExamQuestion
) => {
  try {
    // Insert question
    const { data: newQuestion, error: questionError } = await supabase
      .from('final_exam_questions')
      .insert({
        exam_id: examId,
        question_text: question.question_text,
        question_type: question.question_type,
        marks: question.marks,
        order_index: question.order_index,
        explanation: question.explanation
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // Insert options if provided
    if (question.options && question.options.length > 0) {
      const optionsToInsert = question.options.map(option => ({
        question_id: newQuestion.id,
        option_text: option.option_text,
        is_correct: option.is_correct,
        order_index: option.order_index
      }));

      const { error: optionsError } = await supabase
        .from('final_exam_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;
    }

    // Recalculate total marks
    await recalculateTotalMarks(examId);

    return newQuestion;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a question
 */
export const updateQuestion = async (
  questionId: string,
  updates: Partial<FinalExamQuestion>
) => {
  try {
    // Get exam_id first
    const { data: examData, error: examError } = await supabase
      .from('final_exam_questions')
      .select('exam_id')
      .eq('id', questionId)
      .single();

    if (examError || !examData) {
      throw new Error('Question not found');
    }

    const examId = examData.exam_id;

    // Build update object dynamically
    const updateObj: any = {};
    if (updates.question_text !== undefined) updateObj.question_text = updates.question_text;
    if (updates.question_type !== undefined) updateObj.question_type = updates.question_type;
    if (updates.marks !== undefined) updateObj.marks = updates.marks;
    if (updates.order_index !== undefined) updateObj.order_index = updates.order_index;
    if (updates.explanation !== undefined) updateObj.explanation = updates.explanation;

    if (Object.keys(updateObj).length > 0) {
      const { error: updateError } = await supabase
        .from('final_exam_questions')
        .update(updateObj)
        .eq('id', questionId);

      if (updateError) throw updateError;
    }

    // Update options if provided
    if (updates.options) {
      // Delete existing options
      const { error: deleteError } = await supabase
        .from('final_exam_options')
        .delete()
        .eq('question_id', questionId);

      if (deleteError) throw deleteError;

      // Insert new options
      if (updates.options.length > 0) {
        const optionsToInsert = updates.options.map(option => ({
          question_id: questionId,
          option_text: option.option_text,
          is_correct: option.is_correct,
          order_index: option.order_index
        }));

        const { error: insertError } = await supabase
          .from('final_exam_options')
          .insert(optionsToInsert);

        if (insertError) throw insertError;
      }
    }

    // Recalculate total marks
    await recalculateTotalMarks(examId);

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a question
 */
export const deleteQuestion = async (questionId: string) => {
  try {
    // Get exam_id first
    const { data: examData, error: examError } = await supabase
      .from('final_exam_questions')
      .select('exam_id')
      .eq('id', questionId)
      .single();

    if (examError || !examData) {
      throw new Error('Question not found');
    }

    const examId = examData.exam_id;

    // Delete the question (options will be cascaded if FK is set up)
    const { error: deleteError } = await supabase
      .from('final_exam_questions')
      .delete()
      .eq('id', questionId);

    if (deleteError) throw deleteError;

    // Recalculate total marks
    await recalculateTotalMarks(examId);

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Recalculate total marks for an exam
 */
const recalculateTotalMarks = async (examId: string) => {
  // Get sum of marks using Supabase ORM (parameterized)
  const { data, error } = await supabase
    .from('final_exam_questions')
    .select('marks')
    .eq('exam_id', examId);

  if (error) throw error;
  const totalMarks = (data || []).reduce((sum: number, q: any) => sum + (q.marks || 0), 0);

  // Update the exam
  const { error: updateError } = await supabase
    .from('final_exams')
    .update({ total_marks: totalMarks, updated_at: new Date().toISOString() })
    .eq('id', examId);

  if (updateError) throw updateError;
};

/**
 * Publish/unpublish final exam
 */
export const togglePublish = async (examId: string, isPublished: boolean) => {
  const { data: result, error } = await supabase
    .from('final_exams')
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq('id', examId)
    .select()
    .single();

  if (error) throw error;
  if (!result) throw new Error('Exam not found');

  return result;
};

/**
 * Get exam marks summary (like quiz marks summary)
 */
export const getExamMarksSummary = async (examId: string) => {
  // Get exam details (parameterized)
  const { data: exam, error: examError } = await supabase
    .from('final_exams')
    .select('total_marks, passing_marks')
    .eq('id', examId)
    .single();

  if (examError) throw examError;
  if (!exam) throw new Error('Exam not found');

  // Get questions (parameterized)
  const { data: questions, error: questionsError } = await supabase
    .from('final_exam_questions')
    .select('id, question_text, marks, order_index')
    .eq('exam_id', examId)
    .order('order_index');

  if (questionsError) throw questionsError;

  return {
    ...exam,
    question_count: (questions || []).length,
    questions: questions || []
  };
};

/**
 * Get all exam attempts for a course (teacher view)
 */
export const getExamAttempts = async (courseId: string) => {
  // First get the exam for this course (parameterized)
  const { data: exam, error: examError } = await supabase
    .from('final_exams')
    .select('id, title, total_marks')
    .eq('course_id', courseId)
    .maybeSingle();

  if (examError) throw examError;
  if (!exam) return [];

  // Get attempts with student profiles (parameterized)
  const { data: attempts, error: attemptsError } = await supabase
    .from('final_exam_attempts')
    .select('*, profiles!final_exam_attempts_student_id_fkey(full_name, email)')
    .eq('exam_id', exam.id)
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (attemptsError) throw attemptsError;

  return (attempts || []).map((attempt: any) => ({
    ...attempt,
    exam_title: exam.title,
    max_marks: exam.total_marks,
    student_name: attempt.profiles?.full_name,
    email: attempt.profiles?.email,
  }));
};
