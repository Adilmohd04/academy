import { supabase } from '../../../config/database';
import { v4 as uuidv4 } from 'uuid';

/**
 * Final Exam Management Service
 * Handles exam creation, question management, and exam lifecycle
 */

interface FinalExamQuestion {
  id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'text_response' | 'file_upload';
  marks?: number;
  order_index?: number;
  explanation?: string;
  file_type?: string;
  max_file_size_mb?: number;
  options?: {
    id?: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

interface CreateFinalExamDTO {
  course_id: string;
  title?: string;
  description?: string;
  total_marks?: number;
  passing_marks?: number;
  time_limit_minutes?: number;
  exam_mode?: 'timer' | 'no_timer' | 'proctored';
  instructions?: string;
  available_from?: string;
  available_until?: string;
  scheduled_publish_time?: string;
  max_attempts?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
}

/**
 * Create a new final exam for a course
 */
export const createFinalExam = async (data: CreateFinalExamDTO, teacherId: string) => {
  try {
    // Verify teacher owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', data.course_id)
      .eq('teacher_id', teacherId)
      .single();

    if (courseError || !course) {
      throw new Error('Course not found or unauthorized');
    }

    // Check if exam already exists for this course
    const { data: existingExam } = await supabase
      .from('final_exams')
      .select('id')
      .eq('course_id', data.course_id)
      .single();

    if (existingExam) {
      // Update existing exam
      const { data: updatedExam, error: updateError } = await supabase
        .from('final_exams')
        .update({
          title: data.title || 'Final Examination',
          description: data.description,
          total_marks: data.total_marks || 100,
          passing_marks: data.passing_marks || 40,
          time_limit_minutes: data.time_limit_minutes || 120,
          exam_mode: data.exam_mode || 'timer',
          instructions: data.instructions,
          available_from: data.available_from,
          available_until: data.available_until,
          scheduled_publish_time: data.scheduled_publish_time,
          max_attempts: data.max_attempts || 1,
          shuffle_questions: data.shuffle_questions || false,
          shuffle_options: data.shuffle_options || false,
          updated_at: new Date().toISOString()
        })
        .eq('course_id', data.course_id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedExam;
    }

    // Create new exam
    const { data: newExam, error: createError } = await supabase
      .from('final_exams')
      .insert({
        course_id: data.course_id,
        title: data.title || 'Final Examination',
        description: data.description,
        total_marks: data.total_marks || 100,
        passing_marks: data.passing_marks || 40,
        time_limit_minutes: data.time_limit_minutes || 120,
        exam_mode: data.exam_mode || 'timer',
        instructions: data.instructions,
        available_from: data.available_from,
        available_until: data.available_until,
        scheduled_publish_time: data.scheduled_publish_time,
        max_attempts: data.max_attempts || 1,
        shuffle_questions: data.shuffle_questions || false,
        shuffle_options: data.shuffle_options || false,
        created_by: teacherId
      })
      .select()
      .single();

    if (createError) throw createError;
    return newExam;
  } catch (error) {
    console.error('Error creating final exam:', error);
    throw error;
  }
};

/**
 * Get final exam for a course
 */
export const getFinalExamByCourseId = async (courseId: string) => {
  try {
    const { data: exam, error: examError } = await supabase
      .from('final_exams')
      .select('*')
      .eq('course_id', courseId)
      .single();

    if (examError && examError.code !== 'PGRST116') throw examError; // 116 = no rows
    if (!exam) return null;

    // Get questions with options
    const { data: questions, error: questionsError } = await supabase
      .from('final_exam_questions')
      .select(`
        id,
        question_text,
        question_type,
        marks,
        order_index,
        explanation,
        file_type,
        max_file_size_mb,
        max_duration_minutes,
        final_exam_options (
          id,
          option_text,
          is_correct,
          order_index
        )
      `)
      .eq('exam_id', exam.id)
      .order('order_index', { ascending: true });

    if (questionsError) throw questionsError;

    return {
      ...exam,
      questions: (questions || []).map(q => ({
        ...q,
        options: q.final_exam_options || []
      }))
    };
  } catch (error) {
    console.error('Error fetching final exam:', error);
    throw error;
  }
};

/**
 * Add question to final exam
 */
export const addExamQuestion = async (examId: string, question: FinalExamQuestion) => {
  try {
    // Insert question
    const { data: newQuestion, error: questionError } = await supabase
      .from('final_exam_questions')
      .insert({
        exam_id: examId,
        question_text: question.question_text,
        question_type: question.question_type,
        marks: question.marks || 1,
        order_index: question.order_index || 0,
        explanation: question.explanation,
        file_type: question.file_type,
        max_file_size_mb: question.max_file_size_mb || 5
      })
      .select()
      .single();

    if (questionError) throw questionError;

    // Insert options if provided
    if (question.options && question.options.length > 0) {
      const optionsToInsert = question.options.map(opt => ({
        question_id: newQuestion.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        order_index: opt.order_index
      }));

      const { error: optionsError } = await supabase
        .from('final_exam_options')
        .insert(optionsToInsert);

      if (optionsError) throw optionsError;

      // Fetch options to return
      const { data: options } = await supabase
        .from('final_exam_options')
        .select('*')
        .eq('question_id', newQuestion.id);

      return { ...newQuestion, options: options || [] };
    }

    return { ...newQuestion, options: [] };
  } catch (error) {
    console.error('Error adding exam question:', error);
    throw error;
  }
};

/**
 * Update exam question
 */
export const updateExamQuestion = async (questionId: string, updates: Partial<FinalExamQuestion>) => {
  try {
    const updateData: any = {};
    if (updates.question_text) updateData.question_text = updates.question_text;
    if (updates.question_type) updateData.question_type = updates.question_type;
    if (updates.marks !== undefined) updateData.marks = updates.marks;
    if (updates.order_index !== undefined) updateData.order_index = updates.order_index;
    if (updates.explanation !== undefined) updateData.explanation = updates.explanation;

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('final_exam_questions')
        .update(updateData)
        .eq('id', questionId);

      if (updateError) throw updateError;
    }

    // Update options if provided
    if (updates.options) {
      // Delete existing options
      await supabase
        .from('final_exam_options')
        .delete()
        .eq('question_id', questionId);

      // Insert new options
      if (updates.options.length > 0) {
        const optionsToInsert = updates.options.map(opt => ({
          question_id: questionId,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
          order_index: opt.order_index
        }));

        const { error: insertError } = await supabase
          .from('final_exam_options')
          .insert(optionsToInsert);

        if (insertError) throw insertError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating exam question:', error);
    throw error;
  }
};

/**
 * Delete exam question
 */
export const deleteExamQuestion = async (questionId: string) => {
  try {
    const { error } = await supabase
      .from('final_exam_questions')
      .delete()
      .eq('id', questionId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting exam question:', error);
    throw error;
  }
};

/**
 * Publish/unpublish final exam
 */
export const togglePublishExam = async (examId: string, isPublished: boolean) => {
  try {
    const { data: result, error } = await supabase
      .from('final_exams')
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString()
      })
      .eq('id', examId)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error toggling exam publish:', error);
    throw error;
  }
};

/**
 * Get exam submissions for a student
 */
export const getStudentExamSubmissions = async (examId: string, studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('final_exam_submissions')
      .select(`
        id,
        submission_status,
        total_score,
        passed,
        attempt_number,
        started_at,
        submitted_at,
        time_spent_minutes
      `)
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching exam submissions:', error);
    throw error;
  }
};

/**
 * Get all submissions for an exam (teacher view)
 */
export const getExamSubmissions = async (examId: string) => {
  try {
    const { data, error } = await supabase
      .from('final_exam_submissions')
      .select(`
        id,
        student_id,
        submission_status,
        total_score,
        passed,
        attempt_number,
        started_at,
        submitted_at,
        time_spent_minutes
      `)
      .eq('exam_id', examId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching exam submissions:', error);
    throw error;
  }
};

export default {
  createFinalExam,
  getFinalExamByCourseId,
  addExamQuestion,
  updateExamQuestion,
  deleteExamQuestion,
  togglePublishExam,
  getStudentExamSubmissions,
  getExamSubmissions
};
