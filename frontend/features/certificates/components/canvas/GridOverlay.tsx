/**
 * GridOverlay — visual grid drawn on top of the canvas.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 1.8.
 *
 * Renders as a single absolutely-positioned `<svg>` covering the canvas.
 * Pure component — only re-renders when `size` or `visible` change.
 */

import React, { memo } from 'react';

export interface GridOverlayProps {
  width: number;
  height: number;
  size: number;
  visible: boolean;
  /** Stroke color for the grid lines. Default: very subtle slate. */
  color?: string;
}

function GridOverlayImpl({ width, height, size, visible, color = 'rgba(15,23,42,0.06)' }: GridOverlayProps) {
  if (!visible || size <= 0) return null;
  // Defensive: extremely tight grids (<2px) cause unusable visual noise
  // and pathological SVG size; clamp to a usable lower bound.
  const step = Math.max(2, size);

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="cert-grid" width={step} height={step} patternUnits="userSpaceOnUse">
          <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke={color} strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#cert-grid)" />
    </svg>
  );
}

export const GridOverlay = memo(GridOverlayImpl);
