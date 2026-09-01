/**
 * Shared certificate renderer (DOM path).
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §6.
 *
 * One React component used in three contexts:
 *
 *   1. Live designer preview      (browser, in `<PreviewPane>`)
 *   2. Student certificate viewer (browser, in `/student/certificates`)
 *   3. Server PDF rendering       (Puppeteer page, via `renderToHTML.ts`
 *                                  which runs ReactDOMServer.renderToStaticMarkup
 *                                  against this exact tree)
 *
 * Because the same React tree is emitted in all three contexts, "what you
 * see is what students get" (Property 6, Req 12.1).
 *
 * The `qrSrcMap` prop lets the caller pre-resolve QR data URLs (which are
 * async to generate) and pass them in by field id. This keeps the component
 * synchronous and trivially server-renderable. See `prepareQrSrcMap`.
 */

import React from 'react';
import type {
  CertificateField,
  CertificateRenderData,
  CertificateTemplate,
} from '../types/template';
import { isKnownFieldType } from '../types/schema';
import { backgroundStyle, canvasStyle, fieldStyle } from './positioning';
import { QR_PLACEHOLDER_SRC, resolveFieldText, resolveQrSrc } from './valueResolution';

export interface CertificateRendererProps {
  template: CertificateTemplate;
  data?: CertificateRenderData;
  /** Map from QR field id → data URL. See `prepareQrSrcMap`. */
  qrSrcMap?: Record<string, string>;
  /**
   * In the designer, mock/preview data is injected automatically. In the
   * student viewer and the server PDF, real data is passed in.
   */
  preview?: boolean;
  /** Optional className for the outer canvas wrapper (e.g. for shadows). */
  className?: string;
}

const SAMPLE_DATA: CertificateRenderData = {
  studentName: 'Jane Doe',
  courseTitle: 'Advanced Tajweed Fundamentals and Recitation Mastery',
  courseId: 'COURSE-2024-XYZ789',
  certificateTitle: 'Certificate of Completion and Excellence',
  completionDate: new Date(),
  issueDate: new Date(),
  instructorName: 'Instructor Name',
  organizationName: 'Your Academy',
  certificateId: 'CERT-2024-A1B2C3',
  verificationCode: 'XXXX-XXXX-XXXX',
  verificationUrl: 'https://academy.local/verify/CERT-2024-A1B2C3',
  grade: 87.5,
};

/**
 * Render the certificate to a DOM tree.
 *
 * Forward-compatibility: any field whose `type` isn't one of the 12 known
 * kinds is silently skipped (Req 16.4). A single `console.warn` is emitted
 * per process to flag the unknown type.
 */
export function CertificateRenderer({
  template,
  data,
  qrSrcMap,
  preview = false,
  className,
}: CertificateRendererProps): React.JSX.Element {
  const renderData: CertificateRenderData = preview
    ? { ...SAMPLE_DATA, ...(data ?? {}) }
    : data ?? {};

  return (
    <div
      className={className}
      style={canvasStyle(template.canvas)}
      data-cert-template-id={template.id}
      data-cert-canvas-width={template.canvas?.width ?? 1754}
      data-cert-canvas-height={template.canvas?.height ?? 1240}
    >
      {template.background_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={template.background_image_url}
          alt=""
          aria-hidden="true"
          style={backgroundStyle(template.background_image_url)}
        />
      ) : null}

      {template.fields.map((field) => {
        if (!field.visible) return null;
        if (!isKnownFieldType(field.type)) {
          warnUnknownFieldType(field.type);
          return null;
        }
        return (
          <FieldRenderer
            key={field.id}
            field={field}
            data={renderData}
            qrSrc={qrSrcMap?.[field.id]}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field renderer (one per field type)
// ---------------------------------------------------------------------------

interface FieldRendererProps {
  field: CertificateField;
  data: CertificateRenderData;
  qrSrc?: string;
}

function FieldRenderer({ field, data, qrSrc }: FieldRendererProps): React.JSX.Element {
  const style = fieldStyle(field);

  if (field.type === 'qr_code') {
    const src = qrSrc ?? QR_PLACEHOLDER_SRC;
    return (
      <div style={style} data-field-id={field.id} data-field-type={field.type}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  // Every other field type is text. resolveFieldText handles substitution and
  // the empty-value rule (returns '' which renders as zero-width content while
  // the bbox is preserved by the wrapper div).
  const text = resolveFieldText(field, data);
  return (
    <div style={style} data-field-id={field.id} data-field-type={field.type}>
      {/* React text interpolation auto-escapes — no XSS via custom_text. */}
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async helper: pre-resolve QR data URLs by field id
// ---------------------------------------------------------------------------

/**
 * Walk the template, find every QR field, generate its data URL, and return
 * a map keyed by field id. Caller passes the result as `qrSrcMap` to
 * `<CertificateRenderer>`.
 *
 * Uses `verificationUrl` from `data` for every QR field — they all point at
 * the same verification URL because there's only one certificate per render.
 */
export async function prepareQrSrcMap(
  template: CertificateTemplate,
  data: CertificateRenderData,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  await Promise.all(
    template.fields.map(async (field) => {
      if (field.type !== 'qr_code') return;
      map[field.id] = await resolveQrSrc(
        data,
        (field as { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }).errorCorrectionLevel ?? 'M',
      );
    }),
  );
  return map;
}

// ---------------------------------------------------------------------------
// Forward-compat warn-once for unknown field types
// ---------------------------------------------------------------------------

const warnedTypes = new Set<string>();

function warnUnknownFieldType(type: string): void {
  if (warnedTypes.has(type)) return;
  warnedTypes.add(type);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    // eslint-disable-next-line no-console
    console.warn(
      `[CertificateRenderer] Skipping field with unknown type "${type}". This is expected when loading a template from a newer schema version.`,
    );
  }
}

export default CertificateRenderer;
