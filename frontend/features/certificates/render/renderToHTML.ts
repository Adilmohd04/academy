/**
 * Server-side / standalone HTML stringifier for the certificate.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §6.1.
 *
 * Calls `react-dom/server`'s `renderToStaticMarkup` against the same
 * `<CertificateRenderer>` component the browser preview uses, so the
 * resulting HTML is structurally identical to what the user sees in the
 * designer (Property 6).
 *
 * Used by:
 *   - Backend PDF service (Puppeteer page.setContent + page.pdf)
 *   - Server components rendering issued certificates without React hydration
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  CertificateRenderData,
  CertificateTemplate,
} from '../types/template';
import {
  CertificateRenderer,
  prepareQrSrcMap,
} from './CertificateRenderer';
import { ALLOWED_FONTS } from '../types/template';

export interface RenderToHTMLOptions {
  /** Optional viewport background — defaults to white. */
  pageBackground?: string;
  /** When true, emit a full HTML document with `<html>`, `<head>`, `<body>`. Defaults to true. */
  fullDocument?: boolean;
  /**
   * Web font URL roots. The Puppeteer renderer ships TTF/OTF files locally;
   * this option lets the caller inject `@font-face` rules so the PDF uses the
   * exact same glyphs the designer previews use (Req 12.3).
   *
   * Each entry: `{ family: 'Inter', src: 'file:///path/to/Inter-Regular.ttf', weight: 400 }`.
   * If omitted, the document falls back to whatever the browser/Puppeteer
   * already has installed (system-ui).
   */
  fontFaces?: Array<{ family: string; src: string; weight?: number; style?: 'normal' | 'italic' }>;
}

/**
 * Render a `CertificateTemplate` to a complete HTML string suitable for
 * Puppeteer's `page.setContent`. Generates QR data URLs first so the
 * resulting markup is fully self-contained (no external network calls
 * during PDF generation).
 *
 * Returns a promise because QR generation is async.
 */
export async function renderToHTML(
  template: CertificateTemplate,
  data: CertificateRenderData,
  options: RenderToHTMLOptions = {},
): Promise<string> {
  const qrSrcMap = await prepareQrSrcMap(template, data);

  const body = renderToStaticMarkup(
    React.createElement(CertificateRenderer, {
      template,
      data,
      qrSrcMap,
      preview: false,
    }),
  );

  if (options.fullDocument === false) return body;

  const fontFaceCSS = (options.fontFaces ?? [])
    .map(
      (f) =>
        `@font-face { font-family: "${escape(f.family)}"; src: url("${escape(f.src)}") format("truetype"); ${
          f.weight ? `font-weight: ${f.weight};` : ''
        } ${f.style ? `font-style: ${f.style};` : ''} font-display: block; }`,
    )
    .join('\n');

  const allowedFontList = ALLOWED_FONTS.map((f) => `"${f}"`).join(', ');
  const pageBg = options.pageBackground ?? '#ffffff';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Certificate</title>
    <style>
      ${fontFaceCSS}
      html, body { margin: 0; padding: 0; background: ${pageBg}; }
      body { font-family: ${allowedFontList}, system-ui, -apple-system, sans-serif; }
      *, *::before, *::after { box-sizing: border-box; }
      img { display: block; }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal HTML escape for attribute values inside the inline `<style>`. */
function escape(s: string): string {
  return String(s).replace(/[<>"&]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&amp;',
  );
}
