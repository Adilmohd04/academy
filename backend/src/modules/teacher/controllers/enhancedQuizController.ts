/**
 * Enhanced Quiz Controller
 * 
 * API endpoints for quiz management with marks
 */

import { Request, Response } from 'express';
import * as enhancedQuizService from '../services/enhancedQuizService';

/**
 * Create a new quiz
 * POST /api/teacher/quizzes
 */
export const createQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await enhancedQuizService.createQuiz(req.body);

    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error: any) {
    console.error('Error creating quiz:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get quiz by ID with questions
 * GET /api/teacher/quizzes/:quizId
 */
export const getQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    const quiz = await enhancedQuizService.getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update quiz settings
 * PUT /api/teacher/quizzes/:quizId
 */
export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    const quiz = await enhancedQuizService.updateQuiz(quizId, req.body);

    res.json({
      success: true,
      data: quiz
    });
  } catch (error: any) {
    console.error('Error updating quiz:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete quiz
 * DELETE /api/teacher/quizzes/:quizId
 */
export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    await enhancedQuizService.deleteQuiz(quizId);

    res.json({
      success: true,
      message: 'Quiz deleted'
    });
  } catch (error: any) {
    console.error('Error deleting quiz:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Add a question to quiz
 * POST /api/teacher/quizzes/:quizId/questions
 */
export const addQuestion = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { question_text, question_type, marks, explanation, options } = req.body;

    if (!question_text) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    if (!marks || marks <= 0) {
      return res.status(400).json({ error: 'Marks must be greater than 0' });
    }

    const question = await enhancedQuizService.addQuestion({
      quiz_id: quizId,
      question_text,
      question_type,
      marks,
      explanation,
      options
    });

    // Get updated marks summary
    const marksSummary = await enhancedQuizService.getQuizMarksSummary(quizId);

    res.status(201).json({
      success: true,
      data: question,
      marks_summary: marksSummary
    });
  } catch (error: any) {
    console.error('Error adding question:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Update a question
 * PUT /api/teacher/questions/:questionId
 */
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;

    const question = await enhancedQuizService.updateQuestion(questionId, req.body);

    res.json({
      success: true,
      data: question
    });
  } catch (error: any) {
    console.error('Error updating question:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete a question
 * DELETE /api/teacher/questions/:questionId
 */
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;

    await enhancedQuizService.deleteQuestion(questionId);

    res.json({
      success: true,
      message: 'Question deleted'
    });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get quiz marks summary (for progress bar)
 * GET /api/teacher/quizzes/:quizId/marks-summary
 */
export const getMarksSummary = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    const summary = await enhancedQuizService.getQuizMarksSummary(quizId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error fetching marks summary:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get quizzes for a lesson
 * GET /api/teacher/lessons/:lessonId/quizzes
 */
export const getLessonQuizzes = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const quizzes = await enhancedQuizService.getLessonQuizzes(lessonId);

    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error: any) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: error.message });
  }
};
