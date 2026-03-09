import { Request, Response } from 'express';
import * as quizManagementService from '../services/quizManagementService';

export const getQuizAttempts = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const attempts = await quizManagementService.getQuizAttempts(quizId, teacherId);

    res.json(attempts);
  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz attempts' });
  }
};

export const updateQuizScore = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { score } = req.body;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    await quizManagementService.updateQuizScore(attemptId, score, teacherId);

    res.json({ message: 'Score updated successfully' });
  } catch (error: any) {
    console.error('Error updating quiz score:', error);
    res.status(500).json({ error: error.message || 'Failed to update score' });
  }
};
