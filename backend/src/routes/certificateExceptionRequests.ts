/**
 * Certificate exception request workflow.
 *
 * Teachers cannot bypass certificate eligibility directly. Instead, a course
 * owner records a reasoned request; an administrator reviews it and, only on
 * approval, calls the canonical certificate issuance service with a durable
 * manual-override audit trail.
 *
 * Mounted at /api. Every endpoint below is protected by Clerk auth + role
 * checks; deliberately do not add any route here to the public verification
 * surface.
 */

import express from 'express';
import { requireAuth, requireRole } from '../middleware/clerkAuth';
import { supabase } from '../config/database';
import { issueCertificate } from '../modules/certificate/services';
import {
  findCertificateEnrollment,
  resolveCertificateStudentIdentity,
} from '../modules/certificate/services/studentIdentity';

const router = express.Router();

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_REASON_LENGTH = 2000;
const APPROVAL_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const REQUEST_STATUSES = ['pending', 'processing', 'approved', 'rejected'] as const;
const REQUEST_STATUS_FILTERS = [...REQUEST_STATUSES, 'all'] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RequestStatus = (typeof REQUEST_STATUSES)[number];
type RequestStatusFilter = (typeof REQUEST_STATUS_FILTERS)[number];

interface OperatorProfile {
  id: string;
}

const isCourseOwner = (
  courseTeacherId: string | null | undefined,
  profileId: string,
  clerkUserId: string | undefined,
): boolean => Boolean(courseTeacherId && (courseTeacherId === profileId || courseTeacherId === clerkUserId));

function normalizeRequiredReason(value: unknown, fieldName: string): { value?: string; error?: string } {
  if (typeof value !== 'string') {
    return { error: `${fieldName} is required` };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { error: `${fieldName} is required` };
  }
  if (normalized.length > MAX_REASON_LENGTH) {
    return { error: `${fieldName} must be ${MAX_REASON_LENGTH} characters or fewer` };
  }

  return { value: normalized };
}

function parsePage(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseStatus(value: unknown): RequestStatusFilter | null {
  if (typeof value !== 'string' || !REQUEST_STATUS_FILTERS.includes(value as RequestStatusFilter)) {
    return null;
  }
  return value as RequestStatusFilter;
}

function isStaleProcessingRequest(request: any): boolean {
  if (request?.status !== 'processing') return false;
  const attemptAt = Date.parse(String(request.last_attempt_at ?? ''));
  return !Number.isFinite(attemptAt) || Date.now() - attemptAt >= APPROVAL_PROCESSING_TIMEOUT_MS;
}

async function getOperatorProfile(userId: string | undefined): Promise<OperatorProfile | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[certificate-exception] failed to resolve operator profile:', error);
    return null;
  }

  return data?.id ? { id: data.id } : null;
}

async function getCourse(courseId: string): Promise<{ id: string; teacher_id: string | null } | null> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', courseId)
    .maybeSingle();

  if (error) {
    console.error('[certificate-exception] failed to load course:', error);
    return null;
  }

  return data as { id: string; teacher_id: string | null } | null;
}

/**
 * Re-validate both identity and enrollment at the moment an exception is
 * created or approved. An approved override changes eligibility only; it must
 * never allow issuing a credential to a deleted/non-student identity.
 */
async function ensureStudentIsEnrolled(
  courseId: string,
  studentId: string,
): Promise<'enrolled' | 'student_not_found' | 'not_enrolled' | 'error'> {
  const identity = await resolveCertificateStudentIdentity(studentId);
  if (!identity) return 'student_not_found';

  const enrollment = await findCertificateEnrollment(courseId, identity);
  if (enrollment.status === 'error') return 'error';
  return enrollment.status === 'found' ? 'enrolled' : 'not_enrolled';
}

