import { Request, Response } from 'express';
import { supabase } from '../../../config/database';
import * as courseNotifications from '../../../services/courseNotificationService';

/**
 * Teacher Quiz Management Controller
 * Handles CRUD operations for quizzes and questions
 */

// Helper function to extract teacher_id from Supabase courses join
const getCourseTeacherId = (courses: any): string | null => {
  if (!courses) return null;
  // Supabase returns courses as array even with inner join and single()
  if (Array.isArray(courses)) {
    return courses[0]?.teacher_id || null;
  }
  return courses.teacher_id || null;
};

// Helper function to check if teacher has access to course (main teacher or co-teacher)
const checkTeacherCourseAccess = async (courseId: string, profileId: string, clerkUserId: string): Promise<boolean> => {
  // Check if main teacher (course.teacher_id is clerk_user_id)
  const { data: course } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', courseId)
    .eq('teacher_id', clerkUserId)
    .single();

  if (course) return true;

  // Check if co-teacher (course_teachers.teacher_id is profile UUID)
  const { data: coTeacher } = await supabase
    .from('course_teachers')
    .select('id')
    .eq('course_id', courseId)
    .eq('teacher_id', profileId)
    .single();

  return !!coTeacher;
};

// Create a new quiz for a course
export const createQuiz = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, description, time_limit_minutes, week_id, is_published, questions } = req.body;
    const userId = req.auth?.userId;

    if (!title) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify teacher has access to the course (main teacher or co-teacher)
    const hasAccess = await checkTeacherCourseAccess(courseId, profile.id, profile.clerk_user_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course' });
    }

    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        course_id: courseId,
        week_id: week_id || null,
        title,
        description,
        time_limit_minutes,
        is_published: is_published || false,
        created_by: profile.id
      })
      .select()
      .single();

    if (quizError) {
      console.error('Error creating quiz:', quizError);
      return res.status(500).json({ error: 'Failed to create quiz' });
    }

    // Add questions if provided
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        quiz_id: quiz.id,
        question_text: q.question,
        question_ar: q.question_ar || null,
        question_ta: q.question_ta || null,
        question_type: q.type,
        options: q.options || null,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        display_order: index + 1
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error creating questions:', questionsError);
        // Delete the quiz if questions fail
        await supabase.from('quizzes').delete().eq('id', quiz.id);
        return res.status(500).json({ error: 'Failed to create quiz questions' });
      }
    }

    // Add quiz to week content list if week_id is provided
    if (week_id) {
      // Get max order for this week
      const { data: existingContent } = await supabase
        .from('course_content')
        .select('order_index')
        .eq('week_id', week_id)
        .order('order_index', { ascending: false })
        .limit(1);

      const maxOrder = existingContent && existingContent.length > 0 
        ? existingContent[0].order_index 
        : 0;

      const { error: contentError } = await supabase
        .from('course_content')
        .insert({
          week_id: week_id,
          type: 'quiz',
          title: title,
          content_url: quiz.id, // Store quiz ID in content_url for reference
          order_index: maxOrder + 1,
          is_required: true
        });

      if (contentError) {
        console.error('Error adding quiz to week content:', contentError);
        // Don't fail the whole request, quiz is already created
      }
    }

    if (quiz.is_published) {
      try {
        const { data: course } = await supabase
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        const { data: week } = week_id
          ? await supabase.from('course_weeks').select('title').eq('id', week_id).single()
          : { data: null };

        await courseNotifications.notifyQuizPublished(
          courseId,
          course?.title || 'Course',
          title,
          week?.title || null,
          quiz.id
        );
      } catch (notifError) {
        console.error('⚠️ Failed to send quiz notification:', notifError);
      }
    }

    res.status(201).json({ 
      message: 'Quiz created successfully',
      quiz 
    });
  } catch (error: any) {
    console.error('Error in createQuiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing quiz
export const updateQuiz = async (req: any, res: Response) => {
  try {
    const { courseId, quizId } = req.params;
    const { title, description, time_limit_minutes, week_id, is_published, questions } = req.body;
    const userId = req.auth?.userId;

    if (!title) {
      return res.status(400).json({ error: 'Quiz title is required' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Teacher profile not found' });
    }

    // Verify teacher has access to the course (main teacher or co-teacher)
    const hasAccess = await checkTeacherCourseAccess(courseId, profile.id, profile.clerk_user_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this course' });
    }

    // Verify quiz exists
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .eq('course_id', courseId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Update quiz
    const { data: updatedQuiz, error: updateError } = await supabase
      .from('quizzes')
      .update({
        title,
        description,
        time_limit_minutes,
        week_id: week_id || null,
        is_published: is_published || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating quiz:', updateError);
      return res.status(500).json({ error: 'Failed to update quiz' });
    }

    if (is_published) {
      try {
        const { data: course } = await supabase
          .from('courses')
          .select('title')
          .eq('id', courseId)
          .single();

        const { data: week } = week_id
          ? await supabase.from('course_weeks').select('title').eq('id', week_id).single()
          : { data: null };

        await courseNotifications.notifyQuizPublished(
          courseId,
          course?.title || 'Course',
          title,
          week?.title || null,
          quizId
        );
      } catch (notifError) {
        console.error('⚠️ Failed to send quiz update notification:', notifError);
      }
    }

    // Update questions if provided
    if (questions && questions.length > 0) {
      // Delete existing questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      // Insert new questions
      const questionsToInsert = questions.map((q: any, index: number) => ({
        quiz_id: quizId,
        question_text: q.question,
        question_ar: q.question_ar || null,
        question_ta: q.question_ta || null,
        question_type: q.type,
        options: q.options || null,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        display_order: index + 1
      }));

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        console.error('Error updating questions:', questionsError);
        return res.status(500).json({ error: 'Failed to update quiz questions' });
      }
    }

    res.json({ 
      message: 'Quiz updated successfully',
      quiz: updatedQuiz 
    });
  } catch (error: any) {
    console.error('Error in updateQuiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all quizzes for a course
export const getCourseQuizzes = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify teacher owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get quizzes with question count
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select(`
        id,
        title,
        description,
        passing_score,
        time_limit_minutes,
        max_attempts,
        is_published,
        display_order,
        created_at,
        updated_at
      `)
      .eq('course_id', courseId)
      .order('display_order', { ascending: true });

    if (quizzesError) {
      console.error('Error fetching quizzes:', quizzesError);
      return res.status(500).json({ error: 'Failed to fetch quizzes' });
    }

    // Get question counts for each quiz
    const quizzesWithCounts = await Promise.all(
      (quizzes || []).map(async (quiz) => {
        const { count } = await supabase
          .from('quiz_questions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id);

        return {
          ...quiz,
          question_count: count || 0
        };
      })
    );

    res.json({ quizzes: quizzesWithCounts });
  } catch (error: any) {
    console.error('Error in getCourseQuizzes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single quiz with all questions
export const getQuizDetails = async (req: any, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get quiz with course details
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        *,
        courses!inner (
          id,
          teacher_id
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Verify teacher owns the course
    if (quiz.courses.teacher_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all questions for the quiz
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('display_order', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    res.json({ 
      quiz: {
        ...quiz,
        courses: undefined // Remove nested courses object
      },
      questions: questions || []
    });
  } catch (error: any) {
    console.error('Error in getQuizDetails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Note: updateQuiz function is defined above (line 113) with full question update support

// Delete a quiz
export const deleteQuiz = async (req: any, res: Response) => {
  try {
    const { quizId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify teacher owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner (
          teacher_id
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const courseTeacherId = getCourseTeacherId(quiz.courses);
    if (courseTeacherId !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete quiz (cascade will delete questions and attempts)
    const { error: deleteError } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (deleteError) {
      console.error('Error deleting quiz:', deleteError);
      return res.status(500).json({ error: 'Failed to delete quiz' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteQuiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a question to a quiz
export const addQuestion = async (req: any, res: Response) => {
  try {
    const { quizId } = req.params;
    const { question_text, question_type, options, correct_answer, explanation, points } = req.body;
    const userId = req.auth?.userId;

    if (!question_text || !question_type || !correct_answer) {
      return res.status(400).json({ error: 'Question text, type, and correct answer are required' });
    }

    if (!['mcq', 'true_false', 'short_answer'].includes(question_type)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify teacher owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner (
          teacher_id
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const courseTeacherId = getCourseTeacherId(quiz.courses);
    if (courseTeacherId !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the highest display_order for this quiz
    const { data: lastQuestion } = await supabase
      .from('quiz_questions')
      .select('display_order')
      .eq('quiz_id', quizId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = lastQuestion ? (lastQuestion.display_order || 0) + 1 : 0;

    // Add question
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quizId,
        question_text,
        question_type,
        options: options || null,
        correct_answer,
        explanation,
        points: points || 1,
        display_order: nextOrder
      })
      .select()
      .single();

    if (questionError) {
      console.error('Error adding question:', questionError);
      return res.status(500).json({ error: 'Failed to add question' });
    }

    res.status(201).json({ 
      message: 'Question added successfully',
      question 
    });
  } catch (error: any) {
    console.error('Error in addQuestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a question
export const updateQuestion = async (req: any, res: Response) => {
  try {
    const { quizId, questionId } = req.params;
    const { question_text, question_type, options, correct_answer, explanation, points } = req.body;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify teacher owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner (
          teacher_id
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const courseTeacherId = getCourseTeacherId(quiz.courses);
    if (courseTeacherId !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update question
    const updateData: any = {};
    if (question_text !== undefined) updateData.question_text = question_text;
    if (question_type !== undefined) updateData.question_type = question_type;
    if (options !== undefined) updateData.options = options;
    if (correct_answer !== undefined) updateData.correct_answer = correct_answer;
    if (explanation !== undefined) updateData.explanation = explanation;
    if (points !== undefined) updateData.points = points;

    const { error: updateError } = await supabase
      .from('quiz_questions')
      .update(updateData)
      .eq('id', questionId)
      .eq('quiz_id', quizId);

    if (updateError) {
      console.error('Error updating question:', updateError);
      return res.status(500).json({ error: 'Failed to update question' });
    }

    res.json({ message: 'Question updated successfully' });
  } catch (error: any) {
    console.error('Error in updateQuestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a question
export const deleteQuestion = async (req: any, res: Response) => {
  try {
    const { quizId, questionId } = req.params;
    const userId = req.auth?.userId;

    // Get teacher profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify teacher owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id,
        courses!inner (
          teacher_id
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const courseTeacherId = getCourseTeacherId(quiz.courses);
    if (courseTeacherId !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete question
    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)
      .eq('quiz_id', quizId);

    if (deleteError) {
      console.error('Error deleting question:', deleteError);
      return res.status(500).json({ error: 'Failed to delete question' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteQuestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
