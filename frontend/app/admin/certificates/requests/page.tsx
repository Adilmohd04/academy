'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import {
  ArrowLeft,
  Award,
  Check,
  ChevronRight,
  Clock3,
  FileWarning,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';
type StatusFilter = 'pending' | 'processing' | 'approved' | 'rejected' | 'all';
type CertificateRequest = {
  id: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  reason: string;
  created_at?: string;
  requestedAt?: string;
  reviewed_at?: string;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  certificate_id?: string | null;
  certificateId?: string | null;
  course?: { title?: string };
  student?: { full_name?: string; email?: string };
  teacher?: { full_name?: string; email?: string };
  course_title?: string;
  student_name?: string;
  teacher_name?: string;
  courseTitle?: string;
  studentName?: string;
  teacherName?: string;
};

const requestError = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  return body.error || body.message || 'Something went wrong. Please try again.';
};

const statuses: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending review' },
  { value: 'processing', label: 'Issuing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All requests' },
];

export default function CertificateExceptionRequestsPage() {
  const { getToken } = useAuth();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<CertificateRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  }, [getToken]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const query = `?status=${filter}&page=1&pageSize=100`;
      const response = await apiFetch(`/api/admin/certificate-exception-requests${query}`);
      if (!response.ok) throw new Error(await requestError(response));
      const body = await response.json();
      setRequests(body.requests || body.data || []);
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not load certificate reviews.' });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, filter]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending').length, [requests]);

  const approve = async (request: CertificateRequest) => {
    setBusyId(request.id);
    setNotice(null);
    try {
      const response = await apiFetch(`/api/admin/certificate-exception-requests/${request.id}/approve`, { method: 'POST' });
      if (!response.ok) throw new Error(await requestError(response));
      const body = await response.json();
      setNotice({ type: 'success', message: body.alreadyIssued ? 'This request had already issued its certificate.' : 'Request approved and a new verifiable certificate was issued.' });
      await loadRequests();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not approve this request.' });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    if (rejectionReason.trim().length < 3) {
      setNotice({ type: 'error', message: 'Add a short reason so the teacher understands the decision.' });
      return;
    }

    setBusyId(rejecting.id);
    setNotice(null);
    try {
      const response = await apiFetch(`/api/admin/certificate-exception-requests/${rejecting.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      if (!response.ok) throw new Error(await requestError(response));
      setRejecting(null);
      setRejectionReason('');
      setNotice({ type: 'success', message: 'Request rejected and the teacher can now see your reason.' });
      await loadRequests();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not reject this request.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-1 sm:p-2">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#ddd3bf] bg-[linear-gradient(120deg,#173f3f,#1b554f_52%,#416259)] px-6 py-8 text-white shadow-[0_28px_70px_-36px_rgba(17,47,44,0.75)] sm:px-8">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full border border-[#f6d986]/20 bg-[#f6d986]/10" />
        <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-[#bcebd6]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Link href="/admin/certificates" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Certificate hub</Link>
            <div className="mb-3 flex items-center gap-2 text-[#f6d986]"><ShieldCheck className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Verified issuance review</span></div>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Certificate exception queue</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">Approve only documented exceptions. Approval creates one fresh certificate with its own cryptographic verification code and public verification link.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-4 backdrop-blur-sm">
            <p className="text-3xl font-semibold">{filter === 'pending' ? pendingCount : requests.filter((request) => request.status === 'pending').length}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Pending in this view</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#e7e1d4] bg-white/90 p-4 shadow-[0_16px_45px_-35px_rgba(32,46,41,0.5)] sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[#eee9df] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-[#243a36]">Requests awaiting a decision</h2>
            <p className="mt-1 text-sm text-[#73827b]">Decisions are durable and immediately visible in the teacher portal.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Certificate request status filter">
            {statuses.map((status) => (
              <button key={status.value} onClick={() => setFilter(status.value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === status.value ? 'bg-[#1f5b4b] text-white shadow-sm' : 'border border-[#ded9ce] bg-[#fbfaf6] text-[#61736c] hover:border-[#91b4a8] hover:text-[#1f5b4b]'}`}>
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {notice ? <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">{notice.message}</div> : null}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center text-sm text-[#73827b]"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfdbd1] bg-[#fcfbf8] px-6 text-center">
            <Award className="h-10 w-10 text-[#c7a96b]" />
            <h3 className="mt-4 font-semibold text-[#32453f]">Nothing needs your attention</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#74827d]">When a teacher asks for a justified certificate exception, it will appear here with an audit trail.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#eee9df]">
            {requests.map((request) => {
              const studentName = request.student?.full_name || request.studentName || request.student_name || 'Student';
              const courseName = request.course?.title || request.courseTitle || request.course_title || 'Course';
              const teacherName = request.teacher?.full_name || request.teacherName || request.teacher_name || request.teacher?.email || 'Teacher';
              const isPending = request.status === 'pending';
              const isBusy = busyId === request.id;
              return (
                <article key={request.id} className="py-5 first:pt-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf7f0] text-[#1f7967]"><UserRound className="h-4 w-4" /></div>
                        <h3 className="font-semibold text-[#243a36]">{studentName}</h3>
                        <ChevronRight className="h-4 w-4 text-[#afbbb4]" />
                        <span className="font-medium text-[#4b645c]">{courseName}</span>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="mt-4 rounded-xl border border-[#efe9dc] bg-[#fcfbf7] px-4 py-3 text-sm leading-6 text-[#4f625d]">{request.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#84918b]">
                        <span>Requested by {teacherName}</span>
                        <span>{request.requestedAt || request.created_at ? new Date(request.requestedAt || request.created_at || '').toLocaleString() : 'Awaiting review'}</span>
                        {request.status === 'approved' && (request.certificateId || request.certificate_id) ? <span className="font-semibold text-emerald-700">Certificate issued</span> : null}
                        {request.status === 'rejected' && (request.rejectionReason || request.rejection_reason) ? <span className="text-rose-700">Decision: {request.rejectionReason || request.rejection_reason}</span> : null}
                      </div>
                    </div>
                    {isPending ? (
                      <div className="flex shrink-0 flex-wrap gap-2 xl:flex-col">
                        <button disabled={isBusy} onClick={() => void approve(request)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1f7967] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#176654] disabled:opacity-60">
                          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve & issue
                        </button>
                        <button disabled={isBusy} onClick={() => { setRejecting(request); setRejectionReason(''); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"><X className="h-4 w-4" /> Decline</button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {rejecting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-certificate-title">
          <div className="w-full max-w-lg rounded-[1.5rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4"><div><div className="mb-3 inline-flex rounded-xl bg-rose-50 p-2 text-rose-600"><FileWarning className="h-5 w-5" /></div><h2 id="reject-certificate-title" className="text-xl font-bold text-slate-900">Decline exception request</h2><p className="mt-1 text-sm text-slate-500">This note is shared with the requesting teacher.</p></div><button onClick={() => setRejecting(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="h-5 w-5" /></button></div>
            <label className="mt-5 block text-sm font-semibold text-slate-700">Reason<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={4} maxLength={1200} placeholder="Explain what evidence or requirement is still needed." className="mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100" /></label>
            <div className="mt-5 flex justify-end gap-3"><button onClick={() => setRejecting(null)} disabled={busyId === rejecting.id} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-60">Cancel</button><button onClick={() => void reject()} disabled={busyId === rejecting.id} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busyId === rejecting.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Decline request</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: CertificateRequest['status'] }) {
  const styles = {
    pending: 'border-amber-200 bg-amber-50 text-amber-800',
    processing: 'border-sky-200 bg-sky-50 text-sky-800',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rejected: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${styles[status]}`}><Clock3 className="h-3 w-3" />{status}</span>;
}
