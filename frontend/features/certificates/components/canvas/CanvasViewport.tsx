/**
 * CanvasViewport — the editing surface.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §7.1.
 *
 * Composes:
 *   - background image
 *   - grid overlay (when enabled)
 *   - one <DraggableField> per template field
 *   - alignment guides for the currently-selected field
 *   - click-on-empty-space deselects
 *
 * Zoom is applied via CSS transform on a wrapper so the canvas itself
 * always reports its native pixel dimensions to descendants — that's what
 * keeps the per-field math simple and grid lines pixel-accurate.
 */

import React, { useMemo } from 'react';
import { useDesignerStore, selectGrid, selectSelectedField } from '../../store/designerStore';
import { computeAlignmentGuides } from '../../store/geometry';
import { canvasStyle, backgroundStyle } from '../../render/positioning';
import type { CertificateRenderData } from '../../types/template';
import { DraggableField } from './DraggableField';
import { GridOverlay } from './GridOverlay';
import { AlignmentGuides } from './AlignmentGuides';

export interface CanvasViewportProps {
  previewData: CertificateRenderData;
  qrSrcMap?: Record<string, string>;
  /** When false the canvas is read-only — fields cannot be dragged or selected. */
  editable?: boolean;
  className?: string;
}

export function CanvasViewport({
  previewData,
  qrSrcMap,
  editable = true,
  className,
}: CanvasViewportProps) {
  const template = useDesignerStore((s) => s.template);
  const zoom = useDesignerStore((s) => s.zoom);
  const grid = useDesignerStore(selectGrid);
  const selected = useDesignerStore(selectSelectedField);
  const selectField = useDesignerStore((s) => s.selectField);

  const guides = useMemo(() => {
    if (!template || !selected) return { vertical: false, horizontal: false };
    return computeAlignmentGuides(selected, template.canvas ?? { width: 1754, height: 1240 });
  }, [template, selected]);

  if (!template) return null;

  const canvasSize = template.canvas ?? { width: 1754, height: 1240 };
  const canvas = canvasStyle(canvasSize);
  const fieldIds = template.fields.map((f) => f.id);

  return (
    <div
      className={className}
      style={{
        // Outer wrapper carries the zoom transform — descendants see native
        // canvas pixels regardless of zoom level.
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    >
      <div
        style={{ ...canvas, boxShadow: '0 12px 40px rgba(15,23,42,0.12)' }}
        onClick={() => editable && selectField(null)}
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

        <GridOverlay
          width={canvasSize.width}
          height={canvasSize.height}
          size={grid.size}
          visible={grid.visible}
        />

        {fieldIds.map((id) => (
          <DraggableField
            key={id}
            fieldId={id}
            previewData={previewData}
            qrSrcMap={qrSrcMap}
            editable={editable}
          />
        ))}

        <AlignmentGuides
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          showVertical={guides.vertical && !!selected}
          showHorizontal={guides.horizontal && !!selected}
        />
      </div>
    </div>
  );
}
