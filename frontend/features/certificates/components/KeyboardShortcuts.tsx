/**
 * KeyboardShortcuts — global key handler attached at the designer root.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, Req 1.11, 15.1.
 *
 * Renders nothing visible. Listens for:
 *   - Arrow keys: nudge selected field one grid step (or 1px when snap off)
 *   - Delete / Backspace: remove selected field
 *   - Escape: deselect
 *   - Cmd/Ctrl + Z: undo
 *   - Cmd/Ctrl + Shift + Z OR Cmd/Ctrl + Y: redo
 *
 * The handlers are attached to `window` so they fire regardless of which
 * element has focus, EXCEPT when focus is inside an input/textarea (we don't
 * want to delete a field when the user hits Backspace in a textbox).
 */

import { useEffect } from 'react';
import { useDesignerStore } from '../store/designerStore';

export function KeyboardShortcuts(): null {
  const nudgeSelected = useDesignerStore((s) => s.nudgeSelected);
  const selectField = useDesignerStore((s) => s.selectField);
  const removeField = useDesignerStore((s) => s.removeField);
  const undo = useDesignerStore((s) => s.undo);
  const redo = useDesignerStore((s) => s.redo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextEditingTarget(e.target)) return;

      const state = useDesignerStore.getState();
      const selectedId = state.selectedFieldId;

      // Undo / redo (Cmd or Ctrl)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        if (selectedId) selectField(null);
        return;
      }

      if (!selectedId) return;

      // Delete — remove field
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeField(selectedId);
        return;
      }

      // Arrows — nudge
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); nudgeSelected('up'); break;
        case 'ArrowDown': e.preventDefault(); nudgeSelected('down'); break;
        case 'ArrowLeft': e.preventDefault(); nudgeSelected('left'); break;
        case 'ArrowRight': e.preventDefault(); nudgeSelected('right'); break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudgeSelected, redo, removeField, selectField, undo]);

  return null;
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}