async function returnApprovalToPending(requestId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('certificate_exception_requests')
    .update({
      status: 'pending',
      last_error: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'processing');

  if (error) {
    console.error('[certificate-exception] failed to release approval claim:', error);
  }
}

function toRequestResponse(request: any, labels: Record<string, string | undefined> = {}) {
  return {
    id: request.id,
    courseId: request.course_id,
    studentId: request.student_id,
    requestedBy: request.requested_by,
    reason: request.reason,
    status: request.status,
    requestedAt: request.requested_at,
    reviewedBy: request.reviewed_by,
    reviewedAt: request.reviewed_at,
    rejectionReason: request.rejection_reason,
    certificateId: request.certificate_id,
    issuedAt: request.issued_at,
    approvalAttempts: request.approval_attempts,
    lastAttemptAt: request.last_attempt_at,
    lastError: request.last_error,
    updatedAt: request.updated_at,
    courseTitle: labels.courseTitle,
    studentName: labels.studentName,
    studentEmail: labels.studentEmail,
    teacherName: labels.teacherName,
    teacherEmail: labels.teacherEmail,
  };
}

const profileName = (profile: any): string | undefined => profile?.full_name || profile?.email || undefined;

/**
 * Request rows intentionally store stable identifiers, not a snapshot of
 * personal data. Hydrate only the names needed by the authenticated portal
 * response so the UI stays understandable without duplicating student data.
 */
async function toRequestResponses(requests: any[]) {
  if (requests.length === 0) return [];

  const courseIds = [...new Set(requests.map((request) => request.course_id).filter(Boolean))];
  const profileIdentifiers = [...new Set(
    requests.flatMap((request) => [request.student_id, request.requested_by]).filter(Boolean),
  )];
  const profileIds = profileIdentifiers.filter((id) => UUID_PATTERN.test(String(id)));

  const [courseResult, profileIdResult, clerkProfileResult] = await Promise.all([
    courseIds.length > 0
      ? supabase.from('courses').select('id, title').in('id', courseIds)
      : Promise.resolve({ data: [] as any[] }),
    profileIds.length > 0
      ? supabase.from('profiles').select('id, clerk_user_id, full_name, email').in('id', profileIds)
      : Promise.resolve({ data: [] as any[] }),
    profileIdentifiers.length > 0
      ? supabase.from('profiles').select('id, clerk_user_id, full_name, email').in('clerk_user_id', profileIdentifiers)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const courseById = new Map((courseResult.data || []).map((course: any) => [course.id, course]));
  const profileByIdentifier = new Map<string, any>();
  for (const profile of [...(profileIdResult.data || []), ...(clerkProfileResult.data || [])]) {
    profileByIdentifier.set(profile.id, profile);
    if (profile.clerk_user_id) profileByIdentifier.set(profile.clerk_user_id, profile);
  }

  return requests.map((request) => {
    const student = profileByIdentifier.get(request.student_id);
    const teacher = profileByIdentifier.get(request.requested_by);
    return toRequestResponse(request, {
      courseTitle: courseById.get(request.course_id)?.title,
      studentName: profileName(student),
      studentEmail: student?.email,
      teacherName: profileName(teacher),
      teacherEmail: teacher?.email,
    });
  });
}

// ---------------------------------------------------------------------------
// Teacher endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/teacher/courses/:courseId/students/:studentId/certificate-exception-requests
 * Body: { reason: string }
 */
router.post(
  '/teacher/courses/:courseId/students/:studentId/certificate-exception-requests',
  requireAuth,
  requireRole(['teacher']),
  async (req: any, res) => {
    try {
      const { courseId, studentId } = req.params;
      const reason = normalizeRequiredReason(req.body?.reason, 'reason');
      if (reason.error || !reason.value) {
        return res.status(400).json({ error: 'invalid_request', message: reason.error });
      }

      const operator = await getOperatorProfile(req.auth?.userId);
      if (!operator) {
        return res.status(404).json({ error: 'teacher_profile_not_found', message: 'Teacher profile not found.' });
      }

      const course = await getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: 'course_not_found', message: 'Course not found.' });
      }

      if (!isCourseOwner(course.teacher_id, operator.id, req.auth?.userId)) {
        return res.status(403).json({ error: 'forbidden', message: 'Only the course owner can request a certificate exception.' });
      }

      const enrollmentState = await ensureStudentIsEnrolled(courseId, studentId);
      if (enrollmentState === 'error') {
        return res.status(500).json({ error: 'enrollment_check_failed', message: 'Could not verify the student enrollment.' });
      }
      if (enrollmentState === 'student_not_found') {
        return res.status(404).json({ error: 'student_not_found', message: 'The student account no longer exists.' });
      }
      if (enrollmentState === 'not_enrolled') {
        return res.status(404).json({ error: 'student_not_enrolled', message: 'The student is not enrolled in this course.' });
      }

      const { data: existingCertificate, error: existingCertificateError } = await supabase
        .from('certificates')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        // Revoked/reissued history can contain several rows. Any historical
        // credential means this must use the explicit reissue workflow, not
        // create a fresh exception request.
        .limit(1)
        .maybeSingle();

      if (existingCertificateError) {
        console.error('[certificate-exception] failed to check existing certificate:', existingCertificateError);
        return res.status(500).json({ error: 'certificate_check_failed', message: 'Could not check existing certificates.' });
      }
      if (existingCertificate) {
        return res.status(409).json({ error: 'certificate_already_exists', message: 'This student already has a certificate for this course.' });
      }

      const { data: existingRequest, error: existingRequestError } = await supabase
        .from('certificate_exception_requests')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequestError) {
        console.error('[certificate-exception] failed to check pending request:', existingRequestError);
        return res.status(500).json({ error: 'request_check_failed', message: 'Could not check existing exception requests.' });
      }
      if (existingRequest) {
        return res.status(200).json({
          message: 'An exception request for this student is already awaiting review.',
          request: toRequestResponse(existingRequest),
          alreadyPending: true,
        });
      }

      const now = new Date().toISOString();
      const { data: created, error: createError } = await supabase
        .from('certificate_exception_requests')
        .insert({
          course_id: courseId,
          student_id: studentId,
          requested_by: operator.id,
          reason: reason.value,
          status: 'pending',
          requested_at: now,
          updated_at: now,
        })
        .select('*')
        .single();

      if (createError || !created) {
        // The partial unique index is the final concurrency guard. Re-read so
        // a duplicate click still has a useful idempotent response.
        if ((createError as any)?.code === '23505') {
          const { data: racedRequest } = await supabase
            .from('certificate_exception_requests')
            .select('*')
            .eq('course_id', courseId)
            .eq('student_id', studentId)
            .eq('status', 'pending')
            .maybeSingle();
          if (racedRequest) {
            return res.status(200).json({
              message: 'An exception request for this student is already awaiting review.',
              request: toRequestResponse(racedRequest),
              alreadyPending: true,
            });
          }
        }

        console.error('[certificate-exception] failed to create request:', createError);
        return res.status(500).json({ error: 'request_create_failed', message: 'Could not create the exception request.' });
      }

      return res.status(201).json({
        message: 'Certificate exception request submitted for administrator review.',
        request: toRequestResponse(created),
      });
    } catch (error) {
      console.error('[certificate-exception] create request failed:', error);
      return res.status(500).json({ error: 'internal_error', message: 'Could not create the exception request.' });
    }
  },
);

