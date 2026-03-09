/**
 * Course Approval Controller
 * 
 * API endpoints for course approval workflow
 */

import { Request, Response } from 'express';
import * as courseApprovalService from '../services/courseApprovalService';
import * as courseNotifications from '../../../services/courseNotificationService';

/**
 * Submit course for approval (Teacher)
 * POST /api/courses/:courseId/submit-for-approval
 */
export const submitForApproval = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.auth?.userId;

    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const course = await courseApprovalService.submitForApproval(courseId, teacherId);

    res.json({
      success: true,
      message: 'Course submitted for approval',
      data: course
    });
  } catch (error: any) {
    console.error('Error submitting for approval:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get pending approvals (Admin)
 * GET /api/admin/courses/pending
 */
export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const courses = await courseApprovalService.getPendingApprovals();

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error: any) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Approve a course (Admin)
 * POST /api/admin/courses/:courseId/approve
 */
export const approveCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const adminId = req.auth?.userId;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const course = await courseApprovalService.approveCourse(courseId, adminId);

    // Notify all students about the new course (fire-and-forget)
    courseNotifications.notifyNewCourseAvailable({
      id: courseId,
      title: course.title,
      description: course.description,
      teacher_name: course.teacher_name
    });

    res.json({
      success: true,
      message: 'Course approved successfully',
      data: course
    });
  } catch (error: any) {
    console.error('Error approving course:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Reject a course (Admin)
 * POST /api/admin/courses/:courseId/reject
 */
export const rejectCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { reason } = req.body;
    const adminId = req.auth?.userId;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const course = await courseApprovalService.rejectCourse(courseId, adminId, reason);

    res.json({
      success: true,
      message: 'Course rejected',
      data: course
    });
  } catch (error: any) {
    console.error('Error rejecting course:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all courses for admin
 * GET /api/admin/courses
 */
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const { approval_status, status, teacher_id } = req.query;

    const courses = await courseApprovalService.getAllCoursesAdmin({
      approval_status: approval_status as string,
      status: status as string,
      teacher_id: teacher_id as string
    });

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete course (Admin)
 * DELETE /api/admin/courses/:courseId
 */
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    await courseApprovalService.deleteCourseAdmin(courseId);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    res.status(400).json({ error: error.message });
  }
};
