/**
 * DraggableField — wraps a single CertificateField in pointer-driven drag +
 * resize handles + a selection ring.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 1.5, 1.7, design §7.3.
 *
 * Critical performance constraints:
 *
 * 1. Subscribes to a single field via a Zustand selector. When *any* other
 *    field moves, this component does NOT re-render — that's how we hit the
 *    30+ fps drag target with 20+ fields on the canvas.
 *
 * 2. The drag and resize hooks dispatch deltas to the store, which applies
 *    the pure geometry math from `../../store/geometry`. No DOM math here.
 *
 * 3. The field's content (the rendered preview of student name / grade /
 *    custom text / etc.) is delegated to `<FieldPreview>` so the wrapping
 *    chrome (drag handle, resize handles) is independent of which field
 *    type is being edited.
 */

import React, { memo, useCallback } from 'react';
import { useDesignerStore, selectFieldById } from '../../store/designerStore';
import type { CertificateField } from '../../types/template';
import { fieldStyle } from '../../render/positioning';
import { resolveFieldText, QR_PLACEHOLDER_SRC } from '../../render/valueResolution';
import type { CertificateRenderData } from '../../types/template';
import { useDraggable } from '../../hooks/useDraggable';
import { useResizable } from '../../hooks/useResizable';
import type { ResizeHandle } from '../../store/geometry';

export interface DraggableFieldProps {
  fieldId: string;
  /** Mock data for the live preview inside the bbox. */
  previewData: CertificateRenderData;
  /** Pre-resolved QR data URLs by field id (for QR fields). */
  qrSrcMap?: Record<string, string>;
  /** When false, drag and resize are disabled (read-only / teacher-locked mode). */
  editable?: boolean;
}

const ALL_HANDLES: ResizeHandle[] = [
  'top-left', 'top', 'top-right', 'right',
  'bottom-right', 'bottom', 'bottom-left', 'left',
];

function DraggableFieldImpl({ fieldId, previewData, qrSrcMap, editable = true }: DraggableFieldProps) {
  const field = useDesignerStore(selectFieldById(fieldId));
  const isSelected = useDesignerStore((s) => s.selectedFieldId === fieldId);
  const zoom = useDesignerStore((s) => s.zoom);
  const moveSelected = useDesignerStore((s) => s.moveSelected);
  const resizeSelected = useDesignerStore((s) => s.resizeSelected);
  const selectField = useDesignerStore((s) => s.selectField);

  // Drag accumulates deltas relative to drag start. The hook reports
  // *cumulative* (dx, dy), so we translate that into incremental store calls
  // by tracking the last reported delta locally.
  const lastDragRef = React.useRef({ dx: 0, dy: 0 });

  const { ref: dragRef } = useDraggable<HTMLDivElement>({
    zoom,
    enabled: editable && isSelected,
    onStart: () => {
      lastDragRef.current = { dx: 0, dy: 0 };
    },
    onDrag: (dx, dy) => {
      const incDx = dx - lastDragRef.current.dx;
      const incDy = dy - lastDragRef.current.dy;
      lastDragRef.current = { dx, dy };
      if (incDx !== 0 || incDy !== 0) moveSelected(incDx, incDy);
    },
  });

  // Same accumulator pattern for resize.
  const lastResizeRef = React.useRef({ dx: 0, dy: 0 });
  const { beginResize } = useResizable({
    zoom,
    enabled: editable && isSelected,
    onStart: () => {
      lastResizeRef.current = { dx: 0, dy: 0 };
    },
    onResize: (handle, dx, dy) => {
      const incDx = dx - lastResizeRef.current.dx;
      const incDy = dy - lastResizeRef.current.dy;
      lastResizeRef.current = { dx, dy };
      if (incDx !== 0 || incDy !== 0) resizeSelected(handle, incDx, incDy);
    },
  });

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectField(fieldId);
    },
    [fieldId, selectField],
  );

  if (!field || !field.visible) return null;

  const wrapperStyle: React.CSSProperties = {
    ...fieldStyle(field),
    cursor: editable && isSelected ? 'move' : 'pointer',
    outline: isSelected ? '2px solid rgb(99,102,241)' : '1px dashed rgba(15,23,42,0.18)',
    outlineOffset: '0px',
  };

  return (
    <div
      ref={dragRef}
      style={wrapperStyle}
      onClick={onClick}
      data-field-id={fieldId}
      data-field-type={field.type}
      role="button"
      aria-label={`${field.type} field`}
      tabIndex={0}
    >
      <FieldPreview field={field} data={previewData} qrSrc={qrSrcMap?.[fieldId]} />

      {editable && isSelected ? (
        <>
          {ALL_HANDLES.map((h) => (
            <div
              key={h}
              onPointerDown={beginResize(h)}
              style={resizeHandleStyle(h)}
              aria-label={`Resize ${h}`}
              role="separator"
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field content
// ---------------------------------------------------------------------------

function FieldPreview({
  field,
  data,
  qrSrc,
}: {
  field: CertificateField;
  data: CertificateRenderData;
  qrSrc?: string;
}) {
  if (field.type === 'qr_code') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={qrSrc ?? QR_PLACEHOLDER_SRC}
        alt=""
        aria-hidden="true"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }
  return <span style={{ width: '100%' }}>{resolveFieldText(field, data)}</span>;
}

// ---------------------------------------------------------------------------
// Resize handles
// ---------------------------------------------------------------------------

function resizeHandleStyle(handle: ResizeHandle): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    background: '#fff',
    border: '2px solid rgb(99,102,241)',
    borderRadius: 2,
    zIndex: 10,
  };

  // Position + cursor by handle name. Negative offsets place the handle so
  // its center sits exactly on the field's edge/corner.
  const offset = -5;
  const positions: Record<ResizeHandle, React.CSSProperties> = {
    'top-left':     { top: offset, left: offset, cursor: 'nwse-resize' },
    'top':          { top: offset, left: '50%', marginLeft: offset, cursor: 'ns-resize' },
    'top-right':    { top: offset, right: offset, cursor: 'nesw-resize' },
    'right':        { top: '50%', right: offset, marginTop: offset, cursor: 'ew-resize' },
    'bottom-right': { bottom: offset, right: offset, cursor: 'nwse-resize' },
    'bottom':       { bottom: offset, left: '50%', marginLeft: offset, cursor: 'ns-resize' },
    'bottom-left':  { bottom: offset, left: offset, cursor: 'nesw-resize' },
    'left':         { top: '50%', left: offset, marginTop: offset, cursor: 'ew-resize' },
  };

  return { ...base, ...positions[handle] };
}

export const DraggableField = memo(DraggableFieldImpl);
