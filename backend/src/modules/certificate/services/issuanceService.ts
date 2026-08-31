/**
 * Issuance service.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §8, Property 10.
 *
 * Orchestrates the full issuance pipeline:
 *
 *   1. Eligibility check (skipped when manual override is set, but `override.reason`
 *      is required).
 *   2. Compute final score breakdown via `calculate_student_final_score`.
 *   3. Resolve the template (course-scoped approved → global default → fail).
 *   4. Deep-clone the resolved template into `template_snapshot` so the
 *      certificate is independent of any future template edits (Property 8).
 *   5. Generate `certificate_number` (via the existing DB function) and a
 *      `verification_code` (≥60-bit CSPRNG) with collision retry.
 *   6. Insert the `certificates` row with all required fields (Property 10).
 *   7. Render and store a QR-bearing PDF artifact best-effort. A rendering
 *      outage never invalidates the just-issued verification credential.
 *
 * Idempotence: the active-certificate partial unique index allows exactly one
 * live credential per course/student. A revoked row stays in history and can
 * be replaced only through the explicit reissue path.
 */

import { supabase } from '../../../config/database';
import { isEligibleForCertificateDetailed, EligibilityResult } from './eligibilityService';
import { resolveTemplate } from './templateResolutionService';
import { calculateFinalScore } from './certificateService';
import {
  removeCertificatePdfArtifacts,
  renderAndStoreCertificatePdf,
} from './certificatePdfService';
import { generateVerificationCode, verificationUrlForCode } from './verificationCode';
import { generateVerificationQrDataUrl } from './verificationQr';
import {
  findCertificateEnrollment,
  resolveCertificateStudentIdentity,
} from './studentIdentity';

const MAX_CODE_RETRIES = 10;
// A collision is extraordinarily unlikely with the 60-bit code, but the
// database remains the final authority. Retrying the whole insert makes the
// lifecycle reliable when another issuer wins the tiny race between the
// pre-check and INSERT.
const MAX_INSERT_RETRIES = 3;

export interface IssueOptions {
  /** When set, skips eligibility checks. `reason` is required and persisted. */
  override?: { reason: string; by: string };
}

export type IssueResult =
  | { ok: true; certificate: any; alreadyIssued: boolean }
  | { ok: false; error: string; unmet?: string[] };

export type RegenerateVerificationResult =
  | { ok: true; certificate: any }
  | { ok: false; error: string };

export type ReissueCertificateResult =
  | { ok: true; certificate: any; alreadyIssued: boolean }
  | { ok: false; error: string; unmet?: string[] };

const ACTIVE_CERTIFICATE_STATUSES = new Set(['active', 'awarded', 'issued']);

const certificateStatus = (certificate: any): string =>
  String(certificate?.status || '').trim().toLowerCase();

function numberOr(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type VerificationCodeReservation =
  | { ok: true; code: string }
  | { ok: false; error: 'verification_code_collision' | 'verification_code_lookup_failed' };

/**
 * Pick a currently-unused public code before rendering a QR image. The unique
 * database index is still the authoritative guard, but surfacing lookup
 * failures instead of treating them as "no collision" avoids issuing against
 * an unhealthy database connection.
 */
async function reserveVerificationCode(previousCode?: string | null): Promise<VerificationCodeReservation> {
  const previous = String(previousCode || '').trim().toUpperCase();

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const candidate = generateVerificationCode();
    // Regeneration must be a real rotation, not a no-op even in the extremely
    // unlikely event that the CSPRNG returns the old code again.
    if (previous && candidate === previous) continue;

    const { data: collision, error } = await supabase
      .from('certificates')
      .select('id')
      .eq('verification_code', candidate)
      .maybeSingle();

    if (error) {
      console.error('[issuance] failed to check verification-code availability:', error);
      return { ok: false, error: 'verification_code_lookup_failed' };
    }
    if (!collision) return { ok: true, code: candidate };
  }

  return { ok: false, error: 'verification_code_collision' };
}

async function generateCertificateNumber(): Promise<string | null> {
  const { data, error } = await supabase.rpc('generate_certificate_number');
  if (error || !data) {
    console.error('[issuance] certificate number generation failed:', error);
    return null;
  }
  return String(data);
}