/**
 * GET /api/teacher/certificate-exception-requests?status=pending&page=1&pageSize=25
 * Teachers can see only requests they submitted, including the eventual
 * approval/rejection reason; this makes the review workflow visible to them.
 */
router.get(
  '/teacher/certificate-exception-requests',
  requireAuth,
  requireRole(['teacher']),
  async (req: any, res) => {
    try {
      const operator = await getOperatorProfile(req.auth?.userId);
      if (!operator) {
        return res.status(404).json({ error: 'teacher_profile_not_found', message: 'Teacher profile not found.' });
      }

      const rawStatus = req.query.status ?? 'pending';
      const status = parseStatus(rawStatus);
      if (!status) {
        return res.status(400).json({ error: 'invalid_status', message: 'status must be pending, processing, approved, rejected, or all.' });
      }

      const page = parsePage(req.query.page, 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, parsePage(req.query.pageSize, DEFAULT_PAGE_SIZE));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const requestQuery = supabase
        .from('certificate_exception_requests')
        .select('*', { count: 'exact' })
        .eq('requested_by', operator.id)

      const filteredQuery = status === 'all'
        ? requestQuery
        : requestQuery.eq('status', status);

      const { data, error, count } = await filteredQuery
        .order('requested_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[certificate-exception] failed to list teacher requests:', error);
        return res.status(500).json({ error: 'request_list_failed', message: 'Could not load exception requests.' });
      }

      return res.json({
        requests: await toRequestResponses(data ?? []),
        total: count ?? 0,
        page,
        pageSize,
        status,
      });
    } catch (error) {
      console.error('[certificate-exception] list teacher requests failed:', error);
      return res.status(500).json({ error: 'internal_error', message: 'Could not load exception requests.' });
    }
  },
);

