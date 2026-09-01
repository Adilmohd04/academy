/**
 * Value substitution rules for Dynamic_Fields.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §4 + Property 6.
 *
 * Rules (Req 2.10–2.12, 3.6):
 *   - Grade: number formatted to `decimals` decimal places (default 1) with
 *     `suffix` appended (default '%'). Null grade → empty string.
 *   - Dates: formatted via the field's `format` (date-fns) — default 'PPP'.
 *     Missing date → empty string.
 *   - QR code: src is a data URL produced by `qrcode.toDataURL(verificationUrl)`.
 *     A placeholder data URL is returned when there's no verificationUrl yet
 *     (preview before issuance).
 *   - Empty / null values render as empty content (zero-width text). The bbox
 *     is preserved so the layout doesn't reflow.
 *
 * Sanitization (Req 14.6, Property 14): all strings ultimately reach the DOM
 * via React's `{text}` interpolation (which escapes) or `dangerouslySetInnerHTML`.
 * `escapeHtml` is exposed for the HTML stringifier path which builds raw markup.
 */

import { format as formatDateFn, isValid as isValidDate, parseISO } from 'date-fns';
import type {
  CertificateField,
  CertificateRenderData,
  GradeField,
  CompletionDateField,
  IssueDateField,
  CertificateIDField,
  CourseIdField,
  VerificationCodeField,
  CustomTextField,
  CertificateTitleField,
} from '../types/template';

// ---------------------------------------------------------------------------
// HTML escape (used by the HTML string renderer, not the React DOM renderer)
// ---------------------------------------------------------------------------

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

const DEFAULT_DATE_FORMAT = 'PPP';

export function formatDate(value: string | Date | undefined, formatToken?: string): string {
  if (!value) return '';
  const date = typeof value === 'string' ? parseISO(value) : value;
  if (!isValidDate(date)) return '';
  try {
    return formatDateFn(date, formatToken || DEFAULT_DATE_FORMAT);
  } catch {
    // Bad format token — fall back to ISO so we don't crash the renderer.
    return date.toISOString();
  }
}

// ---------------------------------------------------------------------------
// Grade formatting
// ---------------------------------------------------------------------------

export function formatGrade(value: number | null | undefined, decimals = 1, suffix = '%'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return `${value.toFixed(Math.max(0, Math.min(2, decimals)))}${suffix}`;
}

// ---------------------------------------------------------------------------
// Resolve a field's display text given runtime data
// ---------------------------------------------------------------------------

/**
 * Returns the plain string a field should render (or empty string for
 * fields that render non-text, like QR code).
 *
 * The renderer uses this to compute the `text` to put inside the field's
 * bounding box. The QR field has its own pathway (`resolveQrSrc`).
 */
export function resolveFieldText(field: CertificateField, data: CertificateRenderData): string {
  switch (field.type) {
    case 'student_name':
      return data.studentName ?? '';
    case 'course_title':
      return data.courseTitle ?? '';
    case 'course_id': {
      const f = field as CourseIdField;
      const id = data.courseId ?? '';
      return id ? `${f.prefix ?? ''}${id}` : '';
    }
    case 'certificate_title': {
      const f = field as CertificateTitleField;
      return f.text ?? data.certificateTitle ?? '';
    }
    case 'completion_date': {
      const f = field as CompletionDateField;
      return formatDate(data.completionDate, f.format);
    }
    case 'issue_date': {
      const f = field as IssueDateField;
      return formatDate(data.issueDate, f.format);
    }
    case 'instructor_name':
      return data.instructorName ?? '';
    case 'organization_name':
      return data.organizationName ?? '';
    case 'certificate_id': {
      const f = field as CertificateIDField;
      const id = data.certificateId ?? '';
      return id ? `${f.prefix ?? ''}${id}` : '';
    }
    case 'verification_code': {
      const f = field as VerificationCodeField;
      const code = data.verificationCode ?? '';
      return code ? `${f.prefix ?? ''}${code}` : '';
    }
    case 'qr_code':
      // QR fields have no text component; the renderer handles the <img>.
      return '';
    case 'grade': {
      const f = field as GradeField;
      return formatGrade(data.grade, f.decimals ?? 1, f.suffix ?? '%');
    }
    case 'custom_text':
      return (field as CustomTextField).text ?? '';
  }
}

// ---------------------------------------------------------------------------
// QR code resolution
// ---------------------------------------------------------------------------

/**
 * 1×1 transparent PNG used as the placeholder when no verificationUrl is set
 * (preview-before-issuance). It keeps the bbox occupied without revealing a
 * misleading code.
 */
const PLACEHOLDER_QR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Generate the QR code data URL for a QR field. Lazy-imports the `qrcode`
 * library so the renderer module stays light when no QR fields are present.
 *
 * Returns the placeholder data URL when no `verificationUrl` is provided.
 */
export async function resolveQrSrc(
  data: CertificateRenderData,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M',
): Promise<string> {
  if (!data.verificationUrl) return PLACEHOLDER_QR_DATA_URL;
  // Dynamic import — keeps qrcode out of the synchronous critical path.
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(data.verificationUrl, {
    errorCorrectionLevel,
    width: 600, // generated at high res; CSS scales it into the field bbox
    margin: 1,
  });
}

export const QR_PLACEHOLDER_SRC = PLACEHOLDER_QR_DATA_URL;
