/**
 * Toolbar — top bar with field-add menu, grid/snap toggles, zoom, undo/redo.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 1.8, 1.9, 1.12, 15.1.
 */

import React, { useState } from 'react';
import {
  selectCanRedo,
  selectCanUndo,
  useDesignerStore,
} from '../store/designerStore';
import type { FieldType } from '../types/template';

const FIELD_TYPES: { type: FieldType; label: string; group: 'data' | 'meta' | 'identity' }[] = [
  { type: 'student_name', label: 'Student name', group: 'data' },
  { type: 'course_title', label: 'Course title', group: 'data' },
  { type: 'instructor_name', label: 'Instructor name', group: 'data' },
  { type: 'organization_name', label: 'Organization', group: 'data' },
  { type: 'completion_date', label: 'Completion date', group: 'data' },
  { type: 'issue_date', label: 'Issue date', group: 'data' },
  { type: 'grade', label: 'Grade / Score', group: 'data' },
  { type: 'certificate_title', label: 'Certificate title', group: 'meta' },
  { type: 'custom_text', label: 'Custom text', group: 'meta' },
  { type: 'certificate_id', label: 'Certificate ID', group: 'identity' },
  { type: 'course_id', label: 'Course ID', group: 'identity' },
  { type: 'verification_code', label: 'Verification code', group: 'identity' },
  { type: 'qr_code', label: 'QR code', group: 'identity' },
];

export function Toolbar() {
  const addField = useDesignerStore((s) => s.addField);
  const grid = useDesignerStore((s) => s.grid);
  const setGridVisible = useDesignerStore((s) => s.setGridVisible);
  const setGridSnap = useDesignerStore((s) => s.setGridSnap);
  const setGridSize = useDesignerStore((s) => s.setGridSize);
  const zoom = useDesignerStore((s) => s.zoom);
  const setZoom = useDesignerStore((s) => s.setZoom);
  const undo = useDesignerStore((s) => s.undo);
  const redo = useDesignerStore((s) => s.redo);
  const canUndo = useDesignerStore(selectCanUndo);
  const canRedo = useDesignerStore(selectCanRedo);

  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white text-sm">
      {/* Add field menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          aria-haspopup="menu"
          aria-expanded={addOpen}
        >
          + Add field
        </button>
        {addOpen ? (
          <div
            className="absolute z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg p-2"
            role="menu"
          >
            {(['data', 'meta', 'identity'] as const).map((group) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                  {group}
                </p>
                {FIELD_TYPES.filter((f) => f.group === group).map((f) => (
                  <button
                    key={f.type}
                    type="button"
                    onClick={() => {
                      addField(f.type);
                      setAddOpen(false);
                    }}
                    className="block w-full text-left px-2 py-1.5 rounded text-sm hover:bg-slate-100"
                    role="menuitem"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Divider />

      {/* Undo / redo */}
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className="px-2.5 py-1.5 rounded text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        aria-label="Undo"
      >
        ↶ Undo
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className="px-2.5 py-1.5 rounded text-sm font-medium border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
        aria-label="Redo"
      >
        ↷ Redo
      </button>

      <Divider />

      {/* Grid */}
      <label className="inline-flex items-center gap-1.5 text-slate-700">
        <input
          type="checkbox"
          checked={grid.visible}
          onChange={(e) => setGridVisible(e.target.checked)}
        />
        Grid
      </label>
      <label className="inline-flex items-center gap-1.5 text-slate-700">
        <input
          type="checkbox"
          checked={grid.snap}
          onChange={(e) => setGridSnap(e.target.checked)}
        />
        Snap
      </label>
      <label className="inline-flex items-center gap-1.5 text-slate-700">
        <span className="text-[11px] uppercase tracking-wider text-slate-400">Size</span>
        <input
          type="number"
          min={1}
          max={200}
          value={grid.size}
          onChange={(e) => setGridSize(Number(e.target.value))}
          className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
        />
      </label>

      <Divider />

      {/* Zoom */}
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => setZoom(zoom - 0.1)}
          className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-50"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="w-14 text-center text-xs text-slate-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(zoom + 0.1)}
          className="w-7 h-7 rounded border border-slate-200 hover:bg-slate-50"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="ml-1 px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
          aria-label="Reset zoom"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-slate-200" aria-hidden="true" />;
}
