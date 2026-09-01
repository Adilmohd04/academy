/**
 * AlignmentGuides — center-axis guide lines shown when a field is being
 * dragged near the canvas center.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 1.10, Property 5.
 *
 * The store doesn't track drag state explicitly — instead, the parent
 * component reads the currently-selected field's position and calls
 * `computeAlignmentGuides` from `../../store/geometry`. This keeps the
 * predicate pure and testable without DOM coupling.
 */

import React, { memo } from 'react';

export interface AlignmentGuidesProps {
  canvasWidth: number;
  canvasHeight: number;
  /** Show the vertical centerline (when a field's vertical center is near canvas center). */
  showVertical: boolean;
  /** Show the horizontal centerline. */
  showHorizontal: boolean;
  color?: string;
}

function AlignmentGuidesImpl({
  canvasWidth,
  canvasHeight,
  showVertical,
  showHorizontal,
  color = 'rgba(99, 102, 241, 0.7)', // indigo-500 @ 70%
}: AlignmentGuidesProps) {
  if (!showVertical && !showHorizontal) return null;
  return (
    <svg
      width={canvasWidth}
      height={canvasHeight}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}
      aria-hidden="true"
    >
      {showVertical ? (
        <line
          x1={canvasWidth / 2}
          y1={0}
          x2={canvasWidth / 2}
          y2={canvasHeight}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="6 4"
        />
      ) : null}
      {showHorizontal ? (
        <line
          x1={0}
          y1={canvasHeight / 2}
          x2={canvasWidth}
          y2={canvasHeight / 2}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="6 4"
        />
      ) : null}
    </svg>
  );
}

export const AlignmentGuides = memo(AlignmentGuidesImpl);
