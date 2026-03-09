/**
 * Student Lesson Controller
 * Handle lesson-specific operations (quiz, assignments, etc.)
 */

import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

/**
 * Get quiz for a specific lesson
 * GET /api/student/lessons/:lessonId/quiz
 */
export const getLessonQuiz = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const userId = req.auth?.userId;

    // Get lesson with quiz questions
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select(`
        id,
        title,
        description,
        content_type,
        quiz_questions,
        deadline,
        release_date,
        time_limit_minutes,
        max_attempts,
        show_correct_answers,
        week_id,
        course_weeks!inner (
          course_id
        )
      `)
      .eq('id', lessonId)
      .eq('content_type', 'quiz')
      .single();

    if (lessonError || !lesson) {
      console.error('Error fetching lesson:', lessonError);
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Verify student is enrolled in the course
    // NOTE: student_id stores clerk_user_id (TEXT), NOT profiles.id (UUID)
    const courseId = (lesson.course_weeks as any).course_id;
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Check if quiz is released
    if (lesson.release_date && new Date(lesson.release_date) > new Date()) {
      return res.status(403).json({ 
        error: 'Quiz not yet available',
        release_date: lesson.release_date 
      });
    }

    // Get student's previous submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('quiz_submissions')
      .select('id, submitted_at, score, answers')
      .eq('lesson_id', lessonId)
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false });

    const attemptsUsed = submissions?.length || 0;
    const canSubmit = !lesson.max_attempts || attemptsUsed < lesson.max_attempts;

    // Check if deadline has passed
    const deadlinePassed = lesson.deadline && new Date(lesson.deadline) < new Date();

    res.json({
      quiz: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        questions: lesson.quiz_questions || [],
        deadline: lesson.deadline,
        deadline_passed: deadlinePassed,
        time_limit_minutes: lesson.time_limit_minutes,
        max_attempts: lesson.max_attempts,
        show_correct_answers: lesson.show_correct_answers,
        show_answers_after_deadline: !lesson.deadline || deadlinePassed // Show answers immediately if no deadline
      },
      attempts_used: attemptsUsed,
      can_submit: canSubmit && !deadlinePassed,
      deadline_passed: deadlinePassed,
      last_submission: submissions && submissions.length > 0 ? submissions[0] : null
    });
  } catch (error: any) {
    console.error('Error in getLessonQuiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit quiz answers for a lesson
 * POST /api/student/lessons/:lessonId/quiz/submit
 */
export const submitLessonQuiz = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const userId = req.auth?.userId;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Get lesson with quiz questions
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select(`
        id,
        title,
        quiz_questions,
        deadline,
        max_attempts,
        show_correct_answers,
        week_id,
        course_weeks!inner (
          course_id
        )
      `)
      .eq('id', lessonId)
      .eq('content_type', 'quiz')
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check deadline
    if (lesson.deadline && new Date(lesson.deadline) < new Date()) {
      return res.status(403).json({ error: 'Quiz deadline has passed' });
    }

    // Verify student is enrolled
    // NOTE: student_id stores clerk_user_id (TEXT), NOT profiles.id (UUID)
    const courseId = (lesson.course_weeks as any).course_id;
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Check attempt limit
    const { data: submissions, error: submissionsError } = await supabase
      .from('quiz_submissions')
      .select('id')
      .eq('lesson_id', lessonId)
      .eq('student_id', userId);

    if (!submissionsError && submissions && lesson.max_attempts && submissions.length >= lesson.max_attempts) {
      return res.status(403).json({ error: 'Maximum attempts reached' });
    }

    // Calculate score
    const questions = lesson.quiz_questions || [];
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((question: any, index: number) => {
      const points = question.marks || 1;
      totalPoints += points;

      const studentAnswer = answers[index];
      // Support both camelCase and snake_case field names
      const correctAnswer = question.correctAnswer ?? question.correct_answer;
      const questionType = question.type || 'mcq';

      // Handle MCQ / multiple-choice
      if (questionType === 'multiple-choice' || questionType === 'mcq') {
        // Determine if correct_answer is a string (option text) or number (option index)
        if (typeof correctAnswer === 'string' && question.options) {
          // String-based correct answer - find index in options
          const correctIndex = question.options.indexOf(correctAnswer);
          if (studentAnswer === correctIndex) {
            earnedPoints += points;
          }
        } else if (Array.isArray(correctAnswer)) {
          // Multiple correct answers (indices or strings)
          let correctIndices: number[];
          if (typeof correctAnswer[0] === 'string' && question.options) {
            correctIndices = correctAnswer.map((a: string) => question.options.indexOf(a)).filter((i: number) => i !== -1);
          } else {
            correctIndices = correctAnswer;
          }
          const studentSet = new Set(Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]);
          const correctSet = new Set(correctIndices);
          if (studentSet.size === correctSet.size && [...studentSet].every(a => correctSet.has(a))) {
            earnedPoints += points;
          }
        } else {
          // Single correct answer as number index
          if (studentAnswer === correctAnswer) {
            earnedPoints += points;
          }
        }
      } else if (questionType === 'fill-blank' || questionType === 'fill_in_the_blank' || questionType === 'fill-in-blank') {
        // Fill-in-the-blank: case-insensitive string comparison
        const studentText = (String(studentAnswer || '')).trim().toLowerCase();
        const correctText = (String(correctAnswer || '')).trim().toLowerCase();
        if (studentText === correctText) {
          earnedPoints += points;
        }
      }
    });

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Save submission (percentage is a generated column, do not insert it)
    const { data: submission, error: saveError } = await supabase
      .from('quiz_submissions')
      .insert({
        lesson_id: lessonId,
        student_id: userId,
        course_id: courseId,
        answers: answers,
        score: earnedPoints,
        total_points: totalPoints,
        max_score: totalPoints,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving submission:', saveError);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    // Determine if answers should be revealed now
    const hasDeadline = !!lesson.deadline;
    const deadlinePassed = hasDeadline && new Date(lesson.deadline) < new Date();
    const showAnswers = !hasDeadline || deadlinePassed; // Show answers if no deadline or deadline passed

    res.json({
      success: true,
      submission: {
        id: submission.id,
        score: earnedPoints,
        total_points: totalPoints,
        percentage: percentage,
        submitted_at: submission.submitted_at
      },
      show_answers: showAnswers,
      has_deadline: hasDeadline,
      deadline: lesson.deadline,
      deadline_passed: deadlinePassed,
      message: showAnswers 
        ? 'Quiz submitted successfully! Your answers have been scored.' 
        : 'Quiz submitted successfully! Answers will be revealed after the deadline.'
    });
  } catch (error: any) {
    console.error('Error in submitLessonQuiz:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Submit assignment for a lesson
 * POST /api/student/lessons/:lessonId/assignment/submit
 */
export const submitLessonAssignment = async (req: any, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { submission_type, file_url, link_url, text_content } = req.body;
    const userId = req.auth?.userId;

    // Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select(`
        id,
        title,
        deadline,
        week_id,
        course_weeks!inner (
          course_id
        )
      `)
      .eq('id', lessonId)
      .eq('content_type', 'assignment')
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check deadline
    if (lesson.deadline && new Date(lesson.deadline) < new Date()) {
      return res.status(403).json({ error: 'Assignment deadline has passed' });
    }

    // Verify enrollment
    // NOTE: student_id stores clerk_user_id (TEXT), NOT profiles.id (UUID)
    const courseId = (lesson.course_weeks as any).course_id;
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Save submission
    const { data: submission, error: saveError } = await supabase
      .from('assignment_submissions')
      .insert({
        lesson_id: lessonId,
        student_id: userId,
        submission_type: submission_type || 'file',
        file_url: file_url,
        link_url: link_url,
        text_content: text_content,
        submitted_at: new Date().toISOString(),
        status: 'submitted'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving assignment submission:', saveError);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    res.json({
      success: true,
      submission: {
        id: submission.id,
        submitted_at: submission.submitted_at,
        status: submission.status
      },
      message: 'Assignment submitted successfully'
    });
  } catch (error: any) {
    console.error('Error in submitLessonAssignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get student grades for a course (week-wise breakdown)
 * GET /api/student/courses/:courseId/grades
 */
export const getCourseGrades = async (req: any, res: Response) => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId;

    // Verify enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // Get course grading weights and passing percentage
    const { data: courseData } = await supabase
      .from('courses')
      .select('grading_weights, passing_percentage')
      .eq('id', courseId)
      .single();

    const weights = courseData?.grading_weights || {};
    const quizWeight = (weights.quiz_percentage || 30) / 100;
    const assignmentWeight = (weights.assignment_percentage || 40) / 100;
    const finalExamWeight = (weights.final_exam_percentage || 30) / 100;
    const passingPercentage = courseData?.passing_percentage || 70;

    // Get all weeks with quiz and assignment lessons
    const { data: weeks, error: weeksError } = await supabase
      .from('course_weeks')
      .select(`
        id,
        week_number,
        title,
        course_lessons (
          id,
          title,
          content_type,
          deadline
        )
      `)
      .eq('course_id', courseId)
      .order('week_number', { ascending: true });

    if (weeksError) throw weeksError;

    // Get all quiz submissions for this student in this course
    const lessonIds = (weeks || []).flatMap((w: any) => 
      (w.course_lessons || []).map((l: any) => l.id)
    );

    let quizSubmissions: any[] = [];
    let assignmentSubmissions: any[] = [];

    if (lessonIds.length > 0) {
      const { data: qSubs } = await supabase
        .from('quiz_submissions')
        .select('lesson_id, score, total_points, submitted_at')
        .eq('student_id', userId)
        .in('lesson_id', lessonIds)
        .order('submitted_at', { ascending: false });

      quizSubmissions = qSubs || [];

      const { data: aSubs } = await supabase
        .from('assignment_submissions')
        .select('lesson_id, grade, max_grade, status, submitted_at, feedback, graded_at')
        .eq('student_id', userId)
        .in('lesson_id', lessonIds)
        .order('submitted_at', { ascending: false });

      assignmentSubmissions = aSubs || [];
    }

    // Build week-wise grades
    // Track percentages for ALL quiz/assignment lessons (including not-taken ones as 0%)
    const allQuizPercentages: number[] = [];
    const allAssignmentPercentages: number[] = [];
    let quizCount = 0;       // how many quizzes were actually submitted
    let assignmentCount = 0; // how many assignments were actually graded

    const weekGrades = (weeks || []).map((week: any) => {
      const lessons = week.course_lessons || [];
      const quizLessons = lessons.filter((l: any) => l.content_type === 'quiz');
      const assignmentLessons = lessons.filter((l: any) => l.content_type === 'assignment');

      const quizGrades = quizLessons.map((lesson: any) => {
        // Get best/latest submission
        const subs = quizSubmissions.filter((s: any) => s.lesson_id === lesson.id);
        const best = subs.length > 0 ? subs[0] : null;
        if (best && Number(best.total_points) > 0) {
          const pct = (Number(best.score) / Number(best.total_points)) * 100;
          allQuizPercentages.push(pct);
          quizCount++;
        } else {
          // Quiz exists but student hasn't taken it → counts as 0%
          allQuizPercentages.push(0);
        }
        return {
          lesson_id: lesson.id,
          title: lesson.title,
          deadline: lesson.deadline,
          score: best ? Number(best.score) : null,
          total_points: best ? Number(best.total_points) : null,
          percentage: best && best.total_points > 0 
            ? Math.round((Number(best.score) / Number(best.total_points)) * 100) 
            : null,
          submitted_at: best?.submitted_at || null,
          attempts: subs.length
        };
      });

      const assignmentGrades = assignmentLessons.map((lesson: any) => {
        const subs = assignmentSubmissions.filter((s: any) => s.lesson_id === lesson.id);
        const latest = subs.length > 0 ? subs[0] : null;
        if (latest && latest.grade != null) {
          const maxG = Number(latest.max_grade) || 100;
          const pct = (Number(latest.grade) / maxG) * 100;
          allAssignmentPercentages.push(pct);
          assignmentCount++;
        } else {
          // Assignment exists but not graded yet → counts as 0%
          allAssignmentPercentages.push(0);
        }
        return {
          lesson_id: lesson.id,
          title: lesson.title,
          deadline: lesson.deadline,
          score: latest?.grade != null ? Number(latest.grade) : null,
          total_points: latest?.max_grade != null ? Number(latest.max_grade) : null,
          status: latest?.status || 'not_submitted',
          submitted_at: latest?.submitted_at || null,
          feedback: latest?.feedback || null,
          grade: latest?.grade != null ? Number(latest.grade) : null,
          graded_at: latest?.graded_at || null
        };
      });

      return {
        week_number: week.week_number,
        title: week.title,
        quizzes: quizGrades,
        assignments: assignmentGrades
      };
    });

    // Calculate averages across ALL lessons (not just submitted ones)
    // e.g. 2 quizzes, student took 1 at 100% → average = (100+0)/2 = 50%, not 100%
    const quizAverage = allQuizPercentages.length > 0
      ? Math.round(allQuizPercentages.reduce((a, b) => a + b, 0) / allQuizPercentages.length)
      : null;
    const assignmentAverage = allAssignmentPercentages.length > 0
      ? Math.round(allAssignmentPercentages.reduce((a, b) => a + b, 0) / allAssignmentPercentages.length)
      : null;

    // Overall grade using weights from DB
    const quizComponent = quizAverage !== null ? quizAverage * quizWeight : 0;
    const assignmentComponent = assignmentAverage !== null ? assignmentAverage * assignmentWeight : 0;
    const finalExamComponent = 0; // Not yet implemented
    const overallGrade = quizComponent + assignmentComponent + finalExamComponent;

    res.json({
      success: true,
      grades: {
        overall: Math.round(overallGrade),
        quiz_average: quizAverage,
        assignment_average: assignmentAverage,
        final_exam: null,
        quiz_count: quizCount,
        total_quizzes: allQuizPercentages.length,
        assignment_count: assignmentCount,
        total_assignments: allAssignmentPercentages.length,
        certificate_eligible: overallGrade >= passingPercentage,
        passing_percentage: passingPercentage,
        grading_weights: {
          quiz_percentage: Math.round(quizWeight * 100),
          assignment_percentage: Math.round(assignmentWeight * 100),
          final_exam_percentage: Math.round(finalExamWeight * 100)
        },
        weeks: weekGrades
      }
    });
  } catch (error: any) {
    console.error('Error in getCourseGrades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
