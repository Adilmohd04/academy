import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import certificateService from '../services/certificateService';

const router = express.Router();

/**
 * Certificate Routes
 * 
 * Teacher routes: Award, revoke, manage certificates
 * Student routes: View own certificates
 * Admin routes: Manage all certificates
 */

// ==================== TEACHER ROUTES ====================

// Get all certificates for a course
router.get(
  '/teacher/courses/:courseId/certificates',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.auth?.userId;

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (course.teacher_id !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get all certificates
      const certificates = await certificateService.getCourseCertificates(courseId);

      res.json({ certificates });
    } catch (error: any) {
      console.error('Error in getCourseCertificates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Manually award certificate to a student
router.post(
  '/teacher/courses/:courseId/students/:studentId/certificate',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId, studentId } = req.params;
      const userId = req.auth?.userId;

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (course.teacher_id !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Award certificate
      const result = await certificateService.awardCertificate(
        courseId,
        studentId,
        profile.id
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({
        message: 'Certificate awarded successfully',
        certificate: result.certificate
      });
    } catch (error: any) {
      console.error('Error in awardCertificate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Revoke a certificate
router.post(
  '/teacher/certificates/:certificateId/revoke',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { certificateId } = req.params;
      const { reason } = req.body;
      const userId = req.auth?.userId;

      if (!reason) {
        return res.status(400).json({ error: 'Revocation reason is required' });
      }

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify teacher owns the course
      const { data: certificate } = await supabase
        .from('certificates')
        .select(`
          id,
          courses!inner (
            id,
            teacher_id
          )
        `)
        .eq('id', certificateId)
        .single();

      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      const courses: any = certificate.courses;
      const teacherId = Array.isArray(courses) ? courses[0]?.teacher_id : courses?.teacher_id;

      if (teacherId !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Revoke certificate
      const result = await certificateService.revokeCertificate(
        certificateId,
        profile.id,
        reason
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: 'Certificate revoked successfully' });
    } catch (error: any) {
      console.error('Error in revokeCertificate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get student's grade breakdown and eligibility
router.get(
  '/teacher/courses/:courseId/students/:studentId/grade',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId, studentId } = req.params;
      const userId = req.auth?.userId;

      // Get teacher profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Teacher profile not found' });
      }

      // Verify teacher owns the course
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .single();

      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (course.teacher_id !== profile.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Calculate final score
      const scoreData = await certificateService.calculateFinalScore(courseId, studentId);

      if (!scoreData) {
        return res.status(404).json({ error: 'Unable to calculate grade' });
      }

      // Check if has certificate
      const certificate = await certificateService.getStudentCertificate(courseId, studentId);

      res.json({
        ...scoreData,
        has_certificate: !!certificate,
        certificate_status: certificate?.status || null
      });
    } catch (error: any) {
      console.error('Error in getStudentGrade:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ==================== STUDENT ROUTES ====================

// Get student's own certificates
router.get(
  '/student/certificates',
  requireAuth,
  async (req: any, res) => {
    try {
      const userId = req.auth?.userId;

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Get all certificates
      const certificates = await certificateService.getStudentCertificates(profile.id);

      res.json({ certificates });
    } catch (error: any) {
      console.error('Error in getStudentCertificates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get certificate for a specific course
router.get(
  '/student/courses/:courseId/certificate',
  requireAuth,
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.auth?.userId;

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Verify student is enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', profile.id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      // Get certificate
      const certificate = await certificateService.getStudentCertificate(courseId, profile.id);

      if (!certificate) {
        // Calculate current grade to show progress
        const scoreData = await certificateService.calculateFinalScore(courseId, profile.id);
        
        return res.json({
          has_certificate: false,
          grade_data: scoreData
        });
      }

      res.json({
        has_certificate: true,
        certificate
      });
    } catch (error: any) {
      console.error('Error in getCourseCertificate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get student's own grade breakdown
router.get(
  '/student/courses/:courseId/grade',
  requireAuth,
  async (req: any, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.auth?.userId;

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      // Verify student is enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', profile.id)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      // Calculate final score
      const scoreData = await certificateService.calculateFinalScore(courseId, profile.id);

      if (!scoreData) {
        return res.status(404).json({ error: 'Unable to calculate grade' });
      }

      // Check if has certificate
      const certificate = await certificateService.getStudentCertificate(courseId, profile.id);

      res.json({
        ...scoreData,
        has_certificate: !!certificate,
        certificate_status: certificate?.status || null
      });
    } catch (error: any) {
      console.error('Error in getStudentGrade:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
