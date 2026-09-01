---
name: theme-factory
description: >
  Theme Factory design skill enforcing rigid CSS variables for color tokens, typography scales, spacing, shadows, and consistent border radii.
metadata:
  origin: crossroads-hackathon
---

# Theme Factory Skill

A design skill focused on tokenizing styles using CSS variables to ensure consistency across components and prevent hardcoded styling values.

## When to Activate

- When defining design system tokens, themes, or layouts.
- When creating styling utility classes or editing global CSS styles.
- When organizing layouts with multi-layer elements (background, panel, card, hover).

## Core Design Tokens

### 1. Color Tokens (Semantic Naming)
Always use semantic CSS variable names rather than raw HEX/HSL values:
- `--bg-base`: The lowest background layer (e.g. deep slate `#060810`).
- `--bg-elevated`: Slightly elevated panels (e.g. `#0a0c18`).
- `--bg-card`: Interactive card surfaces, often semi-transparent (`rgba(11, 15, 30, 0.65)`).
- `--border`: Standard divider and element outline (`rgba(148, 163, 184, 0.08)`).
- `--border-bright`: Focused or high-contrast outlines.
- `--text-primary`: Pure readable text color (`#f8fafc`).
- `--text-secondary`: Mid-contrast descriptive labels (`#94a3b8`).
- `--text-muted`: Low-contrast disabled states (`#475569`).

### 2. Spacing & Density Tokens
Maintain a consistent 4px/8px grid system for layout margins and paddings:
- Compact/Dense: `gap-2` (8px), `p-3` (12px), `p-4` (16px).
- Loose/Spacious: `gap-6` (24px), `p-6` (24px), `p-8` (32px).

### 3. Border Radii & Corners
Enforce clean, rounded visual rhythm:
- Small (badges, tags): `rounded-md` (6px) or `rounded-lg` (8px).
- Medium (cards, controls): `rounded-xl` (12px) or `rounded-2xl` (16px).
- Circular (buttons, profile indicators): `rounded-full` (9999px).

## Implementation Guidelines

- **Always declare tokens in `:root`** or theme class contexts.
- **Reference variables** in component styles: `background: var(--bg-card); border: 1px solid var(--border);`.
- **Avoid hardcoded Tailwind utilities** for colors if they deviate from the semantic palette (e.g. avoid `bg-slate-900` or `border-slate-800` directly; use class wrappers mapping to CSS variables or custom utility names).

## Example Prompts

- "Define the theme variables for a calm midnight palette."
- "Refactor this button to use theme-factory border and background tokens."
- "Establish tokenized padding and spacing variables for this form group."