// ---------------------------------------------------------------------------
// Administrator endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/certificate-exception-requests?status=pending&page=1&pageSize=25
 * Defaults to the queue the administrator needs to act on.
 */
router.get(
  '/admin/certificate-exception-requests',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const rawStatus = req.query.status ?? 'pending';
      const status = parseStatus(rawStatus);
      if (!status) {
        return res.status(400).json({ error: 'invalid_status', message: 'status must be pending, processing, approved, rejected, or all.' });
      }

      const page = parsePage(req.query.page, 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, parsePage(req.query.pageSize, DEFAULT_PAGE_SIZE));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const requestQuery = supabase
        .from('certificate_exception_requests')
        .select('*', { count: 'exact' })

      const filteredQuery = status === 'all'
        ? requestQuery
        : requestQuery.eq('status', status);

      const { data, error, count } = await filteredQuery
        .order('requested_at', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('[certificate-exception] failed to list admin requests:', error);
        return res.status(500).json({ error: 'request_list_failed', message: 'Could not load exception requests.' });
      }

      return res.json({
        requests: await toRequestResponses(data ?? []),
        total: count ?? 0,
        page,
        pageSize,
        status,
      });
    } catch (error) {
      console.error('[certificate-exception] list admin requests failed:', error);
      return res.status(500).json({ error: 'internal_error', message: 'Could not load exception requests.' });
    }
  },
);

/**
 * POST /api/admin/certificate-exception-requests/:requestId/approve
 *
 * Issuance happens through the canonical service rather than a local insert,
 * ensuring the eligibility override, QR credential, verification URL, and
 * certificate audit fields all remain consistent with normal issuance.
 */
