/**
 * Zod schemas for the certificate template JSON shape.
 *
 * Two-faced design:
 *   - `templateReadSchema`  : permissive — unknown field types parse cleanly
 *                              as `{ type: 'unknown', ...rest }` so older or
 *                              forward-compatible templates load (Req 16.4).
 *   - `templateWriteSchema` : strict — rejects unknown field types and any
 *                              out-of-range styles (Req 7.7, 16.3).
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §4.1, §4.2.
 */

import { z } from 'zod';
import { ALLOWED_FONTS, FieldType, SCHEMA_VERSION } from './template';

// ---------------------------------------------------------------------------
// Shared primitive schemas
// ---------------------------------------------------------------------------

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/, 'must be #RRGGBB or #RRGGBBAA');

const alignSchema = z.enum(['left', 'center', 'right', 'justify']);

const fontWeightSchema = z.union([
  z.literal(300),
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
  z.literal(900),
]);

/** fontSize: integer in [8, 200] inclusive. */
const fontSizeSchema = z
  .number()
  .int('must be an integer')
  .min(8, 'must be at least 8')
  .max(200, 'must be at most 200');

const baseFieldShape = {
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  fontFamily: z.string().min(1),
  fontSize: fontSizeSchema,
  fontWeight: fontWeightSchema,
  color: colorSchema,
  align: alignSchema,
  visible: z.boolean(),
} as const;

const dateFormatSchema = z.string().min(1).max(50).optional();

// ---------------------------------------------------------------------------
// Per-field schemas (write-mode, strict)
// ---------------------------------------------------------------------------

const studentNameField = z.object({ ...baseFieldShape, type: z.literal('student_name') });
const courseTitleField = z.object({ ...baseFieldShape, type: z.literal('course_title') });
const courseIdField = z.object({
  ...baseFieldShape,
  type: z.literal('course_id'),
  prefix: z.string().max(40).optional(),
});
const certificateTitleField = z.object({
  ...baseFieldShape,
  type: z.literal('certificate_title'),
  text: z.string().max(500).optional(),
});
const completionDateField = z.object({
  ...baseFieldShape,
  type: z.literal('completion_date'),
  format: dateFormatSchema,
});
const issueDateField = z.object({
  ...baseFieldShape,
  type: z.literal('issue_date'),
  format: dateFormatSchema,
});
const instructorNameField = z.object({ ...baseFieldShape, type: z.literal('instructor_name') });
const organizationNameField = z.object({ ...baseFieldShape, type: z.literal('organization_name') });
const certificateIdField = z.object({
  ...baseFieldShape,
  type: z.literal('certificate_id'),
  prefix: z.string().max(40).optional(),
});
const verificationCodeField = z.object({
  ...baseFieldShape,
  type: z.literal('verification_code'),
  prefix: z.string().max(40).optional(),
});
const qrCodeField = z.object({
  ...baseFieldShape,
  type: z.literal('qr_code'),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
});
const gradeField = z.object({
  ...baseFieldShape,
  type: z.literal('grade'),
  decimals: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  suffix: z.string().max(8).optional(),
});
const customTextField = z.object({
  ...baseFieldShape,
  type: z.literal('custom_text'),
  text: z.string().max(500),
});

const KNOWN_FIELD_TYPES: readonly FieldType[] = [
  'student_name',
  'course_title',
  'course_id',
  'certificate_title',
  'completion_date',
  'issue_date',
  'instructor_name',
  'organization_name',
  'certificate_id',
  'verification_code',
  'qr_code',
  'grade',
  'custom_text',
] as const;

/** Strict (write) — discriminated union over the known types. */
export const fieldWriteSchema = z.discriminatedUnion('type', [
  studentNameField,
  courseTitleField,
  courseIdField,
  certificateTitleField,
  completionDateField,
  issueDateField,
  instructorNameField,
  organizationNameField,
  certificateIdField,
  verificationCodeField,
  qrCodeField,
  gradeField,
  customTextField,
]);

/**
 * Permissive (read). If `type` matches a known FieldType, validate against the
 * strict schema. Otherwise, fall back to a passthrough that preserves the
 * unknown shape — the renderer skips these fields with a one-time warn.
 */
const unknownField = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
  })
  .passthrough();

export const fieldReadSchema = z.preprocess((raw) => raw, z.union([fieldWriteSchema, unknownField]));

// ---------------------------------------------------------------------------
// Template-level schemas
// ---------------------------------------------------------------------------

const approvalSchema = z.object({
  status: z.enum(['approved', 'pending_approval', 'rejected', 'draft']),
  approved_by: z.string().optional(),
  approved_at: z.string().optional(),
  rejection_reason: z.string().max(1000).optional(),
  allow_teacher_editing: z.boolean(),
});

const canvasSchema = z.object({
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
});

const gridSchema = z.object({
  size: z.number().int().min(1).max(500),
  snap: z.boolean(),
});

const baseTemplateShape = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  scope: z.enum(['global', 'course']),
  course_id: z.string().nullable(),
  background_image_url: z.string(),
  canvas: canvasSchema,
  grid: gridSchema.optional(),
  approval: approvalSchema,
} as const;

/** Strict template schema for writes (save/submit). */
export const templateWriteSchema = z
  .object({
    ...baseTemplateShape,
    fields: z.array(fieldWriteSchema),
  })
  .superRefine((tpl, ctx) => {
    if (tpl.scope === 'course' && !tpl.course_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course_id is required when scope is "course"',
        path: ['course_id'],
      });
    }
    if (tpl.scope === 'global' && tpl.course_id !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'course_id must be null when scope is "global"',
        path: ['course_id'],
      });
    }
  });

/** Permissive template schema for reads. Tolerates unknown field types. */
export const templateReadSchema = z.object({
  ...baseTemplateShape,
  fields: z.array(fieldReadSchema),
});

export { KNOWN_FIELD_TYPES };

/**
 * Helper used by the renderer: returns true iff `type` is one of the 12
 * known field types. Unknown-typed fields parse cleanly under
 * `templateReadSchema` and are skipped at render time.
 */
export function isKnownFieldType(type: string): boolean {
  return (KNOWN_FIELD_TYPES as readonly string[]).includes(type);
}

/**
 * Return the list of allowed font names. Wrapped here so the schema can be
 * extended later (e.g. soft warning if `fontFamily` is outside the whitelist
 * but still let it through, vs strict rejection).
 */
export function allowedFonts(): readonly string[] {
  return ALLOWED_FONTS;
}
