/**
 * Deterministic serialize / parse pair for `CertificateTemplate` JSON.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §4.1, Properties 1–3.
 *
 * Properties this module guarantees:
 *
 *   1. Round-trip:    parse(serialize(t))            deeply equals t
 *                     serialize(parse(serialize(t))) === serialize(t)   (byte-identical)
 *
 *   2. Forward-compat: removing optional / future fields and reparsing
 *                      yields a template with those fields absent and
 *                      no thrown error.
 *
 *   3. Robustness:    parse(s) throws TemplateParseError with a non-empty
 *                     `.path` for any non-valid input. No other exception
 *                     class escapes.
 */

import { z } from 'zod';
import type { CertificateTemplate } from './template';
import { templateReadSchema, templateWriteSchema } from './schema';
import { TemplateParseError } from './errors';

// ---------------------------------------------------------------------------
// serialize — deterministic JSON.stringify with stable key order
// ---------------------------------------------------------------------------

/**
 * Sort object keys recursively. Arrays preserve order (their position is part
 * of the data); plain object keys are sorted ascendingly.
 *
 * We avoid JSON.stringify's `replacer` arg because that fires once per
 * key/value pair without a stable mechanism for re-ordering keys; building
 * a normalized clone and then stringifying it is simpler and equivalent.
 */
function withSortedKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => withSortedKeys(item));

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = withSortedKeys(obj[key]);
  }
  return out;
}

/**
 * Serialize a `CertificateTemplate` to a deterministic JSON string.
 *
 * Validates against the strict (write) schema first so we never silently
 * persist a template with out-of-range styles or unknown field types.
 */
export function serialize(template: CertificateTemplate): string {
  const parsed = templateWriteSchema.safeParse(template);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new TemplateParseError(
      `Cannot serialize invalid template: ${first?.message ?? 'unknown error'}`,
      pointerFromPath(first?.path ?? []),
      parsed.error.issues.map((iss) => ({
        path: pointerFromPath(iss.path),
        message: iss.message,
      })),
    );
  }
  return JSON.stringify(withSortedKeys(parsed.data));
}

// ---------------------------------------------------------------------------
// parse — Zod parse with permissive read schema, surface .path on error
// ---------------------------------------------------------------------------

/**
 * Parse a JSON string into a `CertificateTemplate`. Throws
 * `TemplateParseError` (and only `TemplateParseError`) on any failure.
 *
 * Uses the permissive read schema so unknown field types load cleanly. The
 * renderer is responsible for skipping fields whose `type` is not one of
 * the 12 known kinds.
 */
export function parse(json: string): CertificateTemplate {
  if (typeof json !== 'string') {
    throw new TemplateParseError('Input is not a string', '/');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid JSON';
    throw new TemplateParseError(`Invalid JSON: ${message}`, '/');
  }

  const parsed = templateReadSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new TemplateParseError(
      first?.message ?? 'Template did not match schema',
      pointerFromPath(first?.path ?? []),
      parsed.error.issues.map((iss) => ({
        path: pointerFromPath(iss.path),
        message: iss.message,
      })),
    );
  }

  // The read schema's `fields` element type is `KnownField | UnknownField`.
  // The CertificateTemplate type only allows known fields; we cast via
  // `unknown` here because the renderer (not this layer) is responsible for
  // skipping unknown-typed fields. Property 2 explicitly tolerates them.
  return parsed.data as unknown as CertificateTemplate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Zod `path` array (e.g. ['fields', 3, 'fontSize']) into a JSON
 * pointer string (e.g. '/fields/3/fontSize'). Returns '/' for empty paths.
 *
 * Per RFC 6901 we escape '~' as '~0' and '/' as '~1', so user-controlled keys
 * cannot accidentally produce ambiguous pointers.
 */
export function pointerFromPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) return '/';
  const segments = path.map((seg) => {
    const s = String(seg);
    return s.replace(/~/g, '~0').replace(/\//g, '~1');
  });
  return '/' + segments.join('/');
}

/**
 * Type-guarded check used by tests and the renderer when they want to
 * inspect parser results without re-running validation.
 */
export function isCertificateTemplate(value: unknown): value is CertificateTemplate {
  return templateReadSchema.safeParse(value).success;
}

// Re-export TemplateParseError so callers can `instanceof`-check it via this
// module without importing from the errors file separately.
export { TemplateParseError };

// Provide the inferred Zod types as a convenience for callers that want them.
export type ParsedTemplate = z.infer<typeof templateReadSchema>;
