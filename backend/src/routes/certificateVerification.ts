/**
 * Public certificate verification endpoint.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §9, Property 12.
 *
 * GET /api/verify/:code
 *   - No authentication.
 *   - Rate-limited to 60 requests / IP / minute (Req 11.8).
 *   - Sets `Cache-Control: no-store` (Req 14.5).
 *   - Returns ONLY the public whitelist of fields (Req 11.7): student name,
 *     course title, completion date, certificate id, instructor name,
 *     organization name, status. NEVER the score, email, or internal IDs.
 *   - Logs every attempt to `certificate_verification_log` (Req 11.3, 11.4).
 *   - On a valid lookup, bumps `verification_count` + `last_verified_at`.
 *
 * Mounted at `/api` in app.ts (so the path is `/api/verify/:code`).
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/database';

const router = express.Router();

const verifyLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 60, // 60 requests / IP / minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  message: { status: 'rate_limited', message: 'Too many verification requests. Try again shortly.' },
});

type VerifyStatus = 'valid' | 'invalid' | 'revoked' | 'expired';

interface PublicCertificateView {
  student_name: string;
  course_title: string;
  completion_date: string | null;
  certificate_id: string;
  instructor_name: string;
  organization_name: string;
  status: VerifyStatus;
  revoked_at?: string | null;
  revoke_reason?: string | null;
}

async function logVerification(params: {
  certificateId: string | null;
  code: string;
  ip?: string;
  userAgent?: string;
  result: VerifyStatus;
}): Promise<void> {
  try {
    await supabase.from('certificate_verification_log').insert({
      certificate_id: params.certificateId,
      verification_code: params.code,
      verified_by_ip: params.ip ?? null,
      verified_by_user_agent: params.userAgent ?? null,
      verification_result: params.result,
    });
  } catch (err) {
    // Logging must never break verification — swallow and continue.
    console.error('[verify] failed to write verification log:', err);
  }
}

router.get('/verify/:code', verifyLimiter, async (req, res) => {
  // Never cache verification responses (Req 14.5).
  res.setHeader('Cache-Control', 'no-store');

  const { code } = req.params;
  const ip = req.ip || req.socket.remoteAddress || undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  try {
    // Look up the certificate by its public verification code.
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('id, course_id, student_id, certificate_number, status, completion_date, revoked_at, revoked_reason, template_snapshot')
      .eq('verification_code', code)
      .maybeSingle();

    if (error || !cert) {
      await logVerification({ certificateId: null, code, ip, userAgent, result: 'invalid' });
      return res.status(200).json({
        status: 'invalid',
        message: 'No certificate matches this verification code.',
      });
    }

    // Determine status. (No expires_at column today, so 'expired' is unused
    // unless added later — Property 12 tolerates this.)
    let status: VerifyStatus = 'valid';
    if (cert.status === 'revoked') status = 'revoked';

    // The live certificates table caches student_name and course_name_cached
    // directly on the row (they survive course deletion — Req 10.5). Prefer
    // those, falling back to live lookups. student_id is a TEXT clerk id, so
    // we look up profiles by clerk_user_id (and id as a fallback).
    const certRow = cert as any;
    let studentName: string = certRow.student_name || '';
    let courseTitle: string = certRow.course_name_cached || '';
    let teacherId: string | null = null;

    if (cert.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('title, teacher_id')
        .eq('id', cert.course_id)
        .maybeSingle();
      if (course) {
        courseTitle = courseTitle || course.title || '';
        teacherId = course.teacher_id ?? null;
      }
    }

    if (!studentName && cert.student_id) {
      const [{ data: byClerk }, { data: byId }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('clerk_user_id', cert.student_id).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', cert.student_id).maybeSingle(),
      ]);
      studentName = byClerk?.full_name || byId?.full_name || '';
    }

    let instructorName = '';
    let organizationName = 'Academy';
    if (teacherId) {
      const [{ data: tById }, { data: tByClerk }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', teacherId).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('clerk_user_id', teacherId).maybeSingle(),
      ]);
      instructorName = tById?.full_name || tByClerk?.full_name || '';
    }

    // Organization name can be pulled from the template snapshot if present.
    const snapshot: any = cert.template_snapshot;
    if (snapshot && typeof snapshot === 'object') {
      organizationName = snapshot.organization_name || snapshot.organizationName || organizationName;
    }

    const view: PublicCertificateView = {
      student_name: studentName || 'Student',
      course_title: courseTitle || 'Course',
      completion_date: cert.completion_date ?? null,
      certificate_id: cert.certificate_number || certRow.verification_code || cert.id,
      instructor_name: instructorName,
      organization_name: organizationName,
      status,
      revoked_at: status === 'revoked' ? cert.revoked_at ?? null : undefined,
      revoke_reason: status === 'revoked' ? cert.revoked_reason ?? null : undefined,
    };

    await logVerification({ certificateId: cert.id, code, ip, userAgent, result: status });

    // Bump verification telemetry only on a valid lookup.
    if (status === 'valid') {
      // Read-then-write is fine here; concurrent verifications are rare and
      // an occasional lost increment is acceptable for a vanity counter.
      const { data: current } = await supabase
        .from('certificates')
        .select('verification_count')
        .eq('id', cert.id)
        .maybeSingle();
      await supabase
        .from('certificates')
        .update({
          verification_count: (current?.verification_count ?? 0) + 1,
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', cert.id);
    }

    return res.status(200).json({ status, data: view });
  } catch (err: any) {
    console.error('[verify] error:', err);
    // Even on error, don't leak internals.
    await logVerification({ certificateId: null, code, ip, userAgent, result: 'invalid' });
    return res.status(200).json({ status: 'invalid', message: 'Verification failed.' });
  }
});

export default router;
