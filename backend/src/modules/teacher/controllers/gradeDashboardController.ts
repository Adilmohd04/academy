/**
 * Grade Dashboard Controller (Teacher)
 * 
 * Handles teacher-side grading dashboard requests:
 * - View complete gradebook for a course
 * - View individual student grades
 * - Export gradebook to CSV
 * - View grade statistics
 */

import { Request, Response } from 'express';
import * as gradeDashboardService from '../../shared/services/gradeDashboardService';

/**
 * Get complete gradebook for a course
 * GET /api/teacher/courses/:courseId/gradebook
 */
export const getCourseGradebook = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - teacher ID required',
      });
    }
    
    // TODO: Verify teacher owns this course (enrollment check)
    
    const gradebook = await gradeDashboardService.getCourseGradebook(courseId);
    
    res.json({
      success: true,
      data: gradebook,
    });
  } catch (error: any) {
    console.error('Get course gradebook error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch gradebook',
    });
  }
};

/**
 * Get detailed grade for a specific student in a course
 * GET /api/teacher/courses/:courseId/students/:studentId/grade
 */
export const getStudentGradeDetail = async (req: Request, res: Response) => {
  try {
    const { courseId, studentId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - teacher ID required',
      });
    }
    
    // TODO: Verify teacher owns this course
    
    const grade = await gradeDashboardService.calculateStudentGrade(courseId, studentId);
    
    res.json({
      success: true,
      data: grade,
    });
  } catch (error: any) {
    console.error('Get student grade error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch student grade',
    });
  }
};

/**
 * Export gradebook to CSV
 * GET /api/teacher/courses/:courseId/gradebook/export
 */
export const exportGradebook = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - teacher ID required',
      });
    }
    
    // TODO: Verify teacher owns this course
    
    const gradebook = await gradeDashboardService.getCourseGradebook(courseId);
    const csv = gradeDashboardService.exportGradebookToCSV(gradebook);
    
    // Set response headers for CSV download
    const filename = `gradebook_${gradebook.course_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Export gradebook error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export gradebook',
    });
  }
};

/**
 * Get grading policy for a course
 * GET /api/teacher/courses/:courseId/grading-policy
 */
export const getGradingPolicy = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;
    
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - teacher ID required',
      });
    }
    
    const policy = await gradeDashboardService.getCourseGradingPolicy(courseId);
    
    res.json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    console.error('Get grading policy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch grading policy',
    });
  }
};
