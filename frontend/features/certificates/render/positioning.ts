/**
 * Pure positioning math shared by the DOM renderer and the HTML stringifier.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §6.1, §6.2.
 *
 * One function `fieldStyle(field)` returns the inline style object both
 * paths apply to a `<div>`. Keeping this in one place is what makes the
 * preview pixel-equivalent to the issued PDF (Req 7.5, 12.1).
 */

import type { CSSProperties } from 'react';
import type { CertificateField, Alignment } from '../types/template';

/**
 * Convert a CSS color object's `color` property and a field's text alignment
 * into a single inline style object suitable for a `<div>` that contains the
 * field's text or QR image.
 *
 * Coordinates are emitted as pixel values relative to the canvas. Both the
 * browser preview and the Puppeteer PDF render use the same canvas pixel
 * dimensions for their viewports, so no scaling is needed.
 */
export function fieldStyle(field: CertificateField): CSSProperties {
  return {
    position: 'absolute',
    left: `${field.x}px`,
    top: `${field.y}px`,
    width: `${field.width}px`,
    height: `${field.height}px`,
    fontFamily: cssFontFamily(field.fontFamily),
    fontSize: `${field.fontSize}px`,
    fontWeight: field.fontWeight,
    color: field.color,
    textAlign: field.align,
    // Use flexbox for vertical centering inside the bbox. This keeps the
    // visual baseline of single-line text consistent regardless of the
    // bbox height, which is what designers expect when they drag fields.
    display: 'flex',
    alignItems: 'center',
    justifyContent: justifyForAlign(field.align),
    overflow: 'hidden',
    // No padding/margin/border — the bbox IS the field. Designers control
    // spacing by sizing the bbox.
    padding: 0,
    margin: 0,
    boxSizing: 'border-box',
    lineHeight: 1.2,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
}

export function canvasStyle(canvas?: { width: number; height: number } | null): CSSProperties {
  const w = canvas?.width ?? 1754;
  const h = canvas?.height ?? 1240;
  return {
    position: 'relative',
    width: `${w}px`,
    height: `${h}px`,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  };
}

export function backgroundStyle(url?: string): CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
    userSelect: 'none',
    display: url ? 'block' : 'none',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap multi-word font family names in quotes per CSS spec, and add a
 * conservative fallback so a font that fails to load doesn't break layout.
 */
function cssFontFamily(name: string): string {
  const needsQuotes = /\s/.test(name);
  const quoted = needsQuotes ? `"${name}"` : name;
  return `${quoted}, system-ui, -apple-system, sans-serif`;
}

/** Map text alignment to flexbox `justify-content` for single-line layout. */
function justifyForAlign(align: Alignment): CSSProperties['justifyContent'] {
  switch (align) {
    case 'left': return 'flex-start';
    case 'right': return 'flex-end';
    case 'center': return 'center';
    case 'justify': return 'flex-start'; // textAlign handles justify; flex falls back to start
  }
}
