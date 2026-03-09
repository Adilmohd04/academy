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

  // Get questions with options using raw SQL for complex aggregation
  const { data: questions, error: questionsError } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT q.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', o.id,
            'option_text', o.option_text,
            'is_correct', o.is_correct,
            'order_index', o.order_index
          ) ORDER BY o.order_index
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'
      ) as options
    FROM final_exam_questions q
    LEFT JOIN final_exam_options o ON q.id = o.question_id
    WHERE q.exam_id = '${exam.id}'
    GROUP BY q.id
    ORDER BY q.order_index`
  });

  if (questionsError) throw questionsError;

  return {
    ...exam,
    questions: questions || []
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
  // Get sum of marks
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT COALESCE(SUM(marks), 0) as total FROM final_exam_questions WHERE exam_id = '${examId}'`
  });

  if (error) throw error;
  const totalMarks = data?.[0]?.total || 0;

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
  const { data: result, error } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT 
      fe.total_marks,
      fe.passing_marks,
      COUNT(q.id) as question_count,
      json_agg(
        json_build_object(
          'id', q.id,
          'question_text', q.question_text,
          'marks', q.marks,
          'order_index', q.order_index
        ) ORDER BY q.order_index
      ) as questions
    FROM final_exams fe
    LEFT JOIN final_exam_questions q ON fe.id = q.exam_id
    WHERE fe.id = '${examId}'
    GROUP BY fe.id`
  });

  if (error) throw error;
  if (!result || result.length === 0) throw new Error('Exam not found');

  return result[0];
};

/**
 * Get all exam attempts for a course (teacher view)
 */
export const getExamAttempts = async (courseId: string) => {
  const { data: result, error } = await supabase.rpc('exec_sql', {
    sql_query: `SELECT fea.*, fe.title as exam_title, fe.total_marks as max_marks,
      p.full_name as student_name, p.email
    FROM final_exam_attempts fea
    JOIN final_exams fe ON fea.exam_id = fe.id
    LEFT JOIN profiles p ON fea.student_id = p.clerk_user_id
    WHERE fe.course_id = '${courseId}'
    ORDER BY fea.submitted_at DESC NULLS LAST`
  });

  if (error) throw error;
  return result || [];
};
