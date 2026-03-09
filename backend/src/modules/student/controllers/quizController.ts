import { Request, Response } from 'express';
import * as quizService from '../services/quizService';

export const getQuiz = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const quizData = await quizService.getQuizByLesson(lessonId, studentId);

    res.json(quizData);
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz' });
  }
};

export const submitQuiz = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    const result = await quizService.submitQuiz(lessonId, studentId, answers);

    res.json(result);
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to submit quiz' });
  }
};

export const getAttempts = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const attempts = await quizService.getQuizAttempts(quizId, studentId);

    res.json(attempts);
  } catch (error: any) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch attempts' });
  }
};