/**
 * PDF rendering is intentionally post-issuance and best-effort. A storage or
 * Chromium outage must never make a valid verification credential disappear;
 * the record already contains the QR data URL and public verification code.
 */
async function attachCertificatePdfArtifact(certificate: any, operation: string): Promise<any> {
  try {
    const pdfUrl = await renderAndStoreCertificatePdf(certificate.id);
    return { ...certificate, pdf_url: pdfUrl };
  } catch (error) {
    console.error(`[issuance] ${operation} PDF render failed for certificate=${certificate?.id}:`, error);
    return certificate;
  }
}

async function removeSupersededCertificatePdfArtifact(
  certificateId: string,
  verificationCode?: string | null,
): Promise<void> {
  try {
    await removeCertificatePdfArtifacts(certificateId, verificationCode);
  } catch (error) {
    console.warn(`[issuance] could not remove superseded PDF for certificate=${certificateId}:`, error);
  }
}

export async function issueCertificate(
  courseId: string,
  studentId: string,
  opts: IssueOptions = {},
): Promise<IssueResult> {
  const studentIdentity = await resolveCertificateStudentIdentity(studentId);
  if (!studentIdentity) {
    return { ok: false, error: 'student_identity_not_found' };
  }
  // Certificates are intentionally keyed by the Clerk ID so the student
  // portal and enrollment records have one stable, public-facing identity.
  const certificateStudentId = studentIdentity.clerkUserId;

  // An override may waive achievement gates, never identity or course
  // membership. This prevents a privileged route from minting a credential
  // for an arbitrary identifier.
  const enrollmentLookup = await findCertificateEnrollment(courseId, studentIdentity);
  if (enrollmentLookup.status === 'error') {
    return { ok: false, error: 'enrollment_check_failed' };
  }
  if (enrollmentLookup.status === 'missing') {
    return { ok: false, error: 'student_not_enrolled' };
  }

  // ── Idempotence: short-circuit when a certificate already exists ──────
  const { data: certificateHistory, error: historyError } = await supabase
    .from('certificates')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', certificateStudentId)
    .order('issued_at', { ascending: false });

  if (historyError) {
    console.error('[issuance] failed to load certificate history:', historyError);
    return { ok: false, error: 'certificate_history_unavailable' };
  }

  const activeCertificate = (certificateHistory ?? []).find((certificate: any) =>
    ACTIVE_CERTIFICATE_STATUSES.has(certificateStatus(certificate)),
  );
  if (activeCertificate) {
    return {
      ok: true,
      certificate: activeCertificate.pdf_url
        ? activeCertificate
        : await attachCertificatePdfArtifact(activeCertificate, 'idempotent issuance'),
      alreadyIssued: true,
    };
  }

  const revokedCertificate = (certificateHistory ?? []).find(
    (certificate: any) => certificateStatus(certificate) === 'revoked',
  );
  if (revokedCertificate) {
    return { ok: false, error: 'certificate_revoked_reissue_required' };
  }

  // ── Eligibility (skipped under override with reason) ──────────────────
  let eligibility: EligibilityResult | null = null;
  if (opts.override) {
    if (!opts.override.reason || !opts.override.reason.trim()) {
      return { ok: false, error: 'override_reason_required' };
    }
  } else {
    eligibility = await isEligibleForCertificateDetailed(courseId, certificateStudentId);
    if (!eligibility.eligible) {
      return { ok: false, error: 'not_eligible', unmet: eligibility.unmet };
    }
  }

  // ── Score breakdown for grade_breakdown column ─────────────────────────
  const score = await calculateFinalScore(courseId, certificateStudentId);
  if (!score) {
    return { ok: false, error: 'final_score_unavailable' };
  }

  // ── Resolve the student's display name + course title for the NOT NULL
  //    columns on the live certificates table (student_name, total_marks,
  //    percentage). student_id is stored as TEXT (clerk id) here. We look up
  //    the profile by both clerk_user_id and id to be robust to either form.
  let studentName = 'Student';
  let courseTitle = 'Course';
  try {
    const [{ data: byClerk }, { data: byId }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('clerk_user_id', certificateStudentId).maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', studentIdentity.profileId).maybeSingle(),
    ]);
    studentName = byClerk?.full_name || byId?.full_name || 'Student';

    const { data: courseRow } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .maybeSingle();
    courseTitle = courseRow?.title || 'Course';
  } catch (err) {
    console.warn('[issuance] could not resolve student/course names:', err);
  }

  // ── Template resolution + snapshot ─────────────────────────────────────
  const resolved = await resolveTemplate(courseId);
  if (!resolved) {
    return { ok: false, error: 'no_certificate_template_available' };
  }
  // structuredClone on Node 17+; fallback to JSON deep-clone otherwise.
  const templateSnapshot =
    typeof structuredClone === 'function'
      ? structuredClone(resolved.template_data)
      : JSON.parse(JSON.stringify(resolved.template_data));

  // ── Certificate number (DB function — guaranteed unique) ───────────────
  // ── Verification code with collision retry ─────────────────────────────
  // ── Insert certificate row ─────────────────────────────────────────────
  // NOTE: the live `certificates` table requires student_name, total_marks,
  // and percentage (all NOT NULL), and stores student_id as TEXT (clerk id).
  const now = new Date().toISOString();
  const finalScore = Number(score.final_score);
  const highestRevision = Math.max(
    0,
    ...(certificateHistory ?? []).map((certificate: any) =>
      Number.isFinite(Number(certificate.revision_number))
        ? Number(certificate.revision_number)
        : 0,
    ),
  );
  const baseInsertPayload: Record<string, unknown> = {
    course_id: courseId,
    student_id: certificateStudentId,
    student_name: studentName,
    course_name_cached: courseTitle,
    final_score: finalScore,
    percentage: finalScore,
    total_marks: Math.round(finalScore),
    grade_breakdown: {
      quiz_average: Number(score.quiz_average),
      assignment_average: Number(score.assignment_average),
      final_exam_score: Number(score.final_exam_score),
    },
    status: 'awarded',
    revision_number: highestRevision + 1,
    issued_at: now,
    completion_date: now,
    template_snapshot: templateSnapshot,
  };

  if (opts.override) {
    baseInsertPayload.is_manual_override = true;
    baseInsertPayload.override_by = opts.override.by;
    baseInsertPayload.override_reason = opts.override.reason;
  }

  for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
    const certificateNumber = await generateCertificateNumber();
    if (!certificateNumber) return { ok: false, error: 'certificate_number_generation_failed' };

    const reservation = await reserveVerificationCode();
    if (reservation.ok === false) return { ok: false, error: reservation.error };

    let qrCodeUrl: string;
    try {
      qrCodeUrl = await generateVerificationQrDataUrl(verificationUrlForCode(reservation.code));
    } catch (error) {
      console.error('[issuance] QR generation failed:', error);
      return { ok: false, error: 'verification_qr_generation_failed' };
    }

    const { data: created, error: insertError } = await supabase
      .from('certificates')
      .insert({
        ...baseInsertPayload,
        certificate_number: certificateNumber,
        verification_code: reservation.code,
        qr_code_url: qrCodeUrl,
      })
      .select('*')
      .single();

    if (!insertError && created) {
      return {
        ok: true,
        certificate: await attachCertificatePdfArtifact(created, 'issuance'),
        alreadyIssued: false,
      };
    }

    if ((insertError as any)?.code !== '23505') {
      console.error('[issuance] insert failed:', insertError);
      return { ok: false, error: 'certificate_insert_failed' };
    }

    // A concurrent issuer for the same student/course is idempotent. If no
    // winner exists, retry with a completely new certificate number and QR.
    const { data: race, error: raceError } = await supabase
      .from('certificates')
      .select('*')
      .eq('course_id', courseId)
      .eq('student_id', certificateStudentId)
      .in('status', [...ACTIVE_CERTIFICATE_STATUSES])
      .maybeSingle();
    if (race) return { ok: true, certificate: race, alreadyIssued: true };
    if (raceError) {
      console.error('[issuance] failed to resolve issuance race:', raceError);
      return { ok: false, error: 'certificate_insert_failed' };
    }
  }

  return { ok: false, error: 'certificate_insert_collision' };
}

