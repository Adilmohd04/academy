/**
 * CertificateTemplateDesigner v2 — the full visual designer.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §7.
 *
 * Composes the toolbar, sidebar, canvas, preview pane, inspector, and
 * keyboard shortcuts into a single full-bleed editor. Drives a Zustand
 * store (one per instance — see `useDesignerStore`).
 *
 * Mode behavior:
 *   - admin: full edit, save persists with approval_status='approved'.
 *   - teacher: edit allowed only when `template.approval.allow_teacher_editing`,
 *              "submit for approval" wraps the save into a pending revision.
 *
 * Persistence (Phase 3, Task 12.x):
 *   - On mount, loads the course (teacher) or global (admin) template list and
 *     opens the first one. If none exists, starts an empty template.
 *   - Save: creates the row on first save, patches it afterwards.
 *   - Submit for approval (teacher): posts a pending revision.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { Toolbar } from './Toolbar';
import { FieldInspector } from './FieldInspector';
import { PreviewPane } from './PreviewPane';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { DesignerHeader } from './DesignerHeader';
import { CanvasViewport } from './canvas/CanvasViewport';
import { makeEmptyTemplate, useDesignerStore } from '../store/designerStore';
import { certificateDesignerFontVariables, CERTIFICATE_FONTS_URL } from '../render/fonts';
import type { CertificateRenderData } from '../types/template';
import {
  createTemplate,
  listTemplates,
  submitForApproval,
  toCertificateTemplate,
  toTemplateData,
  updateTemplate,
} from '../api/templateApi';

export interface CertificateTemplateDesignerV2Props {
  mode: 'admin' | 'teacher';
  courseId?: string;
  userId?: string | null;
}

const MOCK_PREVIEW_DATA: CertificateRenderData = {
  studentName: 'Aisha Rahman',
  courseTitle: 'Advanced Tajweed Fundamentals and Recitation Mastery',
  certificateTitle: 'Certificate of Completion and Excellence',
  completionDate: new Date(),
  issueDate: new Date(),
  instructorName: 'Ustadh Yusuf',
  organizationName: 'Little Muslim Academy',
  certificateId: 'CERT-2024-A1B2C3',
  verificationCode: 'XXXX-XXXX-XXXX',
  verificationUrl: 'https://academy.local/verify/CERT-2024-A1B2C3',
  grade: 92.5,
};

export default function CertificateTemplateDesignerV2({
  mode,
  courseId,
  userId,
}: CertificateTemplateDesignerV2Props) {
  const { getToken } = useAuth();
  const template = useDesignerStore((s) => s.template);
  const setTemplate = useDesignerStore((s) => s.setTemplate);
  const markSaved = useDesignerStore((s) => s.markSaved);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  // Tracks the persisted DB id; null means the in-memory template hasn't been
  // saved yet, so the first save is a POST (create) rather than a PATCH.
  const [persistedId, setPersistedId] = useState<string | null>(null);

  const emptyTemplate = useMemo(
    () =>
      makeEmptyTemplate({
        scope: courseId ? 'course' : 'global',
        course_id: courseId ?? null,
      }),
    [courseId],
  );

  // ── Load existing template on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = getToken ? await getToken() : null;
        const records = await listTemplates({ token, clerkUserId: userId, courseId });
        if (cancelled) return;

        // Prefer a course-scoped template (teacher) or the default global (admin).
        const record = courseId
          ? records.find((r) => r.course_id === courseId) ?? null
          : records.find((r) => r.is_default) ?? records[0] ?? null;

        if (record) {
          setTemplate(toCertificateTemplate(record));
          setPersistedId(record.id);
        } else {
          setTemplate(emptyTemplate);
          setPersistedId(null);
        }
      } catch (err) {
        console.error('Failed to load certificate template:', err);
        if (!cancelled) {
          setTemplate(emptyTemplate);
          setPersistedId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, userId]);

  const readOnly =
    mode === 'teacher' && template?.approval.allow_teacher_editing === false;

  const persist = async (): Promise<string | null> => {
    const current = useDesignerStore.getState().template;
    if (!current) return null;
    const token = getToken ? await getToken() : null;
    const templateData = toTemplateData(current);

    if (persistedId) {
      const updated = await updateTemplate({
        token,
        clerkUserId: userId,
        templateId: persistedId,
        templateName: current.name,
        templateData,
      });
      return updated.id;
    }

    const created = await createTemplate({
      token,
      clerkUserId: userId,
      courseId: courseId ?? null,
      templateName: current.name,
      templateData,
    });
    setPersistedId(created.id);
    return created.id;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persist();
      markSaved();
      toast.success(mode === 'admin' ? 'Template saved.' : 'Draft saved.');
    } catch (err: any) {
      console.error('Save failed:', err);
      toast.error(err?.message || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    setSaving(true);
    try {
      // Ensure the row exists first (a teacher's first edit), then submit.
      const id = await persist();
      const current = useDesignerStore.getState().template;
      if (id && current) {
        const token = getToken ? await getToken() : null;
        await submitForApproval({
          token,
          clerkUserId: userId,
          templateId: id,
          templateData: toTemplateData(current),
        });
      }
      markSaved();
      toast.success('Submitted for admin approval.');
    } catch (err: any) {
      console.error('Submit failed:', err);
      toast.error(err?.message || 'Failed to submit for approval.');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs =
    mode === 'admin'
      ? [{ label: 'Certificates', href: '/admin/certificates' }, { label: 'Designer' }]
      : [
          { label: 'Course builder', href: `/teacher/courses/${courseId ?? ''}/builder` },
          { label: 'Certificate' },
        ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Loading certificate designer…
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-slate-50 ${certificateDesignerFontVariables}`}
      data-cert-designer-mode={mode}
    >
      {/* Load certificate fonts via link tag (avoids next/font/google network timeout) */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={CERTIFICATE_FONTS_URL} />
      <DesignerHeader
        mode={mode}
        breadcrumbs={breadcrumbs}
        readOnly={readOnly}
        saving={saving}
        onSave={handleSave}
        onSubmitForApproval={mode === 'teacher' ? handleSubmitForApproval : undefined}
      />

      {/* Rejection banner (teacher) */}
      {mode === 'teacher' && template?.approval.status === 'rejected' && template.approval.rejection_reason ? (
        <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-sm text-rose-700">
          <strong>Changes rejected:</strong> {template.approval.rejection_reason}
        </div>
      ) : null}

      <Toolbar />

      <div className="flex-1 grid grid-cols-[1fr_320px] min-h-0">
        <div className="flex flex-col min-w-0">
          <div className="flex-1 overflow-auto p-6 grid place-items-start">
            <CanvasViewport previewData={MOCK_PREVIEW_DATA} editable={!readOnly} />
          </div>

          <div className="border-t border-slate-200 bg-white">
            <details>
              <summary className="px-4 py-2 text-xs uppercase tracking-wider text-slate-500 cursor-pointer select-none">
                Live preview
              </summary>
              <PreviewPane />
            </details>
          </div>
        </div>

        <FieldInspector />
      </div>

      <KeyboardShortcuts />
    </div>
  );
}
