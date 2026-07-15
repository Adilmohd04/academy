/**
 * useDraggable — pointer-based drag handler for canvas fields.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §7.3.
 *
 * Listens to `pointerdown` on the target ref and, once a drag is detected,
 * adds `pointermove` / `pointerup` listeners to `document`. Calls back with
 * `(dx, dy)` deltas in canvas pixels (already corrected for the current
 * `zoom` factor). The store applies snap-to-grid + clamping in pure code.
 *
 * Why custom instead of react-rnd: we need fine-grained control over which
 * field re-renders during a drag (Zustand selector-based subs handle that),
 * and we don't need any of react-rnd's positioning / resize overlays.
 */

import { useCallback, useEffect, useRef } from 'react';

export interface UseDraggableOptions {
  /** Current zoom factor — drags in screen pixels are divided by this to get canvas-pixel deltas. */
  zoom: number;
  /** Called when the drag starts (single firing). */
  onStart?: () => void;
  /** Called every pointer-move with cumulative `(dx, dy)` since drag start, in canvas pixels. */
  onDrag: (dx: number, dy: number) => void;
  /** Called when the drag ends (single firing). */
  onEnd?: () => void;
  /** When false, pointerdown is ignored. Useful for read-only mode. */
  enabled?: boolean;
}

interface DragState {
  startX: number;
  startY: number;
  active: boolean;
}

export function useDraggable<T extends HTMLElement>(opts: UseDraggableOptions) {
  const ref = useRef<T | null>(null);
  const stateRef = useRef<DragState>({ startX: 0, startY: 0, active: false });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (optsRef.current.enabled === false) return;
    if (e.button !== 0) return; // primary button only
    stateRef.current = { startX: e.clientX, startY: e.clientY, active: true };
    optsRef.current.onStart?.();
    // Capture pointer so subsequent moves are reliably delivered even if the
    // pointer leaves the element (target may not exist on document — that's ok).
    try {
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    } catch {
      /* setPointerCapture is best-effort */
    }
    e.preventDefault();
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.addEventListener('pointerdown', handlePointerDown);
    return () => node.removeEventListener('pointerdown', handlePointerDown);
  }, [handlePointerDown]);

  // Document-level move/up listeners — registered once on mount so we don't
  // attach/detach on every drag (which would cost performance during fast drags).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!stateRef.current.active) return;
      const z = optsRef.current.zoom || 1;
      const dx = (e.clientX - stateRef.current.startX) / z;
      const dy = (e.clientY - stateRef.current.startY) / z;
      optsRef.current.onDrag(dx, dy);
    };

    const onUp = (e: PointerEvent) => {
      if (!stateRef.current.active) return;
      stateRef.current.active = false;
      optsRef.current.onEnd?.();
      // Reset start so a subsequent drag computes deltas correctly.
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return { ref };
}
