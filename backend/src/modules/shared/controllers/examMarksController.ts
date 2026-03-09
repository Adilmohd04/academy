/**
 * Exam Marks Controller
 * 
 * API endpoints for admin exam marks management
 */

import { Request, Response } from 'express';
import * as examMarksService from '../services/examMarksService';

// ============================================
// EXAM SESSION ENDPOINTS
// ============================================

/**
 * Create exam session
 */
export const createExamSession = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const session = await examMarksService.createExamSession(
      courseId,
      req.body,
      adminId
    );
    
    res.status(201).json({
      success: true,
      data: session,
      message: 'Exam session created successfully'
    });
  } catch (error: any) {
    console.error('Error creating exam session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create exam session'
    });
  }
};

/**
 * Get exam sessions for a course
 */
export const getCourseExamSessions = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    
    const sessions = await examMarksService.getCourseExamSessions(courseId);
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error: any) {
    console.error('Error fetching exam sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exam sessions'
    });
  }
};

/**
 * Get exam session by ID
 */
export const getExamSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const session = await examMarksService.getExamSessionById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Exam session not found'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error: any) {
    console.error('Error fetching exam session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exam session'
    });
  }
};

/**
 * Update exam session status
 */
export const updateExamSessionStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    
    const session = await examMarksService.updateExamSessionStatus(sessionId, status);
    
    res.json({
      success: true,
      data: session,
      message: 'Exam session status updated'
    });
  } catch (error: any) {
    console.error('Error updating exam session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update exam session'
    });
  }
};

// ============================================
// MARKS ENTRY ENDPOINTS
// ============================================

/**
 * Enter marks for a single student
 */
export const enterStudentMarks = async (req: Request, res: Response) => {
  try {
    const { sessionId, studentId } = req.params;
    const { marks_obtained, remarks, attendance_status } = req.body;
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const mark = await examMarksService.enterStudentMarks(
      sessionId,
      studentId,
      marks_obtained,
      adminId,
      { remarks, attendance_status }
    );
    
    res.status(201).json({
      success: true,
      data: mark,
      message: 'Marks entered successfully'
    });
  } catch (error: any) {
    console.error('Error entering marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enter marks'
    });
  }
};

/**
 * Bulk enter marks for multiple students
 */
export const bulkEnterMarks = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { marks } = req.body;
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Marks array is required'
      });
    }
    
    const result = await examMarksService.bulkEnterMarks(sessionId, marks, adminId);
    
    res.status(201).json({
      success: true,
      data: result,
      message: `Successfully entered ${result.success.length} marks, ${result.failed.length} failed`
    });
  } catch (error: any) {
    console.error('Error bulk entering marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to enter marks'
    });
  }
};

/**
 * Get all marks for an exam session
 */
export const getExamSessionMarks = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const data = await examMarksService.getExamSessionMarks(sessionId);
    
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch marks'
    });
  }
};

/**
 * Get students for marks entry (shows marked and unmarked)
 */
export const getStudentsForMarksEntry = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const data = await examMarksService.getStudentsForMarksEntry(sessionId);
    
    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch students'
    });
  }
};

// ============================================
// VERIFICATION ENDPOINTS
// ============================================

/**
 * Verify single mark entry
 */
export const verifyMarks = async (req: Request, res: Response) => {
  try {
    const { marksId } = req.params;
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const mark = await examMarksService.verifyMarks(marksId, adminId);
    
    res.json({
      success: true,
      data: mark,
      message: 'Marks verified successfully'
    });
  } catch (error: any) {
    console.error('Error verifying marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify marks'
    });
  }
};

/**
 * Bulk verify all marks in a session
 */
export const bulkVerifyMarks = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const count = await examMarksService.bulkVerifyMarks(sessionId, adminId);
    
    res.json({
      success: true,
      verified_count: count,
      message: `Successfully verified ${count} marks`
    });
  } catch (error: any) {
    console.error('Error bulk verifying marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify marks'
    });
  }
};

// ============================================
// STUDENT VIEW ENDPOINTS
// ============================================

/**
 * Get student's exam marks (for students)
 */
export const getMyExamMarks = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;
    const { courseId } = req.query;
    
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const marks = await examMarksService.getStudentExamMarks(
      studentId,
      courseId as string
    );
    
    res.json({
      success: true,
      data: marks
    });
  } catch (error: any) {
    console.error('Error fetching exam marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch exam marks'
    });
  }
};

// ============================================
// SYNC & EXPORT ENDPOINTS
// ============================================

/**
 * Sync marks to grades table
 */
export const syncMarksToGrades = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const count = await examMarksService.syncMarksToGrades(sessionId);
    
    res.json({
      success: true,
      synced_count: count,
      message: `Successfully synced ${count} marks to grades`
    });
  } catch (error: any) {
    console.error('Error syncing marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync marks'
    });
  }
};

/**
 * Export marks as CSV data
 */
export const exportMarks = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const data = await examMarksService.exportMarksData(sessionId);
    
    // Convert to CSV string
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=exam-marks-${sessionId}.csv`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('Error exporting marks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export marks'
    });
  }
};
