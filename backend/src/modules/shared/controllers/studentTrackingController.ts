import { Request, Response } from 'express';
import * as studentTrackingService from '../services/studentTrackingService';
import { supabase } from '../../../config/database';

/**
 * Get student's own tracking data for a course
 * GET /api/student/courses/:courseId/tracking
 */
export const getMyTrackingData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = req.auth?.userId; // Clerk user ID

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await studentTrackingService.getStudentTrackingData(userId, courseId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[getMyTrackingData] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tracking data' });
  }
};

/**
 * Get all students' tracking data for a course (Teacher view)
 * GET /api/teacher/courses/:courseId/students/tracking
 */
export const getCourseStudentsTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;

    const result = await studentTrackingService.getCourseStudentTracking(courseId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[getCourseStudentsTracking] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch students tracking' });
  }
};

/**
 * Get specific student's tracking data (Teacher/Admin view)
 * GET /api/teacher/courses/:courseId/students/:studentId/tracking
 */
export const getStudentTrackingData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, studentId } = req.params;

    const result = await studentTrackingService.getStudentTrackingData(studentId, courseId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[getStudentTrackingData] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tracking data' });
  }
};

/**
 * Submit a quiz
 * POST /api/student/courses/:courseId/quizzes/:quizId/submit
 */
export const submitQuiz = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, quizId } = req.params;
    const { answers, timeTakenSeconds } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await studentTrackingService.submitQuiz(
      userId,
      courseId,
      quizId,
      answers,
      timeTakenSeconds
    );

    if (result.success) {
      // Log activity
      await studentTrackingService.logActivity(
        userId,
        courseId,
        'quiz_completed',
        { quiz_id: quizId },
        timeTakenSeconds
      );

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[submitQuiz] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit quiz' });
  }
};

/**
 * Submit an assignment
 * POST /api/student/courses/:courseId/assignments/:assignmentId/submit
 */
export const submitAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, assignmentId } = req.params;
    const { submissionText, fileUrl, fileName, fileSize } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await studentTrackingService.submitAssignment(
      userId,
      courseId,
      assignmentId,
      submissionText,
      fileUrl,
      fileName,
      fileSize
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[submitAssignment] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit assignment' });
  }
};

/**
 * Grade an assignment (Teacher)
 * PUT /api/teacher/assignments/submissions/:submissionId/grade
 */
export const gradeAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const numericGrade = Number(grade);
    if (grade === undefined || !Number.isFinite(numericGrade) || numericGrade < 0) {
      res.status(400).json({ success: false, message: 'Valid grade is required' });
      return;
    }

    const result = await studentTrackingService.gradeAssignment(
      submissionId,
      numericGrade,
      feedback,
      userId
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[gradeAssignment] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to grade assignment' });
  }
};

/**
 * Log student activity
 * POST /api/student/courses/:courseId/activity
 */
export const logStudentActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { activityType, activityData, durationSeconds } = req.body;
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const result = await studentTrackingService.logActivity(
      userId,
      courseId,
      activityType,
      activityData,
      durationSeconds
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[logStudentActivity] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to log activity' });
  }
};

/**
 * Get student performance view (Teacher/Admin)
 * GET /api/teacher/courses/:courseId/performance
 */
export const getStudentPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;

    const result = await studentTrackingService.getStudentPerformanceView(courseId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[getStudentPerformance] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch performance data' });
  }
};

/**
 * Update progress totals (called when course content changes)
 * POST /api/teacher/courses/:courseId/students/:studentId/update-progress
 */
export const updateStudentProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId, studentId } = req.params;

    const result = await studentTrackingService.updateProgressTotals(studentId, courseId);

    if (result.success) {
      res.json({ success: true, message: 'Progress updated successfully' });
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('[updateStudentProgress] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update progress' });
  }
};

/**
 * Recalculate quiz scores for a course
 * POST /api/teacher/courses/:courseId/recalculate-quiz-scores
 */
export const recalculateQuizScores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;

    // Get all quiz submissions for this course
    const { data: submissions, error: subError } = await supabase
      .from('quiz_submissions')
      .select('id, lesson_id, answers, score, total_points')
      .eq('course_id', courseId);

    if (subError) {
      res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
      return;
    }

    // Get unique lesson IDs
    const lessonIds = [...new Set((submissions || []).map((s: any) => s.lesson_id))];
    if (lessonIds.length === 0) {
      res.json({ success: true, message: 'No quiz submissions to recalculate', fixed: 0 });
      return;
    }

    // Fetch all quiz questions for these lessons
    const { data: lessons } = await supabase
      .from('course_lessons')
      .select('id, quiz_questions')
      .in('id', lessonIds);

    const lessonMap = new Map((lessons || []).map((l: any) => [l.id, l.quiz_questions || []]));

    let fixedCount = 0;
    for (const sub of (submissions || [])) {
      const questions = lessonMap.get(sub.lesson_id) || [];
      let earned = 0;
      let total = 0;

      questions.forEach((q: any, i: number) => {
        const points = q.marks || 1;
        total += points;
        const studentAnswer = sub.answers?.[i] ?? sub.answers?.[String(i)];
        const correctAnswer = q.correctAnswer ?? q.correct_answer;
        const questionType = q.type || 'mcq';

        if (questionType === 'mcq' || questionType === 'multiple-choice') {
          if (typeof correctAnswer === 'string' && q.options) {
            const correctIndex = q.options.indexOf(correctAnswer);
            if (studentAnswer === correctIndex) earned += points;
          } else if (studentAnswer === correctAnswer) {
            earned += points;
          }
        } else if (questionType === 'fill-blank' || questionType === 'fill_in_the_blank' || questionType === 'fill-in-blank') {
          const studentText = String(studentAnswer || '').trim().toLowerCase();
          const correctText = String(correctAnswer || '').trim().toLowerCase();
          if (studentText === correctText) earned += points;
        }
      });

      if (sub.score !== earned) {
        await supabase
          .from('quiz_submissions')
          .update({ score: earned, total_points: total, max_score: total })
          .eq('id', sub.id);
        fixedCount++;
      }
    }

    res.json({
      success: true,
      message: `Recalculated ${(submissions || []).length} submissions, fixed ${fixedCount}`,
      fixed: fixedCount,
      total: (submissions || []).length
    });
  } catch (error: any) {
    console.error('[recalculateQuizScores] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to recalculate quiz scores' });
  }
};
