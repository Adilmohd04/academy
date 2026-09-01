/**
 * Certificate template API client.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §5.
 *
 * Thin wrappers around the backend endpoints. The designer uses these to
 * load, save, and submit templates. All calls attach the Clerk bearer token
 * (passed in by the caller, which has access to `useAuth().getToken`).
 */

import type { CertificateTemplate } from '../types/template';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace('localhost', '127.0.0.1');

interface RequestOpts {
  token?: string | null;
}

function headers(opts: RequestOpts): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) h['Authorization'] = `Bearer ${opts.token}`;
  return h;
}

export interface TemplateRecord {
  id: string;
  course_id: string | null;
  template_name: string;
  template_data: Record<string, unknown>;
  is_default: boolean;
  approval_status?: 'approved' | 'pending_approval' | 'rejected' | 'draft';
  allow_teacher_editing?: boolean;
  rejection_reason?: string | null;
  updated_at?: string;
  created_at?: string;
}

/**
 * List templates. For teachers, pass `courseId` (required server-side).
 */
export async function listTemplates(
  opts: RequestOpts & { courseId?: string; scope?: 'global' | 'course' },
): Promise<TemplateRecord[]> {
  const params = new URLSearchParams();
  if (opts.courseId) params.set('courseId', opts.courseId);
  if (opts.scope) params.set('scope', opts.scope);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${API_BASE}/api/certificate-templates${qs}`, {
    headers: headers(opts),
  });
  if (!res.ok) throw new Error(`Failed to list templates (${res.status})`);
  const json = await res.json();
  return json.templates ?? [];
}

/**
 * Create a new template. Admin → approved immediately; teacher → pending.
 */
export async function createTemplate(
  opts: RequestOpts & {
    courseId?: string | null;
    templateName: string;
    templateData: Record<string, unknown>;
    isDefault?: boolean;
  },
): Promise<TemplateRecord> {
  const res = await fetch(`${API_BASE}/api/certificate-templates`, {
    method: 'POST',
    headers: headers(opts),
    body: JSON.stringify({
      courseId: opts.courseId ?? undefined,
      templateName: opts.templateName,
      templateData: opts.templateData,
      isDefault: opts.isDefault ?? false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      typeof err?.error === 'string'
        ? err.error
        : err?.error?.message || err?.message || `Failed to create template (${res.status})`;
    throw new Error(message);
  }
  const json = await res.json();
  return json.template;
}

/**
 * Patch an existing template (admin save, or teacher draft-save).
 */
export async function updateTemplate(
  opts: RequestOpts & {
    templateId: string;
    templateName?: string;
    templateData: Record<string, unknown>;
  },
): Promise<TemplateRecord> {
  const res = await fetch(`${API_BASE}/api/certificate-templates/${opts.templateId}`, {
    method: 'PATCH',
    headers: headers(opts),
    body: JSON.stringify({
      templateName: opts.templateName,
      templateData: opts.templateData,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      typeof err?.error === 'string'
        ? err.error
        : err?.error?.message || err?.message || `Failed to update template (${res.status})`;
    throw new Error(message);
  }
  const json = await res.json();
  return json.template;
}

/**
 * Teacher submit-for-approval — creates a pending revision.
 */
export async function submitForApproval(
  opts: RequestOpts & { templateId: string; templateData: Record<string, unknown> },
): Promise<{ template: TemplateRecord; revision: unknown }> {
  const res = await fetch(`${API_BASE}/api/certificate-templates/${opts.templateId}/submit`, {
    method: 'POST',
    headers: headers(opts),
    body: JSON.stringify({ template_data: opts.templateData }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      typeof err?.error === 'string'
        ? err.error
        : err?.error?.message || err?.message || `Failed to submit for approval (${res.status})`;
    throw new Error(message);
  }
  return res.json();
}

/**
 * Map a backend TemplateRecord into the in-memory CertificateTemplate shape
 * the designer store expects. Falls back to sensible defaults for legacy
 * rows whose template_data predates the v2 schema.
 */
export function toCertificateTemplate(record: TemplateRecord): CertificateTemplate {
  const data = (record.template_data ?? {}) as Record<string, any>;

  const safeCanvas =
    data.canvas && typeof data.canvas.width === 'number' && typeof data.canvas.height === 'number'
      ? data.canvas
      : { width: 1754, height: 1240 };
  const safeGrid =
    data.grid && typeof data.grid.size === 'number'
      ? data.grid
      : { size: 8, snap: true };

  // If the row already holds a v2 template, use it directly.
  if (data.schemaVersion === 1 && Array.isArray(data.fields)) {
    return {
      ...(data as unknown as CertificateTemplate),
      id: record.id,
      name: record.template_name || data.name || 'Untitled certificate',
      scope: record.course_id ? 'course' : 'global',
      course_id: record.course_id,
      canvas: safeCanvas,
      grid: safeGrid,
      fields: Array.isArray(data.fields) ? data.fields : [],
      background_image_url: data.background_image_url || '',
      approval: {
        status: record.approval_status ?? data.approval?.status ?? 'draft',
        approved_by: data.approval?.approved_by,
        approved_at: data.approval?.approved_at,
        rejection_reason: record.rejection_reason ?? data.approval?.rejection_reason ?? undefined,
        allow_teacher_editing: record.allow_teacher_editing ?? data.approval?.allow_teacher_editing ?? false,
      },
    };
  }

  // Legacy row — start from an empty v2 template so the designer can open it.
  return {
    schemaVersion: 1,
    id: record.id,
    name: record.template_name || 'Untitled certificate',
    scope: record.course_id ? 'course' : 'global',
    course_id: record.course_id,
    background_image_url: data.background_image_url || data.backgroundImageUrl || '',
    canvas: safeCanvas,
    fields: [],
    grid: safeGrid,
    approval: {
      status: record.approval_status ?? 'draft',
      allow_teacher_editing: record.allow_teacher_editing ?? false,
      rejection_reason: record.rejection_reason ?? undefined,
    },
  };
}

/**
 * Serialize a CertificateTemplate to the `template_data` JSON the backend
 * stores. We persist the entire v2 shape so reloads are loss-free.
 */
export function toTemplateData(template: CertificateTemplate): Record<string, unknown> {
  return template as unknown as Record<string, unknown>;
}
