import { supabase } from '../../../config/database';

export interface LessonActivity {
  id: string;
  lesson_id: string;
  title: string;
  type: 'quiz' | 'assignment' | 'audio_task';
  description?: string;
  total_marks: number;
  deadline?: string;
  is_graded: boolean;
  created_at: string;
}

export interface CreateActivityInput {
  lesson_id: string;
  title: string;
  type: 'quiz' | 'assignment' | 'audio_task';
  description?: string;
  total_marks: number;
  deadline?: string;
  is_graded?: boolean;
}

export interface ActivityQuestion {
  id: string;
  activity_id: string;
  question_text?: string;
  question_image_url?: string;
  question_audio_url?: string;
  type: 'text' | 'image' | 'audio' | 'multiple_choice';
  correct_answer?: string;
  options?: string[];
  marks: number;
  order_index: number;
  created_at: string;
}

export interface CreateQuestionInput {
  activity_id: string;
  question_text?: string;
  question_image_url?: string;
  question_audio_url?: string;
  type: 'text' | 'image' | 'audio' | 'multiple_choice';
  correct_answer?: string;
  options?: string[];
  marks: number;
  order_index: number;
}

export interface StudentAnswer {
  id: string;
  question_id: string;
  student_id: string;
  answer: string;
  is_correct?: boolean;
  marks_obtained: number;
  submitted_at: string;
}

export interface SubmitQuizInput {
  question_id: string;
  student_id: string;
  answer: string;
}

export interface ActivitySubmission {
  id: string;
  activity_id: string;
  student_id: string;
  submission_url?: string;
  submission_text?: string;
  submitted_at: string;
  marks_obtained?: number;
  teacher_feedback?: string;
  graded_at?: string;
}

export interface SubmitAssignmentInput {
  activity_id: string;
  student_id: string;
  submission_url?: string;
  submission_text?: string;
}

export interface GradeAssignmentInput {
  submission_id: string;
  marks_obtained: number;
  teacher_feedback?: string;
}

/**
 * Create activity (quiz or assignment)
 */
export const createActivity = async (data: CreateActivityInput): Promise<LessonActivity> => {
  const { data: activity, error } = await supabase
    .from('lesson_activities')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create activity: ${error.message}`);
  return activity;
};

/**
 * Get activities for a lesson
 */
export const getLessonActivities = async (lessonId: string): Promise<LessonActivity[]> => {
  const { data, error } = await supabase
    .from('lesson_activities')
    .select('*')
    .eq('lesson_id', lessonId);

  if (error) throw new Error(`Failed to fetch activities: ${error.message}`);
  return data || [];
};

/**
 * Create question for quiz
 */
export const createQuestion = async (data: CreateQuestionInput): Promise<ActivityQuestion> => {
  const { data: question, error } = await supabase
    .from('activity_questions')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to create question: ${error.message}`);
  return question;
};

/**
 * Get questions for activity
 */
export const getActivityQuestions = async (activityId: string): Promise<ActivityQuestion[]> => {
  const { data, error } = await supabase
    .from('activity_questions')
    .select('*')
    .eq('activity_id', activityId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(`Failed to fetch questions: ${error.message}`);
  return data || [];
};

/**
 * Submit quiz answer (auto-grade)
 */
export const submitQuizAnswer = async (input: SubmitQuizInput): Promise<StudentAnswer> => {
  // Get question to check correct answer
  const { data: question } = await supabase
    .from('activity_questions')
    .select('*')
    .eq('id', input.question_id)
    .single();

  if (!question) throw new Error('Question not found');

  const isCorrect = question.correct_answer?.toLowerCase() === input.answer.toLowerCase();
  const marksObtained = isCorrect ? question.marks : 0;

  const { data: answer, error } = await supabase
    .from('student_answers')
    .upsert([
      {
        question_id: input.question_id,
        student_id: input.student_id,
        answer: input.answer,
        is_correct: isCorrect,
        marks_obtained: marksObtained,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to submit answer: ${error.message}`);
  return answer;
};

/**
 * Get student's quiz results
 */
export const getStudentQuizResults = async (activityId: string, studentId: string): Promise<any> => {
  const { data: questions, error: questionsError } = await supabase
    .from('activity_questions')
    .select('*')
    .eq('activity_id', activityId);

  if (questionsError) throw new Error(`Failed to fetch questions: ${questionsError.message}`);

  const questionIds = questions?.map((q) => q.id) || [];

  const { data: answers, error: answersError } = await supabase
    .from('student_answers')
    .select('*')
    .in('question_id', questionIds)
    .eq('student_id', studentId);

  if (answersError) throw new Error(`Failed to fetch answers: ${answersError.message}`);

  const totalMarks = questions?.reduce((sum, q) => sum + q.marks, 0) || 0;
  const obtainedMarks = answers?.reduce((sum, a) => sum + a.marks_obtained, 0) || 0;

  return {
    questions,
    answers,
    totalMarks,
    obtainedMarks,
    percentage: totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0,
  };
};

/**
 * Submit assignment (file upload)
 */
export const submitAssignment = async (data: SubmitAssignmentInput): Promise<ActivitySubmission> => {
  const { data: submission, error } = await supabase
    .from('activity_submissions')
    .upsert([data])
    .select()
    .single();

  if (error) throw new Error(`Failed to submit assignment: ${error.message}`);
  return submission;
};

/**
 * Get assignment submissions for an activity (Teacher view)
 */
export const getActivitySubmissions = async (activityId: string): Promise<ActivitySubmission[]> => {
  const { data, error } = await supabase
    .from('activity_submissions')
    .select('*')
    .eq('activity_id', activityId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch submissions: ${error.message}`);
  return data || [];
};

/**
 * Grade assignment (Teacher)
 */
export const gradeAssignment = async (input: GradeAssignmentInput): Promise<ActivitySubmission> => {
  const { data, error } = await supabase
    .from('activity_submissions')
    .update({
      marks_obtained: input.marks_obtained,
      teacher_feedback: input.teacher_feedback,
      graded_at: new Date().toISOString(),
    })
    .eq('id', input.submission_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to grade assignment: ${error.message}`);
  return data;
};

/**
 * Get student's submission for an activity
 */
export const getStudentSubmission = async (
  activityId: string,
  studentId: string
): Promise<ActivitySubmission | null> => {
  const { data, error } = await supabase
    .from('activity_submissions')
    .select('*')
    .eq('activity_id', activityId)
    .eq('student_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch submission: ${error.message}`);
  }

  return data || null;
};
