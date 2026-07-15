/**
 * Feature flags for the Certificate Designer Studio.
 *
 * One module so every consumer goes through the same predicate, and Phase 5
 * (design §14, task 29.1) can flip the default with a single line change.
 *
 * Usage:
 *   import { isCertDesignerV2Enabled } from '@/features/certificates/featureFlags';
 *   if (isCertDesignerV2Enabled()) { ... } else { ... legacy path ... }
 */

const truthy = (v: unknown): boolean => {
  if (v === true) return true;
  if (typeof v !== 'string') return false;
  const lower = v.trim().toLowerCase();
  return lower === '1' || lower === 'true' || lower === 'yes' || lower === 'on';
};

/**
 * Whether the redesigned Certificate Designer Studio (v2) is active.
 *
 * Sourced from `NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2`. Defaults to `false`
 * during Phase 2 rollout; Phase 5 will flip the env-template default to "1"
 * after the legacy code path is removed.
 */
export function isCertDesignerV2Enabled(): boolean {
  return truthy(process.env.NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2);
}
