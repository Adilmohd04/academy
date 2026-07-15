/**
 * Certificate Lifecycle routes.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §5, §9.
 *
 * Adds the endpoints the existing `certificates.ts` doesn't cover:
 *   - Approval queue (list / get-revisions / approve / reject)  — Task 16
 *   - Render preview                                            — Task 14.4
 *   - Manual issuance + override                                — Task 20.4
 *   - Public verification (rate-limited)                        — Task 23
 *
 * Mounted at `/api` in app.ts.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import {
  issueCertificate,
  resolveTemplate,
} from '../modules/certificate/services';

const router = express.Router();

const APPROVAL_PAGE_SIZE = 25;
const REJECTION_REASON_MAX = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTeacherProfileId(userId: string | undefined): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();
  return data?.id ?? null;
}

function isOwner(
  ownerTeacherId: string | null | undefined,
  profileId: string | null | undefined,
  clerkUserId: string | null | undefined,
): boolean {
  return !!ownerTeacherId && (ownerTeacherId === profileId || ownerTeacherId === clerkUserId);
}

async function nextRevisionNumber(templateId: string): Promise<number> {
  const { data } = await supabase
    .from('certificate_template_revisions')
    .select('revision_number')
    .eq('template_id', templateId)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.revision_number ?? 0) + 1;
}

// ===========================================================================
// APPROVAL QUEUE (admin) — Task 16
// ===========================================================================

/**
 * GET /api/certificate-templates/approval/queue?page=1&pageSize=25
 * Returns all templates with a pending revision, paginated.
 */
