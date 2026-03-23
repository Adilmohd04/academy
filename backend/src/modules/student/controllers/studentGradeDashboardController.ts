/**
 * Grade Dashboard Controller (Student)
 *
 * Handles student-side grading dashboard requests:
 * - View own grade for a course
 * - View grade history across all courses
 * - View grade breakdown by component
 */

import { Request, Response } from 'express';
import * as gradeDashboardService from '../../shared/services/gradeDashboardService';
import { supabase } from '../../../config/database';

async function verifyEnrollment(courseId: string, studentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Get own grade for a course
 * GET /api/student/courses/:courseId/grade
 */
export const getMyGrade = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized - student ID required' });
    }

    const enrolled = await verifyEnrollment(courseId, studentId);
    if (!enrolled) {
      return res.status(403).json({ success: false, error: 'You are not enrolled in this course' });
    }

    const grade = await gradeDashboardService.calculateStudentGrade(courseId, studentId);

    res.json({ success: true, data: grade });
  } catch (error: any) {
    console.error('Get my grade error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch grade' });
  }
};

/**
 * Get grade history across all enrolled courses
 * GET /api/student/grade-history
 */
export const getMyGradeHistory = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized - student ID required' });
    }

    const gradeHistory = await gradeDashboardService.getStudentGradeHistory(studentId);

    res.json({ success: true, data: gradeHistory });
  } catch (error: any) {
    console.error('Get grade history error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch grade history' });
  }
};

/**
 * Get grading policy for a course (student view)
 * GET /api/student/courses/:courseId/grading-policy
 */
export const getGradingPolicy = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized - student ID required' });
    }

    const enrolled = await verifyEnrollment(courseId, studentId);
    if (!enrolled) {
      return res.status(403).json({ success: false, error: 'You are not enrolled in this course' });
    }

    const policy = await gradeDashboardService.getCourseGradingPolicy(courseId);

    res.json({ success: true, data: policy });
  } catch (error: any) {
    console.error('Get grading policy error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch grading policy' });
  }
};
