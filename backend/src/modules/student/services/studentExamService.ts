/**
 * Student Final Exam Service
 * 
 * Handles student interactions with final exams:
 * - Starting exam attempts
 * - Auto-saving answers
 * - Submitting exams
 * - Viewing results
 */

import { supabase } from '../../../config/database';

interface StartExamData {
  exam_id: string;
  student_id: string;
}

interface SaveAnswerData {
  submission_id: string;
  question_id: string;
  student_answer?: string;
  selected_option_id?: string;
  uploaded_file_url?: string;
}

/**
 * Get available exams for student
 */
export const getAvailableExams = async (
  enrollmentStudentId: string,
  submissionStudentId: string = enrollmentStudentId,
) => {
  try {
    // Get all courses student is enrolled in
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', enrollmentStudentId);

    if (enrollError) throw enrollError;

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    const courseIds = enrollments.map(e => e.course_id);

    // Get final exams for those courses
    const { data: exams, error: examsError } = await supabase
      .from('final_exams')
      .select(`
        id,
        course_id,
        title,
        description,
        total_marks,
        time_limit_minutes,
        instructions,
        available_from,
        available_until,
        max_attempts,
        is_published
      `)
      .in('course_id', courseIds)
      .eq('is_published', true);

    if (examsError) throw examsError;

    // Get submission status for each exam
    const examsWithStatus = await Promise.all(
      (exams || []).map(async (exam) => {
        const { data: submissions, error: subError } = await supabase
          .from('final_exam_submissions')
          .select('id, submission_status, attempt_number, total_score')
          .eq('exam_id', exam.id)
          .eq('student_id', submissionStudentId)
          .order('attempt_number', { ascending: false })
          .limit(1);

        if (subError) throw subError;

        const lastSubmission = submissions?.[0];
        const attemptsCount = await supabase
          .from('final_exam_submissions')
          .select('id')
          .eq('exam_id', exam.id)
          .eq('student_id', submissionStudentId);

        return {
          ...exam,
          attempts_used: attemptsCount.data?.length || 0,
          last_attempt_status: lastSubmission?.submission_status,
          last_score: lastSubmission?.total_score,
          can_attempt: (attemptsCount.data?.length || 0) < exam.max_attempts
        };
      })
    );

    return examsWithStatus;
  } catch (error) {
    console.error('Error fetching available exams:', error);
    throw error;
  }
};

/**
 * Get exam details for student (without answers)
 */
export const getExamForStudent = async (examId: string, studentId: string) => {
  try {
    // Check enrollment
    const { data: exam, error: examError } = await supabase
      .from('final_exams')
      .select(`
        id,
        course_id,
        title,
        description,
        total_marks,
        time_limit_minutes,
        exam_mode,
        instructions,
        available_from,
        available_until,
        max_attempts
      `)
      .eq('id', examId)
      .eq('is_published', true)
      .single();

    if (examError) throw examError;
    if (!exam) throw new Error('Exam not found or not published');

    // Verify enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', exam.course_id)
      .single();

    if (enrollError || !enrollment) {
      throw new Error('You are not enrolled in this course');
    }

    // Get questions (without correct answers)
    const { data: questions, error: questionsError } = await supabase
      .from('final_exam_questions')
      .select(`
        id,
        question_text,
        question_type,
        marks,
        order_index,
        file_type,
        max_file_size_mb,
        final_exam_options (
          id,
          option_text,
          order_index
        )
      `)
      .eq('exam_id', examId)
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
    console.error('Error fetching exam:', error);
    throw error;
  }
};

/**
 * Start exam attempt
 */
export const startExamAttempt = async (data: StartExamData) => {
  try {
    // Verify exam exists and student can attempt
    const { data: exam, error: examError } = await supabase
      .from('final_exams')
      .select('id, max_attempts')
      .eq('id', data.exam_id)
      .eq('is_published', true)
      .single();

    if (examError || !exam) {
      throw new Error('Exam not found');
    }

    // Check if student has ongoing attempt
    const { data: ongoingSubmission } = await supabase
      .from('final_exam_submissions')
      .select('id')
      .eq('exam_id', data.exam_id)
      .eq('student_id', data.student_id)
      .eq('submission_status', 'in_progress')
      .single();

    if (ongoingSubmission) {
      return {
        submission_id: ongoingSubmission.id,
        message: 'Resuming existing attempt'
      };
    }

    // Count completed attempts
    const { data: completedAttempts, error: countError } = await supabase
      .from('final_exam_submissions')
      .select('id', { count: 'exact' })
      .eq('exam_id', data.exam_id)
      .eq('student_id', data.student_id)
      .in('submission_status', ['submitted', 'graded']);

    if (exam.max_attempts > 0 && (completedAttempts?.length || 0) >= exam.max_attempts) {
      throw new Error(`Maximum attempts (${exam.max_attempts}) reached`);
    }

    // Create new submission
    const { data: submission, error: submitError } = await supabase
      .from('final_exam_submissions')
      .insert({
        exam_id: data.exam_id,
        student_id: data.student_id,
        submission_status: 'in_progress',
        attempt_number: (completedAttempts?.length || 0) + 1
      })
      .select()
      .single();

    if (submitError) throw submitError;

    return {
      submission_id: submission.id,
      message: 'Exam attempt started'
    };
  } catch (error) {
    console.error('Error starting exam attempt:', error);
    throw error;
  }
};

/**
 * Auto-save answer
 */