router.get(
  '/certificate-templates/approval/queue',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const pageSize = APPROVAL_PAGE_SIZE;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: revisions, error, count } = await supabase
        .from('certificate_template_revisions')
        .select('*', { count: 'exact' })
        .eq('status', 'pending_approval')
        .order('submitted_at', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Error fetching approval queue:', error);
        return res.status(500).json({ error: 'Failed to fetch approval queue' });
      }

      res.json({
        revisions: revisions ?? [],
        total: count ?? 0,
        page,
        pageSize,
      });
    } catch (err: any) {
      console.error('Error in approval queue:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * GET /api/certificate-templates/:templateId/revisions
 * Returns { current (approved), pending?, history[] } for the diff/compare UI.
 */
router.get(
  '/certificate-templates/:templateId/revisions',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { data: revisions, error } = await supabase
        .from('certificate_template_revisions')
        .select('*')
        .eq('template_id', templateId)
        .order('revision_number', { ascending: false });

      if (error) {
        console.error('Error fetching revisions:', error);
        return res.status(500).json({ error: 'Failed to fetch revisions' });
      }

      const all = revisions ?? [];
      const current = all.find((r: any) => r.status === 'approved') ?? null;
      const pending = all.find((r: any) => r.status === 'pending_approval') ?? null;

      res.json({ current, pending, history: all });
    } catch (err: any) {
      console.error('Error in get revisions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/certificate-templates/:templateId/approve  { revisionId }
 * Flips the pending revision to approved, supersedes prior approved revisions,
 * and copies the new template_data onto the parent row.
 */
router.post(
  '/certificate-templates/:templateId/approve',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { revisionId } = req.body || {};
      const userId = req.auth?.userId;
      const reviewerId = await getTeacherProfileId(userId);

      const { data: revision, error: revErr } = await supabase
        .from('certificate_template_revisions')
        .select('*')
        .eq('id', revisionId)
        .eq('template_id', templateId)
        .eq('status', 'pending_approval')
        .maybeSingle();

      if (revErr || !revision) {
        return res.status(404).json({ error: 'no_pending_revision' });
      }

      const now = new Date().toISOString();

      // Supersede any prior approved revisions for this template.
      await supabase
        .from('certificate_template_revisions')
        .update({ status: 'superseded' })
        .eq('template_id', templateId)
        .eq('status', 'approved');

      // Approve the pending revision.
      const { data: approvedRevision, error: approveErr } = await supabase
        .from('certificate_template_revisions')
        .update({
          status: 'approved',
          reviewed_by: reviewerId,
          reviewed_at: now,
        })
        .eq('id', revisionId)
        .select('*')
        .single();

      if (approveErr) {
        console.error('Error approving revision:', approveErr);
        return res.status(500).json({ error: 'Failed to approve revision' });
      }

      // Copy approved data onto the parent row so issuance reads it directly.
      const { data: updatedTemplate, error: tplErr } = await supabase
        .from('certificate_templates')
        .update({
          template_data: revision.template_data,
          approval_status: 'approved',
          approved_by: reviewerId,
          approved_at: now,
          rejection_reason: null,
          updated_at: now,
        })
        .eq('id', templateId)
        .select('*')
        .single();

      if (tplErr) {
        console.error('Error updating parent template:', tplErr);
        return res.status(500).json({ error: 'Failed to update template' });
      }

      res.json({ template: updatedTemplate, revision: approvedRevision });
    } catch (err: any) {
      console.error('Error in approve:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * POST /api/certificate-templates/:templateId/reject  { revisionId, reason }
 * Flips the pending revision to rejected and stores the reason. The parent
 * row's template_data is unchanged (keeps the previously-approved version).
 */
router.post(
  '/certificate-templates/:templateId/reject',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { revisionId, reason } = req.body || {};
      const userId = req.auth?.userId;
      const reviewerId = await getTeacherProfileId(userId);

      if (typeof reason === 'string' && reason.length > REJECTION_REASON_MAX) {
        return res.status(400).json({ error: 'rejection_reason_too_long' });
      }

      const { data: revision, error: revErr } = await supabase
        .from('certificate_template_revisions')
        .select('*')
        .eq('id', revisionId)
        .eq('template_id', templateId)
        .eq('status', 'pending_approval')
        .maybeSingle();

      if (revErr || !revision) {
        return res.status(404).json({ error: 'no_pending_revision' });
      }

      const now = new Date().toISOString();

      const { data: rejectedRevision, error: rejectErr } = await supabase
        .from('certificate_template_revisions')
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: now,
          rejection_reason: reason || null,
        })
        .eq('id', revisionId)
        .select('*')
        .single();

      if (rejectErr) {
        console.error('Error rejecting revision:', rejectErr);
        return res.status(500).json({ error: 'Failed to reject revision' });
      }

      // Mark the parent rejected so the teacher sees the reason, but DO NOT
      // touch template_data — issuance keeps using the prior approved version.
      const { data: updatedTemplate } = await supabase
        .from('certificate_templates')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason || null,
          updated_at: now,
        })
        .eq('id', templateId)
        .select('*')
        .single();

      res.json({ template: updatedTemplate, revision: rejectedRevision });
    } catch (err: any) {
      console.error('Error in reject:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ===========================================================================
// SUBMIT FOR APPROVAL (teacher) — Task 15.3
// ===========================================================================

/**
 * POST /api/certificate-templates/:templateId/submit  { template_data }
 * Teacher submits an edit. Creates a new pending revision and supersedes any
 * prior pending revision for the same template.
 */
router.post(
  '/certificate-templates/:templateId/submit',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { template_data } = req.body || {};
      const userId = req.auth?.userId;
      const role = req.auth?.role;

      if (!template_data || typeof template_data !== 'object') {
        return res.status(400).json({ error: 'template_data is required' });
      }

      const { data: template, error: tplErr } = await supabase
        .from('certificate_templates')
        .select('id, course_id, allow_teacher_editing')
        .eq('id', templateId)
        .maybeSingle();

      if (tplErr || !template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Teachers must own the course and editing must be enabled.
      if (role === 'teacher') {
        const profileId = await getTeacherProfileId(userId);
        if (!profileId) return res.status(404).json({ error: 'Teacher profile not found' });
        if (!template.course_id) {
          return res.status(403).json({ error: 'forbidden' });
        }
        const { data: course } = await supabase
          .from('courses')
          .select('id, teacher_id')
          .eq('id', template.course_id)
          .maybeSingle();
        if (!course || !isOwner(course.teacher_id, profileId, userId)) {
          return res.status(403).json({ error: 'forbidden' });
        }
        if (template.allow_teacher_editing !== true) {
          return res.status(403).json({ error: 'editing_not_allowed' });
        }
      }

      const submitterId = await getTeacherProfileId(userId);

      // Supersede any prior pending revision.
      await supabase
        .from('certificate_template_revisions')
        .update({ status: 'superseded' })
        .eq('template_id', templateId)
        .eq('status', 'pending_approval');

      const revisionNumber = await nextRevisionNumber(templateId);

      const { data: revision, error: revErr } = await supabase
        .from('certificate_template_revisions')
        .insert({
          template_id: templateId,
          revision_number: revisionNumber,
          template_data,
          status: 'pending_approval',
          submitted_by: submitterId,
          submitted_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (revErr) {
        console.error('Error creating revision:', revErr);
        return res.status(500).json({ error: 'Failed to submit for approval' });
      }

      // Flip the parent's approval_status to pending so the UI reflects it.
      const { data: updatedTemplate } = await supabase
        .from('certificate_templates')
        .update({ approval_status: 'pending_approval', updated_at: new Date().toISOString() })
        .eq('id', templateId)
        .select('*')
        .single();

      res.status(201).json({ template: updatedTemplate, revision });
    } catch (err: any) {
      console.error('Error in submit for approval:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ===========================================================================
// RENDER PREVIEW — Task 14.4
// ===========================================================================

/**
 * POST /api/certificate-templates/:templateId/render-preview
 * Returns the resolved template_data plus mock substitution data so the
 * frontend can render a preview using the shared renderer. We deliberately
 * return JSON (not a server-rendered image) because the canonical renderer
 * lives in the frontend; this keeps a single render path (design §6).
 */
router.post(
  '/certificate-templates/:templateId/render-preview',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { data: template, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();

      if (error || !template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      res.json({
        template,
        mockData: {
          studentName: 'Jane Doe',
          courseTitle: 'Sample Course',
          courseId: 'COURSE-2024-XYZ789',
          certificateTitle: 'Certificate of Completion',
          completionDate: new Date().toISOString(),
          issueDate: new Date().toISOString(),
          instructorName: 'Instructor Name',
          organizationName: 'Your Academy',
          certificateId: 'CERT-2024-A1B2C3',
          verificationCode: 'XXXX-XXXX-XXXX',
          grade: 87.5,
        },
      });
    } catch (err: any) {
      console.error('Error in render-preview:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ===========================================================================
// MANUAL ISSUANCE + OVERRIDE — Task 20.4
// ===========================================================================

/**
 * POST /api/certificate-lifecycle/courses/:courseId/students/:studentId/issue
 * Body: { override?: { reason } }
 *
 * Without override → runs the full eligibility gate (returns 400 + unmet[]).
 * With override + reason → bypasses eligibility, records the override audit.
 */
router.post(
  '/certificate-lifecycle/courses/:courseId/students/:studentId/issue',
  requireAuth,
  requireRole(['teacher', 'admin']),
  async (req: any, res) => {
    try {
      const { courseId, studentId } = req.params;
      const { override } = req.body || {};
      const userId = req.auth?.userId;
      const role = req.auth?.role;

      // Verify access: admins always; teachers must own the course.
      const profileId = await getTeacherProfileId(userId);
      const { data: course } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .maybeSingle();
      if (!course) return res.status(404).json({ error: 'Course not found' });
      if (role !== 'admin' && !isOwner(course.teacher_id, profileId, userId)) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const result = await issueCertificate(courseId, studentId, {
        override: override?.reason
          ? { reason: String(override.reason), by: profileId ?? userId }
          : undefined,
      });

      if (!result.ok) {
        const status = result.error === 'not_eligible' ? 400 : 400;
        return res.status(status).json({ error: result.error, unmet: result.unmet });
      }

      res.status(result.alreadyIssued ? 200 : 201).json({
        certificate: result.certificate,
        alreadyIssued: result.alreadyIssued,
      });
    } catch (err: any) {
      console.error('Error in manual issuance:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
