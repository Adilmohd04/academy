/**
 * DesignerHeader — title row with breadcrumbs + save / submit buttons.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 5.5, 7.1, 7.7.
 *
 * Two button modes:
 *   - admin: "Save"   → persists with approval_status='approved'
 *   - teacher: "Save draft" + "Submit for approval" (disabled when read-only)
 *
 * Dirty indicator dot turns amber when there are unsaved changes.
 */

import React from 'react';
import { selectDirty, useDesignerStore } from '../store/designerStore';

export type DesignerMode = 'admin' | 'teacher';

export interface DesignerHeaderProps {
  mode: DesignerMode;
  /** Optional crumb pieces, rendered with " / " between. */
  breadcrumbs?: ReadonlyArray<{ label: string; href?: string }>;
  /** Read-only when teacher and `allow_teacher_editing=false`. */
  readOnly?: boolean;
  saving?: boolean;
  onSave: () => void;
  onSubmitForApproval?: () => void;
}

export function DesignerHeader({
  mode,
  breadcrumbs,
  readOnly = false,
  saving = false,
  onSave,
  onSubmitForApproval,
}: DesignerHeaderProps) {
  const dirty = useDesignerStore(selectDirty);
  const template = useDesignerStore((s) => s.template);
  const status = template?.approval.status ?? 'draft';

  return (
    <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <Crumbs items={breadcrumbs ?? [{ label: 'Certificate template' }]} />
        <StatusBadge status={status} />
        <DirtyDot active={dirty} />
      </div>

      <div className="flex items-center gap-2">
        {readOnly ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
            Read-only — editing disabled by admin.
          </p>
        ) : null}

        {mode === 'admin' ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty || readOnly}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !dirty || readOnly}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={onSubmitForApproval}
              disabled={saving || !dirty || readOnly || !onSubmitForApproval}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Submit for approval
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function Crumbs({ items }: { items: ReadonlyArray<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-slate-500 min-w-0">
      {items.map((item, idx) => (
        <React.Fragment key={`${item.label}-${idx}`}>
          {idx > 0 ? <span className="mx-1.5 text-slate-300">/</span> : null}
          {item.href ? (
            <a href={item.href} className="hover:underline truncate">
              {item.label}
            </a>
          ) : (
            <span className="font-semibold text-slate-800 truncate">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

function StatusBadge({ status }: { status: 'approved' | 'pending_approval' | 'rejected' | 'draft' }) {
  const styles: Record<typeof status, string> = {
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  const labels: Record<typeof status, string> = {
    approved: 'Approved',
    pending_approval: 'Pending approval',
    rejected: 'Rejected',
    draft: 'Draft',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function DirtyDot({ active }: { active: boolean }) {
  return (
    <span
      title={active ? 'Unsaved changes' : 'Saved'}
      aria-label={active ? 'Unsaved changes' : 'Saved'}
      className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-amber-400' : 'bg-emerald-500'}`}
    />
  );
}
