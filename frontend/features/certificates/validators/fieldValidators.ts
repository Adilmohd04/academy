/**
 * Inline validators for the field inspector.
 *
 * The Zod schemas in `../types/schema.ts` are the source of truth for what
 * is valid on persistence. These functions are the *inline* helpers used by
 * the field inspector UI to display per-input errors as the user types,
 * without round-tripping through Zod for every keystroke.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Property 4.
 *
 * Each `validateX` returns either `{ valid: true, value }` for a coerced and
 * validated value, or `{ valid: false, message }` for a human-readable error.
 */

import { ALLOWED_FONTS } from '../types/template';

export type ValidatorResult<T> =
  | { valid: true; value: T }
  | { valid: false; message: string };

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;
const ALIGN_VALUES = ['left', 'center', 'right', 'justify'] as const;

const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_BACKGROUND_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// ---------------------------------------------------------------------------
// fontSize: integer in [8, 200]
// ---------------------------------------------------------------------------

export function validateFontSize(input: unknown): ValidatorResult<number> {
  const n =
    typeof input === 'number'
      ? input
      : typeof input === 'string'
        ? Number(input.trim())
        : NaN;

  if (!Number.isFinite(n)) return { valid: false, message: 'Font size must be a number' };
  if (!Number.isInteger(n)) return { valid: false, message: 'Font size must be a whole number' };
  if (n < 8) return { valid: false, message: 'Font size must be at least 8' };
  if (n > 200) return { valid: false, message: 'Font size must be at most 200' };
  return { valid: true, value: n };
}

// ---------------------------------------------------------------------------
// fontWeight: one of 300..900 in 100s
// ---------------------------------------------------------------------------

export function validateFontWeight(input: unknown): ValidatorResult<(typeof FONT_WEIGHTS)[number]> {
  const n =
    typeof input === 'number'
      ? input
      : typeof input === 'string'
        ? Number(input.trim())
        : NaN;

  if (!Number.isFinite(n)) return { valid: false, message: 'Font weight must be a number' };
  if (!FONT_WEIGHTS.includes(n as (typeof FONT_WEIGHTS)[number])) {
    return {
      valid: false,
      message: `Font weight must be one of ${FONT_WEIGHTS.join(', ')}`,
    };
  }
  return { valid: true, value: n as (typeof FONT_WEIGHTS)[number] };
}

// ---------------------------------------------------------------------------
// color: #RRGGBB or #RRGGBBAA
// ---------------------------------------------------------------------------

export function validateColor(input: unknown): ValidatorResult<string> {
  if (typeof input !== 'string') return { valid: false, message: 'Color must be a string' };
  const trimmed = input.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: 'Color must be #RRGGBB or #RRGGBBAA',
    };
  }
  return { valid: true, value: trimmed };
}

// ---------------------------------------------------------------------------
// align: enum
// ---------------------------------------------------------------------------

export function validateAlign(input: unknown): ValidatorResult<(typeof ALIGN_VALUES)[number]> {
  if (typeof input !== 'string') return { valid: false, message: 'Alignment must be a string' };
  const v = input as (typeof ALIGN_VALUES)[number];
  if (!ALIGN_VALUES.includes(v)) {
    return {
      valid: false,
      message: `Alignment must be one of ${ALIGN_VALUES.join(', ')}`,
    };
  }
  return { valid: true, value: v };
}

// ---------------------------------------------------------------------------
// CustomTextField.text length ≤ 500
// ---------------------------------------------------------------------------

export const CUSTOM_TEXT_MAX_LENGTH = 500;

export function validateCustomText(input: unknown): ValidatorResult<string> {
  if (typeof input !== 'string') return { valid: false, message: 'Text must be a string' };
  if (input.length > CUSTOM_TEXT_MAX_LENGTH) {
    return {
      valid: false,
      message: `Text must be ${CUSTOM_TEXT_MAX_LENGTH} characters or fewer (currently ${input.length})`,
    };
  }
  return { valid: true, value: input };
}

// ---------------------------------------------------------------------------
// fontFamily: must be one of the whitelisted fonts (soft warning is acceptable
// at the inspector layer; the strict Zod schema is what enforces persistence)
// ---------------------------------------------------------------------------

export function validateFontFamily(input: unknown): ValidatorResult<string> {
  if (typeof input !== 'string' || !input.trim()) {
    return { valid: false, message: 'Font family is required' };
  }
  return { valid: true, value: input.trim() };
}

export function isWhitelistedFont(name: string): boolean {
  return (ALLOWED_FONTS as readonly string[]).includes(name);
}

// ---------------------------------------------------------------------------
// Background image: mime ∈ {png, jpeg, webp}, size ≤ 10 MB
// ---------------------------------------------------------------------------

export interface BackgroundImageMeta {
  mimeType: string;
  size: number;
}

export const BACKGROUND_IMAGE_MAX_BYTES = MAX_BACKGROUND_BYTES;
export const BACKGROUND_IMAGE_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

export function validateBackgroundImage(meta: BackgroundImageMeta): ValidatorResult<BackgroundImageMeta> {
  if (!ALLOWED_BACKGROUND_MIME_TYPES.has(meta.mimeType)) {
    return {
      valid: false,
      message: 'Background must be a PNG, JPEG, or WEBP image',
    };
  }
  if (!Number.isFinite(meta.size) || meta.size < 0) {
    return { valid: false, message: 'Background size is invalid' };
  }
  if (meta.size > MAX_BACKGROUND_BYTES) {
    return {
      valid: false,
      message: `Background must be ${Math.round(MAX_BACKGROUND_BYTES / 1024 / 1024)} MB or smaller`,
    };
  }
  return { valid: true, value: meta };
}

/**
 * Convenience helper for the upload widget — accepts a browser `File` and
 * forwards to `validateBackgroundImage`.
 */
export function validateBackgroundFile(file: File): ValidatorResult<BackgroundImageMeta> {
  return validateBackgroundImage({ mimeType: file.type, size: file.size });
}

// Convenience aggregate used by the inspector — runs every per-property
// validator and collects errors keyed by property name.
export interface FieldStyleInput {
  fontFamily?: unknown;
  fontSize?: unknown;
  fontWeight?: unknown;
  color?: unknown;
  align?: unknown;
}

export interface FieldStyleErrors {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  align?: string;
}

export function validateFieldStyle(input: FieldStyleInput): FieldStyleErrors {
  const errors: FieldStyleErrors = {};
  if (input.fontFamily !== undefined) {
    const r = validateFontFamily(input.fontFamily);
    if (r.valid === false) errors.fontFamily = r.message;
  }
  if (input.fontSize !== undefined) {
    const r = validateFontSize(input.fontSize);
    if (r.valid === false) errors.fontSize = r.message;
  }
  if (input.fontWeight !== undefined) {
    const r = validateFontWeight(input.fontWeight);
    if (r.valid === false) errors.fontWeight = r.message;
  }
  if (input.color !== undefined) {
    const r = validateColor(input.color);
    if (r.valid === false) errors.color = r.message;
  }
  if (input.align !== undefined) {
    const r = validateAlign(input.align);
    if (r.valid === false) errors.align = r.message;
  }
  return errors;
}
