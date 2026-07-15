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
 *   7. Return the new certificate. (PDF rendering is wired in task 21.3 once
 *      the shared `renderToHTML` is migrated.)
 *
 * Idempotence: enforced by the existing `UNIQUE(course_id, student_id)`
 * constraint on `certificates`. Calling `issueCertificate` twice for the
 * same pair returns the existing row on the second call.
 */

import { supabase } from '../../../config/database';
import { isEligibleForCertificateDetailed, EligibilityResult } from './eligibilityService';
import { resolveTemplate } from './templateResolutionService';
import { calculateFinalScore } from './certificateService';
import { generateVerificationCode } from './verificationCode';

const MAX_CODE_RETRIES = 10;

export interface IssueOptions {
  /** When set, skips eligibility checks. `reason` is required and persisted. */
  override?: { reason: string; by: string };
}

export type IssueResult =
  | { ok: true; certificate: any; alreadyIssued: boolean }
  | { ok: false; error: string; unmet?: string[] };

export async function issueCertificate(
  courseId: string,
  studentId: string,
  opts: IssueOptions = {},
): Promise<IssueResult> {
  // ── Idempotence: short-circuit when a certificate already exists ──────
  const { data: existing } = await supabase
    .from('certificates')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    return { ok: true, certificate: existing, alreadyIssued: true };
  }

  // ── Eligibility (skipped under override with reason) ──────────────────
  let eligibility: EligibilityResult | null = null;
  if (opts.override) {
    if (!opts.override.reason || !opts.override.reason.trim()) {
      return { ok: false, error: 'override_reason_required' };
    }
  } else {
    eligibility = await isEligibleForCertificateDetailed(courseId, studentId);
    if (!eligibility.eligible) {
      return { ok: false, error: 'not_eligible', unmet: eligibility.unmet };
    }
  }

  // ── Score breakdown for grade_breakdown column ─────────────────────────
  const score = await calculateFinalScore(courseId, studentId);
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
      supabase.from('profiles').select('full_name').eq('clerk_user_id', studentId).maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', studentId).maybeSingle(),
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
  const { data: certNumberRow, error: certNumberError } = await supabase.rpc(
    'generate_certificate_number',
  );
  if (certNumberError || !certNumberRow) {
    return { ok: false, error: 'certificate_number_generation_failed' };
  }
  const certificateNumber = String(certNumberRow);

  // ── Verification code with collision retry ─────────────────────────────
  let verificationCode: string | null = null;
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const candidate = generateVerificationCode();
    const { data: collision } = await supabase
      .from('certificates')
      .select('id')
      .eq('verification_code', candidate)
      .maybeSingle();
    if (!collision) {
      verificationCode = candidate;
      break;
    }
  }
  if (!verificationCode) {
    return { ok: false, error: 'verification_code_collision' };
  }

  // ── Insert certificate row ─────────────────────────────────────────────
  // NOTE: the live `certificates` table requires student_name, total_marks,
  // and percentage (all NOT NULL), and stores student_id as TEXT (clerk id).
  const now = new Date().toISOString();
  const finalScore = Number(score.final_score);
  const insertPayload: Record<string, unknown> = {
    course_id: courseId,
    student_id: studentId,
    student_name: studentName,
    course_name_cached: courseTitle,
    certificate_number: certificateNumber,
    verification_code: verificationCode,
    final_score: finalScore,
    percentage: finalScore,
    total_marks: Math.round(finalScore),
    grade_breakdown: {
      quiz_average: Number(score.quiz_average),
      assignment_average: Number(score.assignment_average),
      final_exam_score: Number(score.final_exam_score),
    },
    status: 'awarded',
    issued_at: now,
    completion_date: now,
    template_snapshot: templateSnapshot,
  };

  if (opts.override) {
    insertPayload.is_manual_override = true;
    insertPayload.override_by = opts.override.by;
    insertPayload.override_reason = opts.override.reason;
  }

  const { data: created, error: insertError } = await supabase
    .from('certificates')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError || !created) {
    // Race condition: another caller inserted concurrently. Re-read and return.
    if ((insertError as any)?.code === '23505') {
      const { data: race } = await supabase
        .from('certificates')
        .select('*')
        .eq('course_id', courseId)
        .eq('student_id', studentId)
        .maybeSingle();
      if (race) return { ok: true, certificate: race, alreadyIssued: true };
    }
    console.error('[issuance] insert failed:', insertError);
    return { ok: false, error: 'certificate_insert_failed' };
  }

  return { ok: true, certificate: created, alreadyIssued: false };
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
  if (!result.ok && result.error !== 'not_eligible') {
    console.warn(
      `[issuance] non-eligibility failure for course=${courseId} student=${studentId}: ${result.error}`,
    );
  }
  return result;
}
