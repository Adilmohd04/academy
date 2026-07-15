/**
 * Designer store — single source of truth for the certificate template
 * being edited, plus UI state (selected field, grid, zoom, dirty flag,
 * undo/redo history).
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §7.2.
 *
 * Implementation notes
 * --------------------
 *
 * - Built on Zustand. Components subscribe via selectors so a single
 *   `<DraggableField>` only re-renders when its own slice changes
 *   (critical for ≥30fps drag, Req 1.5).
 *
 * - All "do something" methods live on the store. Pure geometry math lives
 *   in `./geometry.ts` so tests and hooks can reuse it without going
 *   through the store.
 *
 * - History is a bounded stack (`MAX_HISTORY`). Actions that mutate the
 *   template push the previous template onto `past` and clear `future`.
 *   `undo()` / `redo()` traverse the stacks. UI state (selection, grid,
 *   zoom) is NOT included in history — only the template itself.
 *
 * - The `dirty` flag flips to `true` on any template-mutating action and
 *   back to `false` on `markSaved()`. The header's save button reads it
 *   to enable/disable.
 */

import { create } from 'zustand';
import type {
  CertificateField,
  CertificateTemplate,
  FieldType,
  GridConfig,
} from '../types/template';
import { SCHEMA_VERSION } from '../types/template';
import {
  Direction,
  moveField,
  nudgeField,
  replaceField,
  ResizeHandle,
  resizeField,
} from './geometry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_HISTORY = 100;

const DEFAULT_GRID: GridConfig = { size: 8, snap: true };

