import { Request, Response } from 'express';
import * as courseProgressService from '../services/courseProgressService';

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

    await courseProgressService.markLessonComplete(lessonId, studentId);

    res.json({ message: 'Lesson marked as complete' });
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
