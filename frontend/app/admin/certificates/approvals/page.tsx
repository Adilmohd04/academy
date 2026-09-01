'use client';

/**
 * Admin certificate approval queue + review.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 6, Task 27.
 *
 * Lists pending teacher-submitted revisions, and for the selected one renders
 * the previously-approved version side-by-side with the pending version using
 * the shared CertificateRenderer, plus a structural field diff. Admin can
 * approve or reject (with a reason, ≤1000 chars).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { CertificateRenderer } from '@/features/certificates/render/CertificateRenderer';
import { toCertificateTemplate } from '@/features/certificates/api/templateApi';
import type { CertificateTemplate, CertificateRenderData } from '@/features/certificates/types';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const MOCK: CertificateRenderData = {
  studentName: 'Jane Doe',
  courseTitle: 'Sample Course',
  certificateTitle: 'Certificate of Completion',
  completionDate: new Date(),
  issueDate: new Date(),
  instructorName: 'Instructor',
  organizationName: 'Academy',
  certificateId: 'CERT-2024-A1B2C3',
  verificationCode: 'XXXX-XXXX-XXXX',
  grade: 90,
};

interface Revision {
  id: string;
  template_id: string;
  revision_number: number;
  template_data: Record<string, unknown>;
  status: string;
  submitted_at: string;
}

export default function AdminApprovalsPage() {
  const { getToken } = useAuth();
  const [queue, setQueue] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [current, setCurrent] = useState<Revision | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, [getToken]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/certificate-templates/approval/queue`, { headers: await authHeaders() });
      const json = await res.json();
      setQueue(json.revisions ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load approval queue.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const selectRevision = useCallback(
    async (rev: Revision) => {
      setSelected(rev);
      setRejectReason('');
      setCurrent(null);
      try {
        const res = await fetch(`${API}/api/certificate-templates/${rev.template_id}/revisions`, {
          headers: await authHeaders(),
        });
        const json = await res.json();
        setCurrent(json.current ?? null);
      } catch (err) {
        console.error(err);
      }
    },
    [authHeaders],
  );

  const approve = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/certificate-templates/${selected.template_id}/approve`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ revisionId: selected.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Approve failed');
      toast.success('Revision approved.');
      setSelected(null);
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Approve failed.');
    } finally {
      setBusy(false);
    }
  }, [selected, authHeaders, loadQueue]);

  const reject = useCallback(async () => {
    if (!selected) return;
    if (rejectReason.length > 1000) {
      toast.error('Reason must be 1000 characters or fewer.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/certificate-templates/${selected.template_id}/reject`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ revisionId: selected.id, reason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Reject failed');
      toast.success('Revision rejected.');
      setSelected(null);
      await loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Reject failed.');
    } finally {
      setBusy(false);
    }
  }, [selected, rejectReason, authHeaders, loadQueue]);

  const pendingTemplate: CertificateTemplate | null = useMemo(
    () =>
      selected
        ? toCertificateTemplate({
            id: selected.template_id,
            course_id: null,
            template_name: 'Pending',
            template_data: selected.template_data,
            is_default: false,
          })
        : null,
    [selected],
  );

  const currentTemplate: CertificateTemplate | null = useMemo(
    () =>
      current
        ? toCertificateTemplate({
            id: current.template_id,
            course_id: null,
            template_name: 'Current',
            template_data: current.template_data,
            is_default: false,
          })
        : null,
    [current],
  );

  const diff = useMemo(() => computeFieldDiff(currentTemplate, pendingTemplate), [currentTemplate, pendingTemplate]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Certificate Approvals</h1>
        <p className="text-slate-500 text-sm mt-1">Review teacher-submitted certificate template changes.</p>
      </header>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Queue */}
        <aside className="bg-white rounded-xl border border-slate-200 p-3 h-fit">
          <h2 className="text-xs uppercase tracking-wider text-slate-400 px-2 mb-2">
            Pending ({queue.length})
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400 px-2 py-4">Loading…</p>
          ) : queue.length === 0 ? (
            <p className="text-sm text-slate-400 px-2 py-4">No pending changes.</p>
          ) : (
            <ul className="space-y-1">
              {queue.map((rev) => (
                <li key={rev.id}>
                  <button
                    onClick={() => selectRevision(rev)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      selected?.id === rev.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="font-medium">Revision #{rev.revision_number}</span>
                    <span className="block text-xs text-slate-400">
                      {new Date(rev.submitted_at).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Review */}
        <section>
          {!selected ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select a pending revision to review.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <ComparePane title="Current (approved)" template={currentTemplate} empty="No prior approved version" />
                <ComparePane title="Pending (submitted)" template={pendingTemplate} empty="No data" highlight />
              </div>

              {/* Field diff */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Changes</h3>
                {diff.length === 0 ? (
                  <p className="text-sm text-slate-400">No structural field differences detected.</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {diff.map((d, i) => (
                      <li key={i} className="flex gap-2">
                        <span
                          className={`px-1.5 rounded text-xs font-medium ${
                            d.kind === 'added'
                              ? 'bg-emerald-100 text-emerald-700'
                              : d.kind === 'removed'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {d.kind}
                        </span>
                        <span className="text-slate-600">{d.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Rejection reason (required to reject, max 1000 chars)…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{rejectReason.length}/1000</span>
                  <div className="flex gap-2">
                    <button
                      onClick={reject}
                      disabled={busy || !rejectReason.trim()}
                      className="px-4 py-2 rounded-lg bg-white border border-rose-300 text-rose-700 text-sm font-medium hover:bg-rose-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={approve}
                      disabled={busy}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ComparePane({
  title,
  template,
  empty,
  highlight,
}: {
  title: string;
  template: CertificateTemplate | null;
  empty: string;
  highlight?: boolean;
}) {
  const targetWidth = 360;
  const scale = template ? targetWidth / template.canvas.width : 1;
  return (
    <div className={`bg-white rounded-xl border ${highlight ? 'border-indigo-300' : 'border-slate-200'} p-3`}>
      <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      {template ? (
        <div
          style={{
            width: targetWidth,
            height: template.canvas.height * scale,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: template.canvas.width, height: template.canvas.height }}>
            <CertificateRenderer template={template} data={MOCK} preview />
          </div>
        </div>
      ) : (
        <div className="h-40 grid place-items-center text-sm text-slate-400">{empty}</div>
      )}
    </div>
  );
}

interface DiffEntry {
  kind: 'added' | 'removed' | 'changed';
  detail: string;
}

function computeFieldDiff(
  current: CertificateTemplate | null,
  pending: CertificateTemplate | null,
): DiffEntry[] {
  if (!pending) return [];
  const cur = new Map((current?.fields ?? []).map((f) => [f.id, f]));
  const pen = new Map(pending.fields.map((f) => [f.id, f]));
  const out: DiffEntry[] = [];

  for (const [id, f] of Array.from(pen)) {
    if (!cur.has(id)) {
      out.push({ kind: 'added', detail: `Added ${f.type} field` });
    } else {
      const before = cur.get(id)!;
      const changedProps = (['x', 'y', 'width', 'height', 'fontSize', 'fontWeight', 'color', 'align', 'visible'] as const).filter(
        (k) => (before as any)[k] !== (f as any)[k],
      );
      if (changedProps.length > 0) {
        out.push({ kind: 'changed', detail: `${f.type}: ${changedProps.join(', ')}` });
      }
    }
  }
  for (const [id, f] of Array.from(cur)) {
    if (!pen.has(id)) out.push({ kind: 'removed', detail: `Removed ${f.type} field` });
  }
  return out;
}