/**
 * Periodic-backstop helper: try to issue, swallow any "not_eligible" since
 * this is the periodic path. Logs other errors so the operator can see them
 * in the cron logs.
 */
export async function checkAndAwardCertificate(
  courseId: string,
  studentId: string,
): Promise<IssueResult> {
  const result = await issueCertificate(courseId, studentId);
  if (result.ok === false && result.error !== 'not_eligible') {
    console.warn(
      `[issuance] non-eligibility failure for course=${courseId} student=${studentId}: ${result.error}`,
    );
  }
  return result;
}

/**
 * Create a new certificate revision for a revoked credential. The revoked row
 * remains publicly verifiable as revoked; this creates a new certificate
 * number and QR code linked to that history.
 */
export async function reissueRevokedCertificate(
  certificateId: string,
  reissue: { reason: string; by: string },
): Promise<ReissueCertificateResult> {
  const normalizedReason = reissue.reason.trim();
  if (!normalizedReason) {
    return { ok: false, error: 'reissue_reason_required' };
  }
  if (!reissue.by?.trim()) {
    return { ok: false, error: 'reissue_actor_required' };
  }

  // A replacement represents the same historical achievement. It must not
  // depend on the student's *current* enrollment, final score, or template:
  // those records can change or be archived long after the credential was
  // originally awarded. Copy the revoked certificate's immutable snapshot and
  // only rotate its public identity (number, code, QR, and PDF artifact).
  const { data: revokedCertificate, error: revokedError } = await supabase
    .from('certificates')
    .select('*')
    .eq('id', certificateId)
    .maybeSingle();

  if (revokedError || !revokedCertificate) {
    return { ok: false, error: 'certificate_not_found' };
  }
  if (certificateStatus(revokedCertificate) !== 'revoked') {
    return { ok: false, error: 'certificate_not_revoked' };
  }

  const { data: history, error: historyError } = await supabase
    .from('certificates')
    .select('*')
    .eq('course_id', revokedCertificate.course_id)
    .eq('student_id', revokedCertificate.student_id)
    .order('issued_at', { ascending: false });

  if (historyError) {
    console.error('[issuance] failed to load certificate history for reissue:', historyError);
    return { ok: false, error: 'certificate_history_unavailable' };
  }

  const activeCertificate = (history ?? []).find((certificate: any) =>
    ACTIVE_CERTIFICATE_STATUSES.has(certificateStatus(certificate)),
  );
  if (activeCertificate) {
    return {
      ok: true,
      certificate: activeCertificate.pdf_url
        ? activeCertificate
        : await attachCertificatePdfArtifact(activeCertificate, 'idempotent reissue'),
      alreadyIssued: true,
    };
  }

  const now = new Date().toISOString();
  const highestRevision = Math.max(
    0,
    ...(history ?? []).map((certificate: any) => numberOr(certificate.revision_number, 0)),
  );
  const finalScore = numberOr(
    revokedCertificate.final_score,
    numberOr(revokedCertificate.percentage, 0),
  );
  const percentage = numberOr(revokedCertificate.percentage, finalScore);
  const totalMarks = numberOr(revokedCertificate.total_marks, Math.round(percentage));

  const basePayload: Record<string, unknown> = {
    course_id: revokedCertificate.course_id,
    student_id: revokedCertificate.student_id,
    // These values are historical snapshots. Do not query profiles/courses
    // here: a renamed course or deleted profile must not alter a reissue.
    student_name: revokedCertificate.student_name || 'Student',
    course_name_cached: revokedCertificate.course_name_cached || 'Course',
    final_score: finalScore,
    percentage,
    total_marks: totalMarks,
    grade_breakdown: revokedCertificate.grade_breakdown || {},
    status: 'awarded',
    revision_number: highestRevision + 1,
    issued_at: now,
    completion_date: revokedCertificate.completion_date || revokedCertificate.issued_at || now,
    template_snapshot: revokedCertificate.template_snapshot ?? null,
    is_manual_override: Boolean(revokedCertificate.is_manual_override),
    override_by: revokedCertificate.override_by ?? null,
    override_reason: revokedCertificate.override_reason ?? null,
    expires_at: revokedCertificate.expires_at ?? null,
    reissued_from_certificate_id: revokedCertificate.id,
    reissue_reason: normalizedReason,
    reissued_by: reissue.by.trim(),
    reissued_at: now,
  };

  for (let attempt = 0; attempt < MAX_INSERT_RETRIES; attempt++) {
    const certificateNumber = await generateCertificateNumber();
    if (!certificateNumber) return { ok: false, error: 'certificate_number_generation_failed' };

    const reservation = await reserveVerificationCode();
    if (reservation.ok === false) return { ok: false, error: reservation.error };

    let qrCodeUrl: string;
    try {
      qrCodeUrl = await generateVerificationQrDataUrl(verificationUrlForCode(reservation.code));
    } catch (error) {
      console.error('[issuance] QR generation failed for reissue:', error);
      return { ok: false, error: 'verification_qr_generation_failed' };
    }

    const { data: created, error: insertError } = await supabase
      .from('certificates')
      .insert({
        ...basePayload,
        certificate_number: certificateNumber,
        verification_code: reservation.code,
        qr_code_url: qrCodeUrl,
      })
      .select('*')
      .single();

    if (!insertError && created) {
      return {
        ok: true,
        certificate: await attachCertificatePdfArtifact(created, 'reissue'),
        alreadyIssued: false,
      };
    }

    if ((insertError as any)?.code !== '23505') {
      console.error('[issuance] reissue insert failed:', insertError);
      return { ok: false, error: 'certificate_reissue_insert_failed' };
    }

    const { data: raceWinner, error: raceError } = await supabase
      .from('certificates')
      .select('*')
      .eq('course_id', revokedCertificate.course_id)
      .eq('student_id', revokedCertificate.student_id)
      .in('status', [...ACTIVE_CERTIFICATE_STATUSES])
      .maybeSingle();
    if (raceWinner) {
      return {
        ok: true,
        certificate: raceWinner.pdf_url
          ? raceWinner
          : await attachCertificatePdfArtifact(raceWinner, 'concurrent reissue'),
        alreadyIssued: true,
      };
    }
    if (raceError) {
      console.error('[issuance] failed to resolve reissue race:', raceError);
      return { ok: false, error: 'certificate_reissue_insert_failed' };
    }
  }

  return { ok: false, error: 'certificate_reissue_insert_collision' };
}

