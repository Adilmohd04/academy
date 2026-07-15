import { Request, Response } from 'express';
import * as courseProgressService from '../services/courseProgressService';
import { checkAndAwardCertificate } from '../../certificate/services/issuanceService';

export const getCourseContent = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const content = await courseProgressService.getCourseContentWithProgress(
      courseId,
      studentId
    );

    res.json({
      ...content.course,
      weeks: content.weeks,
      total_lessons: content.progress.total_lessons,
      completed_lessons: content.progress.completed_lessons,
      progress_percentage: content.progress.progress_percentage
    });
  } catch (error: any) {
    console.error('Error fetching course content:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch course content' });
  }
};

export const markLessonComplete = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, progressPercentage } = await courseProgressService.markLessonComplete(
      lessonId,
      studentId,
    );

    // Issuance hook (Task 20.2): when the student completes all content,
    // attempt to issue the certificate. This is the synchronous real-time
    // path that meets the 60-second SLA (design §8.2). It's idempotent and
    // safely no-ops if the student isn't yet fully eligible (e.g. an unpassed
    // quiz). Errors here never block the lesson-completion response.
    if (courseId && progressPercentage >= 100) {
      try {
        await checkAndAwardCertificate(courseId, studentId);
      } catch (hookError) {
        console.error('[lesson-complete] certificate issuance hook failed:', hookError);
      }
    }

    res.json({ message: 'Lesson marked as complete', progress_percentage: progressPercentage });
  } catch (error: any) {
    console.error('Error completing lesson:', error);
    res.status(500).json({ error: error.message || 'Failed to complete lesson' });
  }
};

export const getLessonProgress = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const progress = await courseProgressService.getLessonProgress(lessonId, studentId);

    res.json(progress);
  } catch (error: any) {
    console.error('Error fetching lesson progress:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lesson progress' });
  }
};
