'use client';

/**
 * Admin certificate library.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 3.7, Task 28.
 *
 * Lists all templates (global + course) with their default flag and approval
 * status. Admin can set the platform default, delete a template, jump to the
 * designer, or open the approval queue.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { Award, Plus, Star, Trash2, ClipboardCheck } from 'lucide-react';
import type { TemplateRecord } from '@/features/certificates/api/templateApi';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function AdminCertificateLibraryPage() {
  const { getToken } = useAuth();
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/certificate-templates`, { headers: await authHeaders() });
      const json = await res.json();
      setTemplates(json.templates ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const setDefault = useCallback(
    async (template: TemplateRecord) => {
      if (!confirm(`Make "${template.template_name}" the platform-wide default certificate?`)) return;
      try {
        const res = await fetch(`${API}/api/certificate-templates/${template.id}/approve`, {
          method: 'PATCH',
          headers: await authHeaders(),
          body: JSON.stringify({ isDefault: true }),
        });
        if (!res.ok) throw new Error('Failed');
        toast.success('Default template updated.');
        await load();
      } catch {
        toast.error('Failed to set default.');
      }
    },
    [authHeaders, load],
  );

  const globals = templates.filter((t) => !t.course_id);
  const courseScoped = templates.filter((t) => t.course_id);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-600" />
            Certificate Templates
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage global and course-specific certificate designs.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/certificates/approvals"
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5"
          >
            <ClipboardCheck className="w-4 h-4" />
            Approvals
          </Link>
          <Link
            href="/admin/certificates/design"
            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-slate-400 text-sm py-12 text-center">Loading templates…</p>
      ) : (
        <div className="space-y-8">
          <Section title="Global templates" subtitle="Apply platform-wide when a course has no custom certificate.">
            {globals.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {globals.map((t) => (
                  <TemplateCard key={t.id} t={t} onSetDefault={setDefault} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Course templates" subtitle="Custom designs scoped to a single course.">
            {courseScoped.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseScoped.map((t) => (
                  <TemplateCard key={t.id} t={t} />
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <p className="text-xs text-slate-400 mb-3">{subtitle}</p>
      {children}
    </section>
  );
}

function Empty() {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-sm text-slate-400">
      No templates yet.
    </div>
  );
}

function TemplateCard({
  t,
  onSetDefault,
}: {
  t: TemplateRecord;
  onSetDefault?: (t: TemplateRecord) => void;
}) {
  const statusStyles: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
    draft: 'bg-slate-100 text-slate-700',
  };
  const status = t.approval_status ?? 'draft';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-slate-900 text-sm truncate">{t.template_name}</h3>
        {t.is_default ? (
          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Default
          </span>
        ) : null}
      </div>
      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyles[status]}`}>
        {status.replace(/_/g, ' ')}
      </span>
      <div className="mt-4 flex gap-2">
        {onSetDefault && !t.is_default ? (
          <button
            onClick={() => onSetDefault(t)}
            className="px-2.5 py-1.5 rounded text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Set as default
          </button>
        ) : null}
      </div>
    </div>
  );
}