/**
 * Rotate a certificate's public verification credential.
 *
 * A regenerated or reissued certificate must not keep its previous QR code:
 * the previous public link is invalidated by replacing `verification_code` in
 * the same atomic row update. The database's unique index is the final guard
 * against collisions; we retry a rare conflict with a new CSPRNG code.
 */
export async function regenerateCertificateVerification(
  certificateId: string,
): Promise<RegenerateVerificationResult> {
  const { data: existing, error: existingError } = await supabase
    .from('certificates')
    .select('id, status, verification_code')
    .eq('id', certificateId)
    .maybeSingle();

  if (existingError || !existing) {
    return { ok: false, error: 'certificate_not_found' };
  }

  const status = String((existing as any).status || '').toLowerCase();
  if (!['active', 'awarded', 'issued'].includes(status)) {
    return { ok: false, error: 'certificate_not_active' };
  }

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const verificationCode = generateVerificationCode();
    if (verificationCode === String(existing.verification_code || '').trim().toUpperCase()) {
      continue;
    }
    let qrCodeUrl: string;
    try {
      qrCodeUrl = await generateVerificationQrDataUrl(verificationUrlForCode(verificationCode));
    } catch (err) {
      console.error('[issuance] QR regeneration failed:', err);
      return { ok: false, error: 'verification_qr_generation_failed' };
    }

    const { data: certificate, error } = await supabase
      .from('certificates')
      .update({
        verification_code: verificationCode,
        qr_code_url: qrCodeUrl,
        // A PDF embedding the old QR must never continue to be served.
        // Rendering/storage is handled separately by the certificate renderer.
        pdf_url: null,
      })
      .eq('id', certificateId)
      // Do not rotate a credential that was revoked after our initial read.
      .in('status', [...ACTIVE_CERTIFICATE_STATUSES])
      .select('*')
      .single();

    if (!error && certificate) {
      // Retire the artifact containing the old QR before publishing the new
      // one. Public verification remains correct even if storage deletion or
      // rendering is unavailable, because the old verification code is no
      // longer present in the certificate table.
      await removeSupersededCertificatePdfArtifact(existing.id, existing.verification_code);
      return {
        ok: true,
        certificate: await attachCertificatePdfArtifact(certificate, 'verification regeneration'),
      };
    }

    if ((error as any)?.code !== '23505') {
      console.error('[issuance] verification regeneration failed:', error);
      return { ok: false, error: 'verification_regeneration_failed' };
    }
  }

  return { ok: false, error: 'verification_code_collision' };
}
