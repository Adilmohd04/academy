/**
 * Errors thrown by the template parser/serializer pair.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Property 3 (malformed-input
 * parser robustness).
 */

/**
 * Thrown by `parse(json)` when the input cannot be parsed into a valid
 * `CertificateTemplate`. Carries a JSON-pointer–style `path` describing
 * the location of the offending value, so callers can highlight the exact
 * field in the designer.
 *
 * Examples:
 *   path = '/fields/3/fontSize'
 *   path = '/canvas/width'
 *   path = '/' (root invalid)
 */
export class TemplateParseError extends Error {
  public readonly path: string;
  /** Optional underlying Zod-style issue list, useful for tooling. */
  public readonly issues: Array<{ path: string; message: string }>;

  constructor(message: string, path: string, issues: Array<{ path: string; message: string }> = []) {
    super(message);
    this.name = 'TemplateParseError';
    this.path = path;
    this.issues = issues;
    // Required for `instanceof` to work after the class is transpiled.
    Object.setPrototypeOf(this, TemplateParseError.prototype);
  }
}
