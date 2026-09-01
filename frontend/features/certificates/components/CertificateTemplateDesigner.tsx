/**
 * Public CertificateTemplateDesigner — feature-flag-gated shell.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §14, task 12.1.
 *
 * Picks v2 (the redesigned visual studio) when
 * `NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2` is truthy. Otherwise falls back to
 * the legacy designer at `@/components/certificates/CertificateTemplateDesigner`.
 *
 * Phase 5 (task 29) flips the env-template default to "1" and removes the
 * legacy branch.
 */

'use client';

import React from 'react';
import { isCertDesignerV2Enabled } from '../featureFlags';
import LegacyDesigner from '@/components/certificates/CertificateTemplateDesigner';
import CertificateTemplateDesignerV2 from './CertificateTemplateDesignerV2';

interface Props {
  mode: 'admin' | 'teacher';
  courseId?: string;
  // Retained for the legacy fallback only. The v2 designer trusts the Clerk
  // bearer token and never transmits a client-provided user identifier.
  userId?: string | null;
}

export default function CertificateTemplateDesigner(props: Props) {
  if (isCertDesignerV2Enabled()) {
    return <CertificateTemplateDesignerV2 mode={props.mode} courseId={props.courseId} />;
  }
  return <LegacyDesigner {...props} />;
}
