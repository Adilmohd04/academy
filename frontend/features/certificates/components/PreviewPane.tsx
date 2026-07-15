/**
 * PreviewPane — read-only render of the current template using mock data.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 1.6, 1.12, 12.4.
 *
 * Subscribes to the template via Zustand (re-renders on every change) and
 * delegates to the same `<CertificateRenderer>` used by the student viewer
 * and the server PDF, so what you see is what gets generated (Property 6).
 */

import React, { useEffect, useState } from 'react';
import { useDesignerStore } from '../store/designerStore';
import { CertificateRenderer, prepareQrSrcMap } from '../render/CertificateRenderer';
import type { CertificateRenderData, CertificateTemplate } from '../types/template';

const MOCK_DATA: CertificateRenderData = {
  studentName: 'Aisha Rahman',
  courseTitle: 'Advanced Tajweed Fundamentals and Recitation Mastery',
  courseId: 'COURSE-2024-XYZ789',
  certificateTitle: 'Certificate of Completion and Excellence',
  completionDate: new Date(),
  issueDate: new Date(),
  instructorName: 'Ustadh Yusuf',
  organizationName: 'Little Muslim Academy',
  certificateId: 'CERT-2024-A1B2C3',
  verificationCode: 'XXXX-XXXX-XXXX',
  verificationUrl: 'https://academy.local/verify/CERT-2024-A1B2C3',
  grade: 92.5,
};

export function PreviewPane() {
  const template = useDesignerStore((s) => s.template);
  const [qrSrcMap, setQrSrcMap] = useState<Record<string, string>>({});

  // Re-resolve QR codes whenever the template's QR field set changes.
  useEffect(() => {
    if (!template) return;
    let cancelled = false;
    prepareQrSrcMap(template, MOCK_DATA).then((m) => {
      if (!cancelled) setQrSrcMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, [template]);

  if (!template) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm">
        Loading preview…
      </div>
    );
  }

  return (
    <div className="overflow-auto p-4 bg-slate-100">
      <PreviewWrapper template={template}>
        <CertificateRenderer template={template} data={MOCK_DATA} qrSrcMap={qrSrcMap} preview />
      </PreviewWrapper>
    </div>
  );
}

/**
 * Scales the rendered canvas to fit a 480px-wide preview box. Keeps the
 * aspect ratio so the preview is always a faithful miniature.
 */
function PreviewWrapper({
  template,
  children,
}: {
  template: CertificateTemplate;
  children: React.ReactNode;
}) {
  const targetWidth = 480;
  const canvasSize = template.canvas ?? { width: 1754, height: 1240 };
  const scale = targetWidth / canvasSize.width;
  return (
    <div
      style={{
        width: targetWidth,
        height: canvasSize.height * scale,
        position: 'relative',
        boxShadow: '0 4px 24px rgba(15,23,42,0.12)',
        background: '#fff',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      >
        {children}
      </div>
    </div>
  );
}
