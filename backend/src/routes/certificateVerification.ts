/**
 * Public certificate verification routes.
 *
 * GET /api/verify/:code scans the opaque verification code stored in a QR
 * image. GET /api/verify?certificateId=CERT-... supports a manual check of
 * the printed certificate number. Both paths are deliberately unauthenticated
 * and return only a small public whitelist.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/database';
import config from '../config/env';
import { VERIFICATION_CODE_FORMAT_REGEX } from '../modules/certificate/services/verificationCode';

const router = express.Router();

/**
 * `req.ip` is safe here because Express only reads a forwarded address when
 * `TRUST_PROXY` has been explicitly configured in app.ts. With the default
 * (`false`), it is the socket peer and an arbitrary browser X-Forwarded-For
 * header cannot change this rate-limit or audit key.
 */
function publicRequestIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

const verifyLimiter = rateLimit({
  windowMs: config.verificationRateLimitWindowMs,
  max: config.verificationRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `certificate-verification:${publicRequestIp(req)}`,
  message: { status: 'rate_limited', message: 'Too many verification requests. Try again shortly.' },
});

type VerifyStatus = 'valid' | 'invalid' | 'revoked' | 'expired';

interface PublicCertificateView {
  student_name: string;
  course_title: string;
  completion_date: string | null;
  issued_at: string | null;
  certificate_id: string;
  instructor_name: string;
  organization_name: string;
  verification_timestamp: string;
  status: VerifyStatus;
  revoked_at?: string | null;
}

type CertificateLookup =
  | { column: 'verification_code'; value: string }
  | { column: 'certificate_number'; value: string };

async function logVerification(params: {
  certificateId: string | null;
  lookupValue: string;
  ip?: string;
  userAgent?: string;
  result: VerifyStatus;
}): Promise<void> {
  try {
    await supabase.from('certificate_verification_log').insert({
      certificate_id: params.certificateId,
      verification_code: params.lookupValue,
      verified_by_ip: params.ip ?? null,
      verified_by_user_agent: params.userAgent ?? null,
      verification_result: params.result,
    });
  } catch (err) {
    // Verification must stay available even if analytics logging is down.
    console.error('[verify] failed to write verification log:', err);
  }
}

async function verifyCertificate(
  req: express.Request,
  res: express.Response,
  lookup: CertificateLookup,
): Promise<express.Response> {
  res.setHeader('Cache-Control', 'no-store');

  const ip = publicRequestIp(req);
  const userAgent = req.headers['user-agent'] || undefined;
  const verificationTimestamp = new Date().toISOString();

  try {
    // The response below is a strict public whitelist. Selecting the row here
    // makes this compatible with the repository's older, inconsistent schema
    // migrations without leaking additional fields to the caller.
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*')
      .eq(lookup.column, lookup.value)
      .maybeSingle();

    if (error || !cert) {
      await logVerification({
        certificateId: null,
        lookupValue: lookup.value,
        ip,
        userAgent,
        result: 'invalid',
      });
      return res.status(200).json({
        status: 'invalid',
        message: 'No certificate matches this verification value.',
      });
    }

    const certRow = cert as any;
    const storedStatus = String(certRow.status || '').toLowerCase();
    let status: VerifyStatus = 'valid';
    const expiresAt = certRow.expires_at ? Date.parse(String(certRow.expires_at)) : Number.NaN;
    if (storedStatus === 'revoked') {
      status = 'revoked';
    } else if (storedStatus === 'expired' || (Number.isFinite(expiresAt) && expiresAt <= Date.now())) {
      status = 'expired';
    } else if (!['active', 'awarded', 'issued'].includes(storedStatus)) {
      // Pending and placeholder rows must never be presented as authentic.
      status = 'invalid';
    }

    // Prefer immutable display values captured at issuance, then fall back to
    // live records for older certificates.
    let studentName = certRow.student_name || '';
    let courseTitle = certRow.course_name_cached || '';
    let teacherId: string | null = null;

    if (certRow.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('title, teacher_id')
        .eq('id', certRow.course_id)
        .maybeSingle();
      if (course) {
        courseTitle = courseTitle || course.title || '';
        teacherId = course.teacher_id ?? null;
      }
    }

    if (!studentName && certRow.student_id) {
      const [{ data: byClerk }, { data: byId }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('clerk_user_id', certRow.student_id).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('id', certRow.student_id).maybeSingle(),
      ]);
      studentName = byClerk?.full_name || byId?.full_name || '';
    }

    let instructorName = '';
    if (teacherId) {
      const [{ data: byProfileId }, { data: byClerkId }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', teacherId).maybeSingle(),
        supabase.from('profiles').select('full_name').eq('clerk_user_id', teacherId).maybeSingle(),
      ]);
      instructorName = byProfileId?.full_name || byClerkId?.full_name || '';
    }

    let organizationName = 'Academy';
    const snapshot: any = certRow.template_snapshot;
    if (snapshot && typeof snapshot === 'object') {
      organizationName = snapshot.organization_name || snapshot.organizationName || organizationName;
    }

    const view: PublicCertificateView = {
      student_name: studentName || 'Student',
      course_title: courseTitle || 'Course',
      completion_date: certRow.completion_date ?? certRow.issued_at ?? null,
      issued_at: certRow.issued_at ?? certRow.completion_date ?? null,
      certificate_id: certRow.certificate_number || certRow.verification_code || lookup.value,
      instructor_name: instructorName,
      organization_name: organizationName,
      verification_timestamp: verificationTimestamp,
      status,
      revoked_at: status === 'revoked' ? certRow.revoked_at ?? null : undefined,
    };

    await logVerification({
      certificateId: certRow.id,
      lookupValue: lookup.value,
      ip,
      userAgent,
      result: status,
    });

    if (status === 'valid') {
      const { data: current } = await supabase
        .from('certificates')
        .select('verification_count')
        .eq('id', certRow.id)
        .maybeSingle();
      await supabase
        .from('certificates')
        .update({
          verification_count: (current?.verification_count ?? 0) + 1,
          last_verified_at: verificationTimestamp,
        })
        .eq('id', certRow.id);
    }

    return res.status(200).json({
      status,
      data: view,
      message: status === 'invalid' ? 'This certificate is not currently valid.' : undefined,
    });
  } catch (err) {
    console.error('[verify] error:', err);
    await logVerification({
      certificateId: null,
      lookupValue: lookup.value,
      ip,
      userAgent,
      result: 'invalid',
    });
    return res.status(200).json({ status: 'invalid', message: 'Verification failed.' });
  }
}

/** Manual verification by the printed certificate number. */
router.get('/verify', verifyLimiter, async (req, res) => {
  const rawCertificateId = req.query.certificateId;
  const certificateId = typeof rawCertificateId === 'string' ? rawCertificateId.trim().toUpperCase() : '';

  if (!certificateId || certificateId.length > 100) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      status: 'invalid',
      message: 'Enter a valid certificate ID to verify it.',
    });
  }

  return verifyCertificate(req, res, { column: 'certificate_number', value: certificateId });
});

/** QR / direct-link verification by opaque code. */
router.get('/verify/:code', verifyLimiter, async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  // QR links always carry a canonical 60-bit code. Refusing arbitrary values
  // avoids turning the public endpoint into a general certificate-table probe
  // and keeps audit logs free of attacker-controlled oversized identifiers.
  if (!VERIFICATION_CODE_FORMAT_REGEX.test(code)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ status: 'invalid', message: 'Enter a valid verification code.' });
  }

  return verifyCertificate(req, res, { column: 'verification_code', value: code });
});

export default router;
