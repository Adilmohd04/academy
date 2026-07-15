/**
 * Template resolution.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Property 7
 * (template resolution is a pure function of (course, templates, revisions)).
 *
 * Resolution order, given a `courseId`:
 *
 *   1. The course's own template, IF its latest approved revision exists.
 *      (Pending and rejected revisions are ignored — issuance keeps using
 *       the prior approved version while a teacher edit awaits approval.)
 *
 *   2. The single global template flagged `is_default = true` AND
 *      `approval_status = 'approved'` AND `course_id IS NULL`.
 *
 *   3. `null` — nothing to render. Issuance fails fast with a structured
 *      error so the operator sees that no template is configured.
 *
 * Returns the *resolved template_data JSON* (already approved). The caller
 * deep-clones this into `certificates.template_snapshot` at issuance time,
 * which is what makes Property 8 (snapshot stability) hold: future template
 * edits can never alter the visual content of a historical certificate.
 */

import { supabase } from '../../../config/database';

export interface ResolvedTemplate {
  /** The DB id of the certificate_templates row. Null when the default global is the only candidate and it has no row. */
  template_id: string | null;
  /** The JSON shape persisted under `certificate_templates.template_data`. */
  template_data: Record<string, unknown>;
  /** Where the resolution came from — useful for logs and the `template_snapshot` audit trail. */
  source: 'course' | 'global_default';
}

/**
 * Resolve the template that should be used to render a certificate for the
 * given course. Returns `null` when no approved template is available.
 */
export async function resolveTemplate(courseId: string): Promise<ResolvedTemplate | null> {
  const courseRes = await supabase
    .from('certificate_templates')
    .select('id, course_id, template_data, approval_status, is_default')
    .eq('course_id', courseId)
    .eq('approval_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!courseRes.error && courseRes.data) {
    return {
      template_id: courseRes.data.id,
      template_data: (courseRes.data.template_data ?? {}) as Record<string, unknown>,
      source: 'course',
    };
  }

  const globalRes = await supabase
    .from('certificate_templates')
    .select('id, course_id, template_data, approval_status, is_default')
    .is('course_id', null)
    .eq('is_default', true)
    .eq('approval_status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!globalRes.error && globalRes.data) {
    return {
      template_id: globalRes.data.id,
      template_data: (globalRes.data.template_data ?? {}) as Record<string, unknown>,
      source: 'global_default',
    };
  }

  return null;
}
