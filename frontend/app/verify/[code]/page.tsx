/**
 * Public certificate verification page.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 11.1, 11.6, design §9.1.
 *
 * Server component. Calls the backend `/api/verify/:code` server-side with
 * `cache: 'no-store'`, forwarding the visitor's IP so the backend can log and
 * rate-limit accurately. This route is the canonical landing page for QR scans.
 *
 * This path is added to the public-route bypass in `frontend/middleware.ts`
 * so unauthenticated visitors (employers, registrars) can reach it.
 */

import { headers } from 'next/headers';
import { VerificationResultView, type VerificationResult } from './VerificationResultView';

export const dynamic = 'force-dynamic';

async function fetchVerification(code: string): Promise<VerificationResult> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000';
  const hdrs = headers();
  const forwardedFor = hdrs.get('x-forwarded-for') ?? '';

  try {
    const res = await fetch(`${apiBase}/api/verify/${encodeURIComponent(code)}`, {
      cache: 'no-store',
      headers: {
        'x-forwarded-for': forwardedFor,
      },
    });
    const json = await res.json();
    return {
      status: json.status ?? 'invalid',
      data: json.data,
      message: json.message,
    };
  } catch (err) {
    console.error('Verification fetch failed:', err);
    return { status: 'invalid', message: 'Unable to reach the verification service. Please try again.' };
  }
}

export default async function VerifyPage({ params }: { params: { code: string } }) {
  const result = await fetchVerification(params.code);
  return <VerificationResultView result={result} />;
}
