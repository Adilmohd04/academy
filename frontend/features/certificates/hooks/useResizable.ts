/**
 * useResizable — pointer-based resize handler for canvas fields.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §7.3.
 *
 * Same idea as `useDraggable`: pointerdown on a handle, pointermove/up on
 * document. Reports cumulative `(dx, dy)` deltas in canvas pixels along with
 * which corner/edge handle was grabbed.
 *
 * The store's `resizeSelected(handle, dx, dy)` does the actual geometry math
 * (clamps, holds the opposite corner fixed, etc.).
 */

import { useCallback, useEffect, useRef } from 'react';
import type { ResizeHandle } from '../store/geometry';

export interface UseResizableOptions {
  zoom: number;
  onStart?: (handle: ResizeHandle) => void;
  onResize: (handle: ResizeHandle, dx: number, dy: number) => void;
  onEnd?: (handle: ResizeHandle) => void;
  enabled?: boolean;
}

interface ResizeState {
  handle: ResizeHandle | null;
  startX: number;
  startY: number;
  active: boolean;
}

export function useResizable(opts: UseResizableOptions) {
  const stateRef = useRef<ResizeState>({ handle: null, startX: 0, startY: 0, active: false });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  /**
   * Call this on the `pointerdown` of a resize handle, e.g.
   * `<div onPointerDown={(e) => beginResize('top-left', e)}>`.
   */
  const beginResize = useCallback((handle: ResizeHandle) => (e: React.PointerEvent) => {
    if (optsRef.current.enabled === false) return;
    if (e.button !== 0) return;
    stateRef.current = { handle, startX: e.clientX, startY: e.clientY, active: true };
    optsRef.current.onStart?.(handle);
    try {
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    } catch {
      /* best-effort */
    }
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s.active || !s.handle) return;
      const z = optsRef.current.zoom || 1;
      const dx = (e.clientX - s.startX) / z;
      const dy = (e.clientY - s.startY) / z;
      optsRef.current.onResize(s.handle, dx, dy);
    };

    const onUp = (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s.active || !s.handle) return;
      const handle = s.handle;
      s.active = false;
      s.startX = e.clientX;
      s.startY = e.clientY;
      optsRef.current.onEnd?.(handle);
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

  return { beginResize };
}
