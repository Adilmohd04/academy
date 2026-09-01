'use client';

import React, { useState } from 'react';

/**
 * Tooltips for collapsed sidebars.
 *
 * Every sidebar in this app scrolls its nav with `overflow-y-auto`, which clips
 * absolutely-positioned children horizontally — so a tooltip rendered inside a
 * nav item exists in the DOM but is never visible. These are positioned
 * `fixed`, measured from the hovered element, and rendered outside the sidebar
 * element so no ancestor can clip them.
 */

export interface SidebarTooltipState {
  label: string;
  top: number;
  left: number;
}

export function useSidebarTooltip(enabled: boolean) {
  const [tooltip, setTooltip] = useState<SidebarTooltipState | null>(null);

  const show = (label: string) => (event: React.MouseEvent | React.FocusEvent) => {
    if (!enabled) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 12 });
  };

  const hide = () => setTooltip(null);

  // Also gate on `enabled` when reading, so expanding the sidebar while a
  // tooltip is open cannot leave it stranded on screen.
  return { tooltip: enabled ? tooltip : null, show, hide };
}

export const SidebarTooltip: React.FC<{ tooltip: SidebarTooltipState | null }> = ({ tooltip }) => {
  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      className="fixed z-[100] -translate-y-1/2 pointer-events-none px-3 py-2 rounded-lg text-xs font-semibold bg-[#1e1b4b] text-white whitespace-nowrap shadow-lg border border-white/20"
      style={{ top: tooltip.top, left: tooltip.left }}
    >
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-[#1e1b4b]" />
      {tooltip.label}
    </div>
  );
};
