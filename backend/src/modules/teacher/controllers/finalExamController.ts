import { Request, Response } from 'express';
import * as finalExamService from '../services/finalExamService';

/**
 * Create or update final exam for a course
 */
export const createOrUpdateExam = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const examData = {
      course_id: courseId,
      ...req.body
    };
    
    const exam = await finalExamService.createFinalExam(examData);
    
    res.status(201).json({
      success: true,
      data: exam,
      message: 'Final exam created/updated successfully'
    });
  } catch (error) {
    console.error('Error creating final exam:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create final exam'
    });
  }
};

/**
 * Get final exam for a course
 */
export const getExam = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const exam = await finalExamService.getFinalExam(courseId);
    
    if (!exam) {
      return res.status(404).json({
        success: false,
        error: 'No final exam found for this course'
      });
    }
    
    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('Error fetching final exam:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch final exam'
    });
  }
};

/**
 * Add a question to the final exam
 */
export const addQuestion = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const question = req.body;
    
    const newQuestion = await finalExamService.addQuestion(examId, question);
    
    res.status(201).json({
      success: true,
      data: newQuestion,
      message: 'Question added successfully'
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add question'
    });
  }
};

/**
 * Update a question
 */
export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const updates = req.body;
    
    await finalExamService.updateQuestion(questionId, updates);
    
    res.json({
      success: true,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update question'
    });
  }
};

/**
 * Delete a question
 */
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    
    await finalExamService.deleteQuestion(questionId);
    
    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete question'
    });
  }
};

/**
 * Toggle exam publish status
 */
export const togglePublish = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { is_published } = req.body;
    
    const exam = await finalExamService.togglePublish(examId, is_published);
    
    res.json({
      success: true,
      data: exam,
      message: is_published ? 'Exam published' : 'Exam unpublished'
    });
  } catch (error) {
    console.error('Error toggling publish:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle publish status'
    });
  }
};

/**
 * Get exam marks summary with progress bar data
 */
export const getMarksSummary = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    
    const summary = await finalExamService.getExamMarksSummary(examId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching marks summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch marks summary'
    });
  }
};

/**
 * Get all exam attempts for a course (teacher view)
 */
export const getAttempts = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const attempts = await finalExamService.getExamAttempts(courseId);
    
    res.json({
      success: true,
      data: attempts
    });
  } catch (error) {
    console.error('Error fetching exam attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exam attempts'
    });
  }
};
