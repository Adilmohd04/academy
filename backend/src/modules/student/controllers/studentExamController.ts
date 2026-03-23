/**
 * Student Final Exam Controller
 */

import { Request, Response } from 'express';
import * as studentExamService from '../services/studentExamService';

/**
 * Get available exams for student
 */
export const getAvailableExams = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const exams = await studentExamService.getAvailableExams(studentId);
    
    res.json({
      success: true,
      data: exams
    });
  } catch (error: any) {
    console.error('Error fetching available exams:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exams'
    });
  }
};

/**
 * Get upcoming exams for student (compat endpoint for UI)
 */
export const getUpcomingExams = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exams = await studentExamService.getAvailableExams(studentId);

    res.json({
      success: true,
      exams
    });
  } catch (error: any) {
    console.error('Error fetching upcoming exams:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch upcoming exams'
    });
  }
};

/**
 * Get exam details for student
 */
export const getExamDetails = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { examId } = req.params;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const exam = await studentExamService.getExamForStudent(examId, studentId);
    
    res.json({
      success: true,
      data: exam
    });
  } catch (error: any) {
    console.error('Error fetching exam details:', error);
    res.status(error.message.includes('not enrolled') ? 403 : 500).json({
      success: false,
      error: error.message || 'Failed to fetch exam details'
    });
  }
};

/**
 * Start exam attempt
 */
export const startExam = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { examId } = req.params;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await studentExamService.startExamAttempt({
      exam_id: examId,
      student_id: studentId
    });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error starting exam:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to start exam'
    });
  }
};

/**
 * Save answer (auto-save)
 */
export const saveAnswer = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { question_id, answer_text, selected_options, uploaded_file_url } = req.body;
    
    const result = await studentExamService.saveAnswer({
      submission_id: submissionId,
      question_id,
      answer_text,
      selected_options,
      uploaded_file_url
    });
    
    res.json(result);
  } catch (error: any) {
    console.error('Error saving answer:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to save answer'
    });
  }
};

/**
 * Submit exam
 */
export const submitExam = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    
    const result = await studentExamService.submitExam(submissionId);
    
    res.json(result);
  } catch (error: any) {
    console.error('Error submitting exam:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to submit exam'
    });
  }
};

/**
 * Get submission results
 */
export const getSubmissionResults = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { submissionId } = req.params;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const results = await studentExamService.getSubmissionResults(submissionId, studentId);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error: any) {
    console.error('Error fetching submission results:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to fetch results'
    });
  }
};

/**
 * Get student's exam history
 */
export const getExamHistory = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const history = await studentExamService.getStudentExamHistory(studentId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Error fetching exam history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exam history'
    });
  }
};
