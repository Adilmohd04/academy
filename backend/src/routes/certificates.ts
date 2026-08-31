import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import * as certificateService from '../services/certificateService';
import { issueCertificate } from '../modules/certificate/services/issuanceService';

const router = express.Router();

const isTeacherOwner = (
  ownerTeacherId: string | null | undefined,
  teacherProfileId: string | null | undefined,
  clerkUserId: string | null | undefined
): boolean => {
  return !!ownerTeacherId && (ownerTeacherId === teacherProfileId || ownerTeacherId === clerkUserId);
};

const getTeacherProfileId = async (userId: string | undefined): Promise<string | null> => {
  if (!userId) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  return profile?.id || null;
};

const mergeTemplateData = (existingData: any, updates: any) => {
  return {
    ...(existingData || {}),
    ...(updates || {}),
  };
};

const getApprovalStatus = (template: any): 'approved' | 'pending_approval' | 'rejected' | 'draft' => {
  return template?.approval_status || template?.template_data?.approval_status || 'draft';
};

const getAllowTeacherEditing = (template: any): boolean => {
  return Boolean(template?.allow_teacher_editing ?? template?.template_data?.allow_teacher_edits ?? false);
};

const normalizeTemplateMeta = (
  existingData: any,
  incomingData: any,
  role: 'teacher' | 'admin',
  mode: 'create' | 'update'
) => {
  const safeIncoming = { ...(incomingData || {}) };
  const incomingPlatform = safeIncoming.platform;
  const incomingAllowTeacherEdits = safeIncoming.allow_teacher_edits;

  delete safeIncoming.platform;
  delete safeIncoming.allow_teacher_edits;

  const resolvedPlatform = role === 'admin'
    ? (incomingPlatform || existingData?.platform || 'platform')
    : (existingData?.platform || 'course');

  const resolvedAllowTeacherEdits = role === 'admin'
    ? Boolean(incomingAllowTeacherEdits ?? existingData?.allow_teacher_edits ?? false)
    : Boolean(existingData?.allow_teacher_edits ?? (mode === 'create'));

  return {
    safeIncoming,
    templateMeta: {
      platform: resolvedPlatform,
      allow_teacher_edits: resolvedAllowTeacherEdits,
    },
  };
};

/**
 * Certificate Routes
 * 
 * Teacher routes: Award, revoke, manage certificates
 * Student routes: View own certificates
 * Admin routes: Manage all certificates
 */

// ==================== TEMPLATE DESIGN ROUTES ====================

