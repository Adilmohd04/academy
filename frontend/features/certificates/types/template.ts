/**
 * Certificate Template — shared in-memory representation.
 *
 * This is the single source of truth for the JSON shape stored in
 *   - `certificate_templates.template_data`
 *   - `certificates.template_snapshot`
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §4.
 *
 * The renderer (DOM preview + PDF HTML) consumes this exact shape, so any
 * change here MUST be reflected in `frontend/features/certificates/render/`
 * and (eventually) the backend renderer that imports it.
 *
 * Forward-compatibility rule (Req 16.4): unknown field types parse cleanly
 * and are skipped by the renderer with a one-time `console.warn`. New field
 * types are added by extending the `FieldType` union and writing a renderer.
 */

// ---------------------------------------------------------------------------
// Discriminator and small enums
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1 as const;

export type TemplateScope = 'global' | 'course';

export type ApprovalStatus =
  | 'approved'
  | 'pending_approval'
  | 'rejected'
  | 'draft';

export type FieldType =
  | 'student_name'
  | 'course_title'
  | 'course_id'
  | 'certificate_title'
  | 'completion_date'
  | 'issue_date'
  | 'instructor_name'
  | 'organization_name'
  | 'certificate_id'
  | 'verification_code'
  | 'qr_code'
  | 'grade'
  | 'custom_text';

export type FontWeight = 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type Alignment = 'left' | 'center' | 'right' | 'justify';

/**
 * The whitelisted font set. The designer's font picker MUST only offer these.
 * Both the browser preview and the server PDF renderer must ship the same
 * fonts so preview equals output (Req 12.3, design §6.4).
 */
export const ALLOWED_FONTS = [
  'Inter',
  'Playfair Display',
  'Roboto Slab',
  'Lora',
  'Montserrat',
  'Cormorant Garamond',
] as const;

export type AllowedFont = (typeof ALLOWED_FONTS)[number];

// ---------------------------------------------------------------------------
// Base field — every CertificateField extends this
// ---------------------------------------------------------------------------

/**
 * Properties shared by every field. Coordinates are in canvas pixels with
 * top-left origin. `width` and `height` are in canvas pixels.
 */
export interface BaseField {
  /** Stable client-generated UUID. Not the database row id. */
  id: string;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string; // expected to be an AllowedFont in practice
  /** Integer in [8, 200] inclusive. */
  fontSize: number;
  fontWeight: FontWeight;
  /** #RRGGBB or #RRGGBBAA */
  color: string;
  align: Alignment;
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Discriminated union over field types
// ---------------------------------------------------------------------------

export interface StudentNameField extends BaseField {
  type: 'student_name';
}

export interface CourseTitleField extends BaseField {
  type: 'course_title';
}

export interface CourseIdField extends BaseField {
  type: 'course_id';
  /** Optional literal prefix prepended at render time. */
  prefix?: string;
}

export interface CertificateTitleField extends BaseField {
  type: 'certificate_title';
  /** Optional override text; if absent the designer-provided default is used. */
  text?: string;
}

/** Date-fns format token. Defaults to 'PPP' (e.g. "April 29, 2024") if absent. */
export interface CompletionDateField extends BaseField {
  type: 'completion_date';
  format?: string;
}

/** Date-fns format token. Defaults to 'PPP' if absent. */
export interface IssueDateField extends BaseField {
  type: 'issue_date';
  format?: string;
}

export interface InstructorNameField extends BaseField {
  type: 'instructor_name';
}

export interface OrganizationNameField extends BaseField {
  type: 'organization_name';
}

export interface CertificateIDField extends BaseField {
  type: 'certificate_id';
  /** Optional literal prefix prepended at render time. */
  prefix?: string;
}

export interface VerificationCodeField extends BaseField {
  type: 'verification_code';
  prefix?: string;
}

export interface QRCodeField extends BaseField {
  type: 'qr_code';
  /** QR error correction level — defaults to 'M'. */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface GradeField extends BaseField {
  type: 'grade';
  /** Decimal places — defaults to 1. */
  decimals?: 0 | 1 | 2;
  /** String appended after the number — defaults to '%'. */
  suffix?: string;
}

export interface CustomTextField extends BaseField {
  type: 'custom_text';
  /** Static text authored by the designer. Up to 500 characters. */
  text: string;
}

export type CertificateField =
  | StudentNameField
  | CourseTitleField
  | CourseIdField
  | CertificateTitleField
  | CompletionDateField
  | IssueDateField
  | InstructorNameField
  | OrganizationNameField
  | CertificateIDField
  | VerificationCodeField
  | QRCodeField
  | GradeField
  | CustomTextField;

// ---------------------------------------------------------------------------
// Top-level template
// ---------------------------------------------------------------------------

export interface ApprovalState {
  status: ApprovalStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  allow_teacher_editing: boolean;
}

export interface CanvasSize {
  /** Canvas width in pixels. Designer-fixed. Default: 1754 (A4 landscape @150dpi). */
  width: number;
  /** Canvas height in pixels. Designer-fixed. Default: 1240. */
  height: number;
}

export interface GridConfig {
  /** Grid increment in canvas pixels. */
  size: number;
  /** Whether dragging snaps to multiples of `size`. */
  snap: boolean;
}

export interface CertificateTemplate {
  /**
   * Schema version. Bump when a breaking shape change ships. Older serialized
   * templates with a different version still parse but the renderer should
   * inspect this and apply migrations if needed.
   */
  schemaVersion: typeof SCHEMA_VERSION;
  /** Stable id (DB row id when persisted, client-generated for unsaved drafts). */
  id: string;
  name: string;
  scope: TemplateScope;
  /** Required when `scope === 'course'`, otherwise null. */
  course_id: string | null;
  background_image_url: string;
  canvas: CanvasSize;
  fields: CertificateField[];
  /** Designer-only hint; not used by the renderer. */
  grid?: GridConfig;
  approval: ApprovalState;
}

// ---------------------------------------------------------------------------
// Runtime data passed to the renderer alongside the template
// ---------------------------------------------------------------------------

/**
 * Values substituted into Dynamic_Fields at render time.
 *
 * The renderer applies the substitution rules from Req 2.10–2.12 + 3.6:
 * - Grade is formatted to `decimals` decimal places + `suffix`
 * - Dates are formatted via `format` (date-fns)
 * - QR code src is `qrcode.toDataURL(verificationUrl)` when set
 * - Empty/null values render empty (no placeholder text), bbox preserved
 */
export interface CertificateRenderData {
  studentName?: string;
  courseTitle?: string;
  courseId?: string;
  certificateTitle?: string;
  completionDate?: string | Date;
  issueDate?: string | Date;
  instructorName?: string;
  organizationName?: string;
  certificateId?: string;
  verificationCode?: string;
  /** Numeric grade in [0, 100]. Used by Grade fields. */
  grade?: number | null;
  /**
   * URL the QR code should resolve to. Typically
   * `${VERIFICATION_PORTAL_URL}/${verificationCode}`. Required for the QR
   * field to render an actual QR; absent → renders the placeholder QR.
   */
  verificationUrl?: string;
}