export const saveAnswer = async (data: SaveAnswerData) => {
  try {
    // Check if answer already exists
    const { data: existingAnswer } = await supabase
      .from('final_exam_answers')
      .select('id')
      .eq('submission_id', data.submission_id)
      .eq('question_id', data.question_id)
      .single();

    const answerData: any = {
      submission_id: data.submission_id,
      question_id: data.question_id
    };

    if (data.student_answer !== undefined) {
      answerData.student_answer = data.student_answer;
    }
    if (data.selected_option_id !== undefined) {
      answerData.selected_option_id = data.selected_option_id;
    }
    if (data.uploaded_file_url !== undefined) {
      answerData.uploaded_file_url = data.uploaded_file_url;
    }

    let result;
    if (existingAnswer) {
      const { data: updatedAnswer, error: updateError } = await supabase
        .from('final_exam_answers')
        .update(answerData)
        .eq('id', existingAnswer.id)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updatedAnswer;
    } else {
      const { data: newAnswer, error: insertError } = await supabase
        .from('final_exam_answers')
        .insert(answerData)
        .select()
        .single();

      if (insertError) throw insertError;
      result = newAnswer;
    }

    // Update auto-saved timestamp
    await supabase
      .from('final_exam_submissions')
      .update({ auto_saved_at: new Date().toISOString() })
      .eq('id', data.submission_id);

    return result;
  } catch (error) {
    console.error('Error saving answer:', error);
    throw error;
  }
};

/**
 * Submit exam
 */
export const submitExam = async (submissionId: string) => {
  try {
    // Get submission with questions for auto-grading
    const { data: submission, error: subError } = await supabase
      .from('final_exam_submissions')
      .select(`
        id,
        exam_id,
        student_id,
        submission_status
      `)
      .eq('id', submissionId)
      .single();

    if (subError || !submission) {
      throw new Error('Submission not found');
    }

    if (submission.submission_status !== 'in_progress') {
      throw new Error('This submission is already submitted');
    }

    // Get all exam questions
    const { data: questions, error: questionsError } = await supabase
      .from('final_exam_questions')
      .select('id, question_type, marks')
      .eq('exam_id', submission.exam_id);

    if (questionsError) throw questionsError;

    // Auto-grade multiple choice questions
    let totalScore = 0;
    const answersData = await supabase
      .from('final_exam_answers')
      .select('id, question_id, selected_option_id')
      .eq('submission_id', submissionId);

    if (answersData.data) {
      for (const answer of answersData.data) {
        const question = questions?.find(q => q.id === answer.question_id);

        if (question?.question_type === 'multiple_choice' && answer.selected_option_id) {
          // Check if selected option is correct
          const { data: selectedOption } = await supabase
            .from('final_exam_options')
            .select('is_correct')
            .eq('id', answer.selected_option_id)
            .single();

          if (selectedOption?.is_correct) {
            totalScore += question.marks || 1;

            // Update answer as correct
            await supabase
              .from('final_exam_answers')
              .update({
                is_correct: true,
                points_earned: question.marks || 1
              })
              .eq('id', answer.id);
          }
        }
      }
    }

    // Get passing marks and exam total marks
    const { data: exam } = await supabase
      .from('final_exams')
      .select('passing_marks, total_marks')
      .eq('id', submission.exam_id)
      .single();

    const passed = exam && totalScore >= (exam.passing_marks || 0);

    // Update submission
    const { data: result, error: updateError } = await supabase
      .from('final_exam_submissions')
      .update({
        submission_status: 'submitted',
        total_score: totalScore,
        passed: passed,
        submitted_at: new Date().toISOString()
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return {
      submission_id: result.id,
      total_score: totalScore,
      passing_marks: exam?.passing_marks || 0,
      passed: passed
    };
  } catch (error) {
    console.error('Error submitting exam:', error);
    throw error;
  }
};

/**
 * Get submission results for student
 */
export const getSubmissionResults = async (submissionId: string, studentId: string) => {
  try {
    // Verify ownership
    const { data: submission, error: subError } = await supabase
      .from('final_exam_submissions')
      .select(`
        id,
        exam_id,
        student_id,
        submission_status,
        total_score,
        passed,
        submitted_at
      `)
      .eq('id', submissionId)
      .eq('student_id', studentId)
      .single();

    if (subError || !submission) {
      throw new Error('Submission not found');
    }

    // Get exam details
    const { data: exam } = await supabase
      .from('final_exams')
      .select('title, total_marks, passing_marks, show_results_to_student')
      .eq('id', submission.exam_id)
      .single();

    if (!exam?.show_results_to_student && submission.submission_status !== 'graded') {
      throw new Error('Results are not available yet');
    }

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from('final_exam_answers')
      .select(`
        id,
        question_id,
        student_answer,
        selected_option_id,
        points_earned,
        is_correct,
        final_exam_questions (
          question_text,
          question_type,
          marks,
          explanation
        )
      `)
      .eq('submission_id', submissionId);

    if (answersError) throw answersError;

    return {
      submission: {
        ...submission,
        exam_title: exam?.title,
        total_marks: exam?.total_marks,
        passing_marks: exam?.passing_marks
      },
      answers: answers || []
    };
  } catch (error) {
    console.error('Error fetching results:', error);
    throw error;
  }
};

export default {
  getAvailableExams,
  getExamForStudent,
  startExamAttempt,
  saveAnswer,
  submitExam,
  getSubmissionResults
};
