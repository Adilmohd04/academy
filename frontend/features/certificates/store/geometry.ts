/**
 * Pure geometry reducers for the designer canvas.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Property 5
 * (designer geometry reducers are pure).
 *
 * Every function here is referentially transparent: same input → same output,
 * no side effects, no DOM access. The Zustand store wires them up; the
 * `useDraggable`/`useResizable` hooks compute deltas and feed them in.
 */

import type {
  CertificateField,
  CertificateTemplate,
  GridConfig,
} from '../types/template';

// ---------------------------------------------------------------------------
// Snap-to-grid
// ---------------------------------------------------------------------------

/**
 * Round `value` to the nearest multiple of `gridSize`. Pure.
 *
 * `snapToGrid(0, 8) === 0`
 * `snapToGrid(7, 8) === 8`
 * `snapToGrid(11, 8) === 8`
 * `snapToGrid(12, 8) === 16`  (banker's rounding inappropriate here — we want
 * predictable behavior so we use Math.round which rounds half away from zero)
 */
export function snapToGrid(value: number, gridSize: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(gridSize) || gridSize <= 0) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

/** Apply snap-to-grid only when the grid config has `snap: true`. */
export function maybeSnap(value: number, grid?: GridConfig): number {
  return grid?.snap ? snapToGrid(value, grid.size) : value;
}

// ---------------------------------------------------------------------------
// Move
// ---------------------------------------------------------------------------

export interface XY {
  x: number;
  y: number;
}

export interface Bounds extends XY {
  width: number;
  height: number;
}

/**
 * Move a field by `(dx, dy)` and clamp to the canvas. If `grid.snap` is true,
 * the result's `x` and `y` are rounded to multiples of `grid.size`.
 *
 * Width/height are unchanged — moving doesn't resize.
 */
export function moveField(
  field: CertificateField,
  dx: number,
  dy: number,
  canvas: { width: number; height: number },
  grid?: GridConfig,
): CertificateField {
  let nextX = field.x + dx;
  let nextY = field.y + dy;
  nextX = maybeSnap(nextX, grid);
  nextY = maybeSnap(nextY, grid);
  // Clamp so the field stays inside the canvas.
  nextX = clamp(nextX, 0, Math.max(0, canvas.width - field.width));
  nextY = clamp(nextY, 0, Math.max(0, canvas.height - field.height));
  return { ...field, x: nextX, y: nextY };
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

/**
 * Resize a field by dragging one of its eight handles by `(dx, dy)`. The
 * opposite corner stays fixed. Width and height are clamped to ≥ 1px and to
 * the canvas bounds.
 */
export function resizeField(
  field: CertificateField,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  canvas: { width: number; height: number },
  grid?: GridConfig,
): CertificateField {
  let { x, y, width, height } = field;
  const right = x + width;
  const bottom = y + height;

  const movesLeftEdge = handle === 'top-left' || handle === 'left' || handle === 'bottom-left';
  const movesRightEdge = handle === 'top-right' || handle === 'right' || handle === 'bottom-right';
  const movesTopEdge = handle === 'top-left' || handle === 'top' || handle === 'top-right';
  const movesBottomEdge = handle === 'bottom-left' || handle === 'bottom' || handle === 'bottom-right';

  if (movesLeftEdge) {
    let nextX = x + dx;
    nextX = maybeSnap(nextX, grid);
    nextX = clamp(nextX, 0, right - 1);
    width = right - nextX;
    x = nextX;
  }
  if (movesRightEdge) {
    let nextRight = right + dx;
    nextRight = maybeSnap(nextRight, grid);
    nextRight = clamp(nextRight, x + 1, canvas.width);
    width = nextRight - x;
  }
  if (movesTopEdge) {
    let nextY = y + dy;
    nextY = maybeSnap(nextY, grid);
    nextY = clamp(nextY, 0, bottom - 1);
    height = bottom - nextY;
    y = nextY;
  }
  if (movesBottomEdge) {
    let nextBottom = bottom + dy;
    nextBottom = maybeSnap(nextBottom, grid);
    nextBottom = clamp(nextBottom, y + 1, canvas.height);
    height = nextBottom - y;
  }

  return { ...field, x, y, width, height };
}

// ---------------------------------------------------------------------------
// Keyboard nudge
// ---------------------------------------------------------------------------

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Nudge a field one grid increment in `direction` (or one pixel when snap is
 * disabled). Used by the arrow-key shortcut handler (Req 1.11).
 */
export function nudgeField(
  field: CertificateField,
  direction: Direction,
  canvas: { width: number; height: number },
  grid?: GridConfig,
): CertificateField {
  const step = grid?.snap ? grid.size : 1;
  let dx = 0;
  let dy = 0;
  switch (direction) {
    case 'up': dy = -step; break;
    case 'down': dy = step; break;
    case 'left': dx = -step; break;
    case 'right': dx = step; break;
  }
  return moveField(field, dx, dy, canvas, grid);
}

// ---------------------------------------------------------------------------
// Alignment guide predicate
// ---------------------------------------------------------------------------

/** Tolerance window (in canvas pixels) for the center-axis alignment guide. */
export const ALIGNMENT_GUIDE_TOLERANCE_PX = 8;

export interface AlignmentGuides {
  /** True when the field's vertical centerline is within tolerance of the canvas center. */
  vertical: boolean;
  /** True when the field's horizontal centerline is within tolerance of the canvas center. */
  horizontal: boolean;
}

/**
 * Compute which (if any) center-axis alignment guides should be visible for
 * the given field. A guide is shown iff the field's center on that axis is
 * within `ALIGNMENT_GUIDE_TOLERANCE_PX` of the canvas center on that axis.
 *
 * Pure — exposed so Property 5 can validate it directly.
 */
export function computeAlignmentGuides(
  field: Bounds,
  canvas: { width: number; height: number },
): AlignmentGuides {
  const fieldCenterX = field.x + field.width / 2;
  const fieldCenterY = field.y + field.height / 2;
  const canvasCenterX = canvas.width / 2;
  const canvasCenterY = canvas.height / 2;
  return {
    vertical: Math.abs(fieldCenterX - canvasCenterX) <= ALIGNMENT_GUIDE_TOLERANCE_PX,
    horizontal: Math.abs(fieldCenterY - canvasCenterY) <= ALIGNMENT_GUIDE_TOLERANCE_PX,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  if (lo > hi) return lo; // degenerate range (canvas smaller than field)
  return Math.min(Math.max(n, lo), hi);
}

// ---------------------------------------------------------------------------
// Convenience: replace a field inside a template
// ---------------------------------------------------------------------------

export function replaceField(
  template: CertificateTemplate,
  fieldId: string,
  next: CertificateField,
): CertificateTemplate {
  return {
    ...template,
    fields: template.fields.map((f) => (f.id === fieldId ? next : f)),
  };
}