router.get(
  '/certificate-templates',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const userId = req.auth?.userId;
      const role = req.auth?.role;
      const { courseId } = req.query;

      if (role === 'teacher' && !courseId) {
        return res.status(400).json({ error: 'courseId is required for teachers' });
      }

      let teacherProfileId: string | null = null;
      if (role === 'teacher') {
        teacherProfileId = await getTeacherProfileId(userId);
        if (!teacherProfileId) {
          return res.status(404).json({ error: 'Teacher profile not found' });
        }

        const { data: course } = await supabase
          .from('courses')
          .select('id, teacher_id')
          .eq('id', courseId)
          .single();

        if (!course) {
          return res.status(404).json({ error: 'Course not found' });
        }

        if (!isTeacherOwner(course.teacher_id, teacherProfileId, userId)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const { data: templates, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching certificate templates:', error);
        return res.status(500).json({ error: 'Failed to fetch certificate templates' });
      }

      let filtered = templates || [];

      if (courseId) {
        filtered = filtered.filter((t: any) => !t.course_id || t.course_id === courseId);
      }

      if (role === 'teacher') {
        filtered = filtered.filter((t: any) => {
          const status = getApprovalStatus(t);
          if (t.course_id) return true;
          return status === 'approved';
        });
      }

      res.json({ templates: filtered });
    } catch (error: any) {
      console.error('Error in getCertificateTemplates:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.post(
  '/certificate-templates',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const userId = req.auth?.userId;
      const role = req.auth?.role;
      const {
        courseId,
        templateName,
        templateData,
        isDefault,
        submitForApproval,
      } = req.body || {};

      if (!templateName) {
        return res.status(400).json({ error: 'templateName is required' });
      }

      if (!templateData || typeof templateData !== 'object') {
        return res.status(400).json({ error: 'templateData is required' });
      }

      if (role === 'teacher' && !courseId) {
        return res.status(400).json({ error: 'Teachers must provide courseId' });
      }

      let teacherProfileId: string | null = null;
      if (role === 'teacher') {
        teacherProfileId = await getTeacherProfileId(userId);
        if (!teacherProfileId) {
          return res.status(404).json({ error: 'Teacher profile not found' });
        }

        const { data: course } = await supabase
          .from('courses')
          .select('id, teacher_id')
          .eq('id', courseId)
          .single();

        if (!course) {
          return res.status(404).json({ error: 'Course not found' });
        }

        if (!isTeacherOwner(course.teacher_id, teacherProfileId, userId)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      if (isDefault && role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can set default templates' });
      }

      const { safeIncoming, templateMeta } = normalizeTemplateMeta(null, templateData, role, 'create');
      const approverProfileId = role === 'admin' ? await getTeacherProfileId(userId) : null;
      const now = new Date().toISOString();

      const approvalStatus = role === 'admin'
        ? 'approved'
        : 'pending_approval';

      const payload = {
        course_id: courseId || null,
        template_name: templateName,
        template_data: {
          ...safeIncoming,
          ...templateMeta,
          approval_status: approvalStatus,
          submitted_by: userId,
          submitted_at: now,
        },
        approval_status: approvalStatus,
        allow_teacher_editing: Boolean(templateMeta.allow_teacher_edits),
        approved_by: approverProfileId,
        approved_at: role === 'admin' ? now : null,
        rejection_reason: null,
        is_default: Boolean(isDefault && role === 'admin'),
      };

      if (payload.is_default) {
        const defaultScopeCourseId = payload.course_id;
        const clearDefaultQuery = supabase
          .from('certificate_templates')
          .update({ is_default: false });

        if (defaultScopeCourseId) {
          await clearDefaultQuery.eq('course_id', defaultScopeCourseId);
        } else {
          await clearDefaultQuery.is('course_id', null);
        }
      }

      const { data: created, error } = await supabase
        .from('certificate_templates')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating certificate template:', error);
        return res.status(500).json({ error: 'Failed to create certificate template' });
      }

      res.status(201).json({ template: created });
    } catch (error: any) {
      console.error('Error in createCertificateTemplate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/certificate-templates/:templateId',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const userId = req.auth?.userId;
      const role = req.auth?.role;
      const {
        templateName,
        templateData,
        submitForApproval,
      } = req.body || {};

      const { data: existing, error: existingError } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (existingError || !existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (role === 'teacher') {
        const teacherProfileId = await getTeacherProfileId(userId);

        if (!teacherProfileId) {
          return res.status(404).json({ error: 'Teacher profile not found' });
        }

        if (!existing.course_id) {
          return res.status(403).json({ error: 'Teachers cannot edit default templates' });
        }

        const { data: course } = await supabase
          .from('courses')
          .select('id, teacher_id')
          .eq('id', existing.course_id)
          .single();

        if (!course || !isTeacherOwner(course.teacher_id, teacherProfileId, userId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        if (!getAllowTeacherEditing(existing)) {
          return res.status(403).json({ error: 'Admin has not enabled editing for this certificate template' });
        }
      }

      const { safeIncoming, templateMeta } = normalizeTemplateMeta(existing.template_data, templateData, role, 'update');
      const approverProfileId = role === 'admin' ? await getTeacherProfileId(userId) : null;
      const now = new Date().toISOString();

      const nextApprovalStatus = role === 'admin'
        ? 'approved'
        : 'pending_approval';

      const updatedData = mergeTemplateData(existing.template_data, {
        ...safeIncoming,
        ...templateMeta,
          approval_status: nextApprovalStatus,
          submitted_by: userId,
          submitted_at: now,
        });

      const { data: updated, error } = await supabase
        .from('certificate_templates')
        .update({
          template_name: templateName || existing.template_name,
          template_data: updatedData,
          approval_status: nextApprovalStatus,
          allow_teacher_editing: Boolean(templateMeta.allow_teacher_edits),
          approved_by: role === 'admin' ? approverProfileId : existing.approved_by,
          approved_at: role === 'admin' ? now : existing.approved_at,
          rejection_reason: role === 'admin' ? null : existing.rejection_reason,
          updated_at: now,
        })
        .eq('id', templateId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating certificate template:', error);
        return res.status(500).json({ error: 'Failed to update certificate template' });
      }

      res.json({ template: updated });
    } catch (error: any) {
      console.error('Error in updateCertificateTemplate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/certificate-templates/:templateId/approve',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const userId = req.auth?.userId;
      const { isDefault } = req.body || {};
      const approverProfileId = await getTeacherProfileId(userId);
      const now = new Date().toISOString();

      const { data: existing, error: existingError } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (existingError || !existing) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (isDefault) {
        const clearDefaultQuery = supabase
          .from('certificate_templates')
          .update({ is_default: false });

        if (existing.course_id) {
          await clearDefaultQuery.eq('course_id', existing.course_id);
        } else {
          await clearDefaultQuery.is('course_id', null);
        }
      }

      const updatedTemplateData = mergeTemplateData(existing.template_data, {
        approval_status: 'approved',
        approved_by: approverProfileId,
        approved_at: now,
      });

      const { data: updated, error } = await supabase
        .from('certificate_templates')
        .update({
          is_default: Boolean(isDefault),
          template_data: updatedTemplateData,
          approval_status: 'approved',
          approved_by: approverProfileId,
          approved_at: now,
          rejection_reason: null,
          updated_at: now,
        })
        .eq('id', templateId)
        .select('*')
        .single();

      if (error) {
        console.error('Error approving certificate template:', error);
        return res.status(500).json({ error: 'Failed to approve certificate template' });
      }

      res.json({ template: updated });
    } catch (error: any) {
      console.error('Error in approveCertificateTemplate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

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
      const role = req.auth?.role;

      // Get teacher profile
      const profileId = await getTeacherProfileId(userId);

      if (role !== 'admin' && !profileId) {
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

      if (role !== 'admin' && !isTeacherOwner(course.teacher_id, profileId, userId)) {
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
      const role = req.auth?.role;

      // Get teacher profile
      const profileId = await getTeacherProfileId(userId);

      if (role !== 'admin' && !profileId) {
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

      if (role !== 'admin' && !isTeacherOwner(course.teacher_id, profileId, userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Use the single issuance lifecycle.  This prevents this legacy route
      // from creating a certificate without a secure verification code/QR.
      const result = await issueCertificate(courseId, studentId);
      if (result.ok === false) {
        return res.status(400).json({ error: result.error, unmet: result.unmet });
      }

      if (String(result.certificate?.status || '').toLowerCase() === 'revoked') {
        return res.status(409).json({
          error: 'Certificate is revoked. Use the approved reissue workflow instead.',
        });
      }

      res.status(result.alreadyIssued ? 200 : 201).json({
        message: result.alreadyIssued ? 'Certificate already issued' : 'Certificate awarded successfully',
        alreadyIssued: result.alreadyIssued,
        certificate: result.certificate,
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
      const role = req.auth?.role;

      if (!reason) {
        return res.status(400).json({ error: 'Revocation reason is required' });
      }

      // Get teacher profile
      const profileId = await getTeacherProfileId(userId);

      // Administrators may revoke any certificate and do not need a teacher
      // profile. A teacher profile is required only for the ownership check
      // below, otherwise a valid admin could be incorrectly blocked here.
      if (role !== 'admin' && !profileId) {
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

      if (role !== 'admin' && !isTeacherOwner(teacherId, profileId, userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Revoke certificate
      const result = await certificateService.revokeCertificate(
        certificateId,
        // The legacy audit column is a profile UUID. An admin without a local
        // profile can still revoke, but must not write a Clerk `user_*` value
        // into that UUID column.
        profileId,
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
      const role = req.auth?.role;

      // Get teacher profile
      const profileId = await getTeacherProfileId(userId);

      if (role !== 'admin' && !profileId) {
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

      if (role !== 'admin' && !isTeacherOwner(course.teacher_id, profileId, userId)) {
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

      // Certificates and enrollments use the Clerk ID as their canonical
      // student identity; the service also resolves legacy profile IDs.
      const certificates = await certificateService.getStudentCertificates(userId);

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
        .eq('student_id', userId)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      // Get certificate
      const certificate = await certificateService.getStudentCertificate(courseId, userId);

      if (!certificate) {
        // Calculate current grade to show progress
        const scoreData = await certificateService.calculateFinalScore(courseId, userId);
        
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
        .eq('student_id', userId)
        .single();

      if (!enrollment) {
        return res.status(403).json({ error: 'You are not enrolled in this course' });
      }

      // Calculate final score
      const scoreData = await certificateService.calculateFinalScore(courseId, userId);

      if (!scoreData) {
        return res.status(404).json({ error: 'Unable to calculate grade' });
      }

      // Check if has certificate
      const certificate = await certificateService.getStudentCertificate(courseId, userId);

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
