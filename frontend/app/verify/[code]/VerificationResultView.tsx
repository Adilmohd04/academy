/**
 * VerificationResultView — public certificate verification result UI.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 11.2, 11.3, 11.5.
 *
 * Renders distinct states for valid / revoked / expired / invalid. Only ever
 * shows the public whitelist of fields — never score, email, or internal ids.
 */

'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

type VerifyStatus = 'valid' | 'invalid' | 'revoked' | 'expired' | 'rate_limited';

export interface PublicCertificateView {
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

export interface VerificationResult {
  status: VerifyStatus;
  data?: PublicCertificateView;
  message?: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VerificationResultView({
  result,
  embedded = false,
}: {
  result: VerificationResult;
  embedded?: boolean;
}) {
  const status = result.status;

  return (
    <main
      className={
        embedded
          ? 'mx-auto w-full max-w-lg'
          : 'min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12'
      }
    >
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <StatusBanner status={status} />

          <div className="p-6 md:p-8">
            {status === 'invalid' || status === 'rate_limited' ? (
              <InvalidState message={result.message} rateLimited={status === 'rate_limited'} />
            ) : result.data ? (
              <CertificateDetails view={result.data} />
            ) : (
              <InvalidState message="Certificate details unavailable." />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Certificate authenticity is verified against the issuing academy&apos;s records.
        </p>
      </div>
    </main>
  );
}

function StatusBanner({ status }: { status: VerifyStatus }) {
  const config: Record<VerifyStatus, { bg: string; icon: React.ReactNode; label: string }> = {
    valid: {
      bg: 'bg-emerald-600',
      icon: <ShieldCheck className="w-7 h-7" />,
      label: 'Verified Certificate',
    },
    revoked: {
      bg: 'bg-rose-600',
      icon: <XCircle className="w-7 h-7" />,
      label: 'Certificate Revoked',
    },
    expired: {
      bg: 'bg-amber-600',
      icon: <AlertTriangle className="w-7 h-7" />,
      label: 'Certificate Expired',
    },
    invalid: {
      bg: 'bg-slate-600',
      icon: <XCircle className="w-7 h-7" />,
      label: 'Not Found',
    },
    rate_limited: {
      bg: 'bg-amber-600',
      icon: <AlertTriangle className="w-7 h-7" />,
      label: 'Please Try Again Shortly',
    },
  };
  const c = config[status];
  return (
    <div className={`${c.bg} text-white px-6 py-5 flex items-center gap-3`}>
      {c.icon}
      <h1 className="text-lg font-semibold">{c.label}</h1>
    </div>
  );
}

function CertificateDetails({ view }: { view: PublicCertificateView }) {
  return (
    <div className="space-y-5">
      {view.status === 'valid' ? (
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4" />
          This certificate is authentic and currently valid.
        </div>
      ) : null}

      {view.status === 'revoked' ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
          <p className="font-medium">This certificate was revoked.</p>
          {view.revoked_at ? <p className="mt-1">Revoked on {formatDate(view.revoked_at)}.</p> : null}
        </div>
      ) : null}

      <dl className="divide-y divide-slate-100">
        <Row label="Recipient" value={view.student_name} emphasis />
        <Row label="Course" value={view.course_title} />
        <Row label="Completion date" value={formatDate(view.completion_date)} />
        <Row label="Issue date" value={formatDate(view.issued_at)} />
        <Row label="Instructor" value={view.instructor_name || '—'} />
        <Row label="Issued by" value={view.organization_name || '—'} />
        <Row label="Certificate ID" value={view.certificate_id} mono />
        <Row label="Verified at" value={formatDateTime(view.verification_timestamp)} />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
  mono,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <dt className="text-xs uppercase tracking-wider text-slate-400">{label}</dt>
      <dd
        className={`text-right ${emphasis ? 'text-lg font-bold text-slate-900' : 'text-sm text-slate-700'} ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function InvalidState({ message, rateLimited = false }: { message?: string; rateLimited?: boolean }) {
  return (
    <div className="text-center py-6">
      <p className="text-slate-700 font-medium">
        {message || 'No certificate matches this verification code.'}
      </p>
      <p className="text-sm text-slate-500 mt-2">
        {rateLimited
          ? 'Please wait a moment before trying again.'
          : 'Please double-check the code or QR link. If you believe this is an error, contact the issuing academy.'}
      </p>
      <a href="/verify" className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800">
        Verify using a Certificate ID
      </a>
    </div>
  );
}
