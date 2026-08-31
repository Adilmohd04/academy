import { VerificationResultView, type VerificationResult } from './[code]/VerificationResultView';

export const dynamic = 'force-dynamic';

async function verifyCertificateId(certificateId: string): Promise<VerificationResult> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5000';
  const query = new URLSearchParams({ certificateId });

  try {
    const response = await fetch(`${apiBase}/api/verify?${query.toString()}`, {
      cache: 'no-store',
    });
    const payload = await response.json();
    return {
      status: payload.status ?? 'invalid',
      data: payload.data,
      message: payload.message,
    };
  } catch (error) {
    console.error('Certificate ID verification failed:', error);
    return { status: 'invalid', message: 'Unable to reach the verification service. Please try again.' };
  }
}

export default async function VerifyCertificatePage({
  searchParams,
}: {
  searchParams: { certificateId?: string | string[] };
}) {
  const rawCertificateId = searchParams.certificateId;
  const certificateId = typeof rawCertificateId === 'string' ? rawCertificateId.trim() : '';
  const result = certificateId ? await verifyCertificateId(certificateId) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <section className="mx-auto mb-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Academy verification</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Verify a certificate</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter the Certificate ID printed on the certificate. You can also scan its QR code to open the same secure
          verification record.
        </p>

        <form action="/verify" method="get" className="mt-5 space-y-3">
          <label htmlFor="certificateId" className="block text-sm font-medium text-slate-800">
            Certificate ID
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="certificateId"
              name="certificateId"
              defaultValue={certificateId}
              placeholder="CERT-2026-ABC123"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm uppercase text-slate-900 outline-none transition placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            >
              Verify
            </button>
          </div>
        </form>
      </section>

      {result ? <VerificationResultView result={result} embedded /> : null}
    </div>
  );
}
