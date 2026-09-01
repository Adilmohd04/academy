/**
 * Admin Course Routes
 * 
 * Routes for admin course management:
 * - Approve/reject courses
 * - View all courses
 * - Delete courses
 * - Manage enrollments
 * - Certificate overrides
 */

/// <reference path="../types/express.d.ts" />

import express, { Request, Response } from 'express';
import '../types/express'; // Ensure type augmentation is loaded
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { getErrorMessage } from '../utils/errors';
import * as courseApprovalController from '../modules/admin/controllers/courseApprovalController';
import * as gradeCalculationService from '../modules/shared/services/gradeCalculationService';
import * as enrollmentManagementService from '../modules/admin/services/enrollmentManagementService';

const router = express.Router();

// All routes require admin role
const adminAuth = [requireAuth, requireRole(['admin'])];

// ==========================================
// COURSE APPROVAL
// ==========================================

// Get all pending approval requests
router.get('/courses/pending', ...adminAuth, courseApprovalController.getPendingApprovals);

// Get all courses (with filters)
router.get('/courses', ...adminAuth, courseApprovalController.getAllCourses);

// Approve a course
router.post('/courses/:courseId/approve', ...adminAuth, courseApprovalController.approveCourse);

// Reject a course
router.post('/courses/:courseId/reject', ...adminAuth, courseApprovalController.rejectCourse);

// Delete a course
router.delete('/courses/:courseId', ...adminAuth, courseApprovalController.deleteCourse);

// ==========================================
// ENROLLMENT MANAGEMENT
// ==========================================

// Get all enrollments
router.get('/enrollments', ...adminAuth, async (req, res) => {
  try {
    const { course_id, student_id, payment_status } = req.query;

    const enrollments = await enrollmentManagementService.getAllEnrollments({
      course_id: course_id as string,
      student_id: student_id as string,
      payment_status: payment_status as string
    });

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get enrollments for a specific course
router.get('/courses/:courseId/enrollments', ...adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollments = await enrollmentManagementService.getCourseEnrollments(courseId);

    res.json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Manually enroll a student
router.post('/enrollments/manual', ...adminAuth, async (req, res) => {
  try {
    const { course_id, student_id, notes } = req.body;
    const adminId = req.auth?.userId;

    if (!course_id || !student_id) {
      return res.status(400).json({ error: 'Course ID and Student ID are required' });
    }

    const enrollment = await enrollmentManagementService.manualEnroll(
      course_id,
      student_id,
      adminId!,
      notes
    );

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: enrollment
    });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Remove an enrollment
router.delete('/enrollments/:enrollmentId', ...adminAuth, async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    await enrollmentManagementService.removeEnrollment(enrollmentId);

    res.json({
      success: true,
      message: 'Enrollment removed'
    });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Update enrollment status
router.patch('/enrollments/:enrollmentId/status', ...adminAuth, async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const enrollment = await enrollmentManagementService.updateEnrollmentStatus(
      enrollmentId,
      status
    );

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Get enrollment statistics
router.get('/enrollments/stats', ...adminAuth, async (req, res) => {
  try {
    const { course_id } = req.query;

    const stats = await enrollmentManagementService.getEnrollmentStats(course_id as string);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ==========================================
// CERTIFICATE MANAGEMENT
// ==========================================

// Override certificate for failed student
router.post('/certificates/override', ...adminAuth, async (req, res) => {
  try {
    const { course_id, student_id, reason } = req.body;
    const adminId = req.auth?.userId;

    if (!course_id || !student_id || !reason) {
      return res.status(400).json({ 
        error: 'Course ID, Student ID, and reason are required' 
      });
    }

    const certificate = await gradeCalculationService.adminOverrideCertificate(
      course_id,
      student_id,
      adminId!,
      reason
    );

    res.status(201).json({
      success: true,
      message: 'Certificate issued with admin override',
      data: certificate
    });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Get student grades for a course
router.get('/courses/:courseId/grades', ...adminAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const grades = await gradeCalculationService.getCourseGrades(courseId);

    res.json({
      success: true,
      count: grades.length,
      data: grades
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Recalculate grades for a student
router.post('/courses/:courseId/students/:studentId/recalculate-grade', ...adminAuth, async (req, res) => {
  try {
    const { courseId, studentId } = req.params;

    const result = await gradeCalculationService.calculateFinalGrade(courseId, studentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

export default router;