router.post(
  '/admin/certificate-exception-requests/:requestId/approve',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const operator = await getOperatorProfile(req.auth?.userId);
      if (!operator) {
        return res.status(404).json({ error: 'admin_profile_not_found', message: 'Administrator profile not found.' });
      }

      const { requestId } = req.params;
      const { data: request, error: requestError } = await supabase
        .from('certificate_exception_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (requestError) {
        console.error('[certificate-exception] failed to load approval request:', requestError);
        return res.status(500).json({ error: 'request_load_failed', message: 'Could not load the exception request.' });
      }
      if (!request) {
        return res.status(404).json({ error: 'request_not_found', message: 'Certificate exception request not found.' });
      }
      if (request.status === 'approved') {
        return res.status(200).json({
          message: 'This certificate exception request has already been approved.',
          request: toRequestResponse(request),
          alreadyApproved: true,
        });
      }
      if (request.status === 'rejected') {
        return res.status(409).json({
          error: 'request_not_pending',
          message: 'Only a pending certificate exception request can be approved.',
          request: toRequestResponse(request),
        });
      }

      const attemptAt = new Date().toISOString();
      const canRetryStaleProcessing = isStaleProcessingRequest(request);
      if (request.status !== 'pending' && !canRetryStaleProcessing) {
        return res.status(409).json({
          error: 'approval_in_progress',
          message: 'Another administrator is currently approving this request. Try again shortly.',
          request: toRequestResponse(request),
        });
      }

      // Transition to an explicit processing state before issuance. Rejects
      // only operate on pending requests, so an administrator cannot reject a
      // request while the canonical issuer is creating its certificate.
      let claimQuery = supabase
        .from('certificate_exception_requests')
        .update({
          status: 'processing',
          approval_attempts: Number(request.approval_attempts ?? 0) + 1,
          last_attempt_at: attemptAt,
          last_error: null,
          updated_at: attemptAt,
        })
        .eq('id', requestId);

      if (request.status === 'pending') {
        claimQuery = claimQuery.eq('status', 'pending');
      } else if (request.last_attempt_at) {
        claimQuery = claimQuery
          .eq('status', 'processing')
          .lt('last_attempt_at', new Date(Date.now() - APPROVAL_PROCESSING_TIMEOUT_MS).toISOString());
      } else {
        // A partially written legacy row should not become impossible to
        // recover. It is safe to claim because the status remains processing.
        claimQuery = claimQuery.eq('status', 'processing').is('last_attempt_at', null);
      }

      const { data: claimedRequest, error: attemptError } = await claimQuery
        .select('*')
        .maybeSingle();

      if (attemptError) {
        console.error('[certificate-exception] failed to record approval attempt:', attemptError);
        return res.status(500).json({ error: 'approval_attempt_failed', message: 'Could not begin approval.' });
      }
      if (!claimedRequest) {
        const { data: latest } = await supabase
          .from('certificate_exception_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();
        return res.status(409).json({
          error: 'request_state_changed',
          message: 'The request changed while it was being approved. Reload it before trying again.',
          request: latest ? toRequestResponse(latest) : undefined,
        });
      }

      // The request may have been submitted hours or days ago. Re-check the
      // subject immediately before applying an administrative eligibility
      // override so a deleted or unenrolled student cannot receive a new
      // certificate from a stale queue record.
      const enrollmentState = await ensureStudentIsEnrolled(
        claimedRequest.course_id,
        claimedRequest.student_id,
      );
      if (enrollmentState !== 'enrolled') {
        const failure = enrollmentState === 'student_not_found'
          ? 'student_not_found'
          : enrollmentState === 'not_enrolled'
            ? 'student_not_enrolled'
            : 'student_enrollment_check_failed';
        await returnApprovalToPending(requestId, failure);

        if (enrollmentState === 'error') {
          return res.status(500).json({
            error: failure,
            message: 'Could not verify the student before issuing the certificate. The request remains pending.',
          });
        }

        return res.status(409).json({
          error: failure,
          message: enrollmentState === 'student_not_found'
            ? 'The student account no longer exists. The request remains pending for review.'
            : 'The student is no longer enrolled in this course. The request remains pending for review.',
        });
      }

      const issuance = await issueCertificate(claimedRequest.course_id, claimedRequest.student_id, {
        override: { reason: claimedRequest.reason, by: operator.id },
      });

      if (issuance.ok === false) {
        const { error: failureAuditError } = await supabase
          .from('certificate_exception_requests')
          .update({
            status: 'pending',
            last_error: issuance.error,
            updated_at: new Date().toISOString(),
          })
          .eq('id', requestId)
          .eq('status', 'processing');

        if (failureAuditError) {
          console.error('[certificate-exception] failed to record issuance failure:', failureAuditError);
        }

        return res.status(400).json({
          error: issuance.error,
          message: 'The certificate could not be issued. The request remains pending for retry.',
          unmet: issuance.unmet,
        });
      }

      const reviewedAt = new Date().toISOString();
      const { data: approved, error: approvalError } = await supabase
        .from('certificate_exception_requests')
        .update({
          status: 'approved',
          reviewed_by: operator.id,
          reviewed_at: reviewedAt,
          certificate_id: issuance.certificate.id,
          issued_at: issuance.certificate.issued_at ?? reviewedAt,
          last_error: null,
          updated_at: reviewedAt,
        })
        .eq('id', requestId)
        .eq('status', 'processing')
        .select('*')
        .maybeSingle();

      if (approvalError) {
        console.error('[certificate-exception] failed to finalize approval:', approvalError);
        return res.status(500).json({
          error: 'approval_finalize_failed',
          message: 'Certificate was issued, but the request audit could not be finalized. Retry safely to reconcile it.',
        });
      }

      if (!approved) {
        // A concurrent admin action won the state transition. The issuance
        // service is idempotent, so no duplicate certificate was created.
        const { data: latest } = await supabase
          .from('certificate_exception_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();

        if (latest?.status === 'approved') {
          return res.status(200).json({
            message: 'This certificate exception request was approved by another administrator.',
            request: toRequestResponse(latest),
            certificate: issuance.certificate,
            alreadyApproved: true,
          });
        }

        return res.status(409).json({
          error: 'request_state_changed',
          message: 'The request changed while it was being approved. The certificate issuance is idempotent; reload the request before taking another action.',
        });
      }

      return res.status(200).json({
        message: 'Certificate exception request approved and certificate issued.',
        request: toRequestResponse(approved),
        certificate: issuance.certificate,
        alreadyIssued: issuance.alreadyIssued,
      });
    } catch (error) {
      console.error('[certificate-exception] approve request failed:', error);
      return res.status(500).json({ error: 'internal_error', message: 'Could not approve the exception request.' });
    }
  },
);