const DEFAULT_FIELD_BASE = {
  x: 100,
  y: 100,
  width: 240,
  height: 48,
  fontFamily: 'Inter',
  fontSize: 24,
  fontWeight: 400 as const,
  color: '#1B365D',
  align: 'center' as const,
  visible: true,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DesignerHistory {
  past: CertificateTemplate[];
  future: CertificateTemplate[];
}

export interface DesignerState {
  // ── Data ────────────────────────────────────────────────────────────────
  template: CertificateTemplate | null;

  // ── UI ──────────────────────────────────────────────────────────────────
  selectedFieldId: string | null;
  grid: GridConfig & { visible: boolean };
  zoom: number;

  // ── Persistence ─────────────────────────────────────────────────────────
  dirty: boolean;

  // ── History ─────────────────────────────────────────────────────────────
  history: DesignerHistory;

  // ── Actions ─────────────────────────────────────────────────────────────

  /** Replace the entire template (e.g. after loading from the API). Clears history and dirty. */
  setTemplate: (template: CertificateTemplate | null) => void;

  /** Mark the in-memory template as persisted. Sets dirty back to false. */
  markSaved: () => void;

  // Field CRUD
  addField: (type: FieldType, partial?: Partial<CertificateField>) => void;
  updateField: (fieldId: string, patch: Partial<CertificateField>) => void;
  removeField: (fieldId: string) => void;
  toggleVisibility: (fieldId: string) => void;
  selectField: (fieldId: string | null) => void;

  // Geometry actions (delegate to ./geometry.ts)
  moveSelected: (dx: number, dy: number) => void;
  resizeSelected: (handle: ResizeHandle, dx: number, dy: number) => void;
  nudgeSelected: (direction: Direction) => void;

  // Grid + zoom UI state
  setGridSize: (size: number) => void;
  setGridSnap: (snap: boolean) => void;
  setGridVisible: (visible: boolean) => void;
  setZoom: (zoom: number) => void;

  // Undo / redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDesignerStore = create<DesignerState>((set, get) => {
  /**
   * Wrap a template-mutating function so it (a) pushes the previous template
   * onto `history.past`, (b) clears `history.future`, (c) sets `dirty = true`.
   */
  const mutate = (
    transform: (current: CertificateTemplate) => CertificateTemplate,
  ): void => {
    const state = get();
    if (!state.template) return;
    const previous = state.template;
    const next = transform(previous);
    if (next === previous) return; // no-op — don't pollute history
    const trimmedPast = state.history.past.length >= MAX_HISTORY
      ? state.history.past.slice(state.history.past.length - MAX_HISTORY + 1)
      : state.history.past;
    set({
      template: next,
      history: { past: [...trimmedPast, previous], future: [] },
      dirty: true,
    });
  };

  return {
    template: null,
    selectedFieldId: null,
    grid: { ...DEFAULT_GRID, visible: true },
    zoom: 1,
    dirty: false,
    history: { past: [], future: [] },

    setTemplate: (template) => {
      set({
        template,
        selectedFieldId: null,
        history: { past: [], future: [] },
        dirty: false,
      });
    },

    markSaved: () => set({ dirty: false }),

    addField: (type, partial) => {
      mutate((tpl) => {
        const id = generateFieldId();
        const next = makeField(type, id, partial);
        return { ...tpl, fields: [...tpl.fields, next] };
      });
      // Auto-select the newly added field for an easier authoring flow.
      const last = get().template?.fields[get().template!.fields.length - 1];
      if (last) set({ selectedFieldId: last.id });
    },

    updateField: (fieldId, patch) => {
      mutate((tpl) => {
        const fields = tpl.fields.map((f) =>
          f.id === fieldId ? ({ ...f, ...patch } as CertificateField) : f,
        );
        // Reference-equality guard: if nothing changed, return tpl so mutate skips history.
        const same = fields.every((f, i) => f === tpl.fields[i]);
        return same ? tpl : { ...tpl, fields };
      });
    },

    removeField: (fieldId) => {
      mutate((tpl) => ({
        ...tpl,
        fields: tpl.fields.filter((f) => f.id !== fieldId),
      }));
      if (get().selectedFieldId === fieldId) {
        set({ selectedFieldId: null });
      }
    },

    toggleVisibility: (fieldId) => {
      mutate((tpl) => {
        const fields = tpl.fields.map((f) =>
          f.id === fieldId ? ({ ...f, visible: !f.visible } as CertificateField) : f,
        );
        return { ...tpl, fields };
      });
    },

    selectField: (fieldId) => set({ selectedFieldId: fieldId }),

    moveSelected: (dx, dy) => {
      const { template, selectedFieldId, grid } = get();
      if (!template || !selectedFieldId) return;
      const field = template.fields.find((f) => f.id === selectedFieldId);
      if (!field) return;
      mutate((tpl) => replaceField(tpl, field.id, moveField(field, dx, dy, tpl.canvas, grid)));
    },

    resizeSelected: (handle, dx, dy) => {
      const { template, selectedFieldId, grid } = get();
      if (!template || !selectedFieldId) return;
      const field = template.fields.find((f) => f.id === selectedFieldId);
      if (!field) return;
      mutate((tpl) =>
        replaceField(tpl, field.id, resizeField(field, handle, dx, dy, tpl.canvas, grid)),
      );
    },

    nudgeSelected: (direction) => {
      const { template, selectedFieldId, grid } = get();
      if (!template || !selectedFieldId) return;
      const field = template.fields.find((f) => f.id === selectedFieldId);
      if (!field) return;
      mutate((tpl) => replaceField(tpl, field.id, nudgeField(field, direction, tpl.canvas, grid)));
    },

    setGridSize: (size) => set((s) => ({ grid: { ...s.grid, size: Math.max(1, Math.round(size)) } })),
    setGridSnap: (snap) => set((s) => ({ grid: { ...s.grid, snap } })),
    setGridVisible: (visible) => set((s) => ({ grid: { ...s.grid, visible } })),
    setZoom: (zoom) =>
      set({ zoom: Math.min(Math.max(0.1, zoom), 4) }),

    undo: () => {
      const { template, history } = get();
      if (!template || history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      const newPast = history.past.slice(0, -1);
      set({
        template: previous,
        history: { past: newPast, future: [template, ...history.future] },
        dirty: true,
      });
    },

    redo: () => {
      const { template, history } = get();
      if (!template || history.future.length === 0) return;
      const next = history.future[0];
      const newFuture = history.future.slice(1);
      set({
        template: next,
        history: { past: [...history.past, template], future: newFuture },
        dirty: true,
      });
    },

    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,
  };
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectTemplate = (s: DesignerState) => s.template;
export const selectSelectedField = (s: DesignerState): CertificateField | null => {
  if (!s.template || !s.selectedFieldId) return null;
  return s.template.fields.find((f) => f.id === s.selectedFieldId) ?? null;
};
export const selectFieldById = (id: string) => (s: DesignerState): CertificateField | null => {
  if (!s.template) return null;
  return s.template.fields.find((f) => f.id === id) ?? null;
};
export const selectGrid = (s: DesignerState) => s.grid;
export const selectDirty = (s: DesignerState) => s.dirty;
export const selectCanUndo = (s: DesignerState) => s.history.past.length > 0;
export const selectCanRedo = (s: DesignerState) => s.history.future.length > 0;
export const selectFieldCount = (s: DesignerState) => s.template?.fields.length ?? 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateFieldId(): string {
  // Stable enough for client-generated UUIDs. We only need uniqueness within
  // one template, never global cryptographic uniqueness.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `f_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/**
 * Construct a new field of the given type with sensible defaults.
 * Type-specific extras (e.g. `text` for `custom_text`) are filled in here
 * so the result satisfies the discriminated union.
 */
function makeField(
  type: FieldType,
  id: string,
  partial?: Partial<CertificateField>,
): CertificateField {
  const base = { id, ...DEFAULT_FIELD_BASE };
  switch (type) {
    case 'student_name':
      return { ...base, type: 'student_name', fontSize: 36, ...partial } as CertificateField;
    case 'course_title':
      return { ...base, type: 'course_title', fontSize: 28, ...partial } as CertificateField;
    case 'course_id':
      return { ...base, type: 'course_id', fontSize: 16, ...partial } as CertificateField;
    case 'certificate_title':
      return {
        ...base,
        type: 'certificate_title',
        text: 'Certificate of Completion',
        fontSize: 42,
        ...partial,
      } as CertificateField;
    case 'completion_date':
      return { ...base, type: 'completion_date', format: 'PPP', ...partial } as CertificateField;
    case 'issue_date':
      return { ...base, type: 'issue_date', format: 'PPP', ...partial } as CertificateField;
    case 'instructor_name':
      return { ...base, type: 'instructor_name', ...partial } as CertificateField;
    case 'organization_name':
      return { ...base, type: 'organization_name', ...partial } as CertificateField;
    case 'certificate_id':
      return { ...base, type: 'certificate_id', ...partial } as CertificateField;
    case 'verification_code':
      return { ...base, type: 'verification_code', ...partial } as CertificateField;
    case 'qr_code':
      return {
        ...base,
        type: 'qr_code',
        width: 120,
        height: 120,
        errorCorrectionLevel: 'M',
        ...partial,
      } as CertificateField;
    case 'grade':
      return { ...base, type: 'grade', decimals: 1, suffix: '%', ...partial } as CertificateField;
    case 'custom_text':
      return { ...base, type: 'custom_text', text: 'New text', ...partial } as CertificateField;
  }
  // Exhaustiveness — TypeScript narrows this branch to `never` at compile time.
  throw new Error(`Unsupported field type: ${type as string}`);
}

/**
 * Build an empty template suitable for "create new template" flows. Caller
 * fills in scope, name, and (for course scope) course_id.
 */
export function makeEmptyTemplate(opts: {
  id?: string;
  name?: string;
  scope: 'global' | 'course';
  course_id: string | null;
}): CertificateTemplate {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: opts.id ?? generateFieldId(),
    name: opts.name ?? 'Untitled certificate',
    scope: opts.scope,
    course_id: opts.course_id,
    background_image_url: '',
    canvas: { width: 1754, height: 1240 },
    fields: [],
    grid: { size: 8, snap: true },
    approval: { status: 'draft', allow_teacher_editing: false },
  };
}