/**
 * POST /api/admin/certificate-exception-requests/:requestId/reject
 * Body: { reason: string }
 */
router.post(
  '/admin/certificate-exception-requests/:requestId/reject',
  requireAuth,
  requireRole(['admin']),
  async (req: any, res) => {
    try {
      const rejectionReason = normalizeRequiredReason(req.body?.reason, 'reason');
      if (rejectionReason.error || !rejectionReason.value) {
        return res.status(400).json({ error: 'invalid_request', message: rejectionReason.error });
      }

      const operator = await getOperatorProfile(req.auth?.userId);
      if (!operator) {
        return res.status(404).json({ error: 'admin_profile_not_found', message: 'Administrator profile not found.' });
      }

      const now = new Date().toISOString();
      const { data: rejected, error } = await supabase
        .from('certificate_exception_requests')
        .update({
          status: 'rejected',
          reviewed_by: operator.id,
          reviewed_at: now,
          rejection_reason: rejectionReason.value,
          updated_at: now,
        })
        .eq('id', req.params.requestId)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[certificate-exception] failed to reject request:', error);
        return res.status(500).json({ error: 'request_reject_failed', message: 'Could not reject the exception request.' });
      }
      if (rejected) {
        return res.status(200).json({
          message: 'Certificate exception request rejected.',
          request: toRequestResponse(rejected),
        });
      }

      const { data: current, error: currentError } = await supabase
        .from('certificate_exception_requests')
        .select('*')
        .eq('id', req.params.requestId)
        .maybeSingle();

      if (currentError) {
        console.error('[certificate-exception] failed to load request after rejection race:', currentError);
        return res.status(500).json({ error: 'request_load_failed', message: 'Could not load the exception request.' });
      }
      if (!current) {
        return res.status(404).json({ error: 'request_not_found', message: 'Certificate exception request not found.' });
      }
      if (current.status === 'rejected') {
        return res.status(200).json({
          message: 'This certificate exception request has already been rejected.',
          request: toRequestResponse(current),
          alreadyRejected: true,
        });
      }

      return res.status(409).json({
        error: 'request_not_pending',
        message: 'Only a pending certificate exception request can be rejected.',
        request: toRequestResponse(current),
      });
    } catch (error) {
      console.error('[certificate-exception] reject request failed:', error);
      return res.status(500).json({ error: 'internal_error', message: 'Could not reject the exception request.' });
    }
  },
);

export default router;
