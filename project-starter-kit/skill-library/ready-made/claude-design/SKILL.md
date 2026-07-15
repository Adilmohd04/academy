---
name: claude-design
description: >
  Anthropic-inspired frontend design skill for building distinctive, production-grade UIs with bold aesthetics, characterful typography, and custom spatial layouts.
metadata:
  origin: crossroads-hackathon
---

# Claude Design Skill

Guidelines to break out of generic AI-generated design tropes (the "AI-slop" of purple gradients, white cards, and Inter font stacks) and build high-fidelity, visually distinctive user interfaces.

## When to Activate

- When designing or styling a user interface, page layout, or design system.
- When generating visual components, CSS stylesheets, or styling tokens.
- When refactoring existing UI to look more premium, editorial, or distinctive.

## Key Design Principles

### 1. Typography (Ban the Defaults)
- **BANNED FONTS**: Never use `Inter`, `Roboto`, `Arial`, or standard system font fallbacks as the primary display choice. Avoid `Space Grotesk` (overused by AI).
- **Aesthetic Pairings**: Commit to distinctive, characterful pairings:
  - *Editorial/Elegant*: `Outfit`, `Plus Jakarta Sans`, `Playfair Display`, `Clash Display`.
  - *Tech/Developer*: `JetBrains Mono`, `Fira Code`.
- **Contrast**: Use large type scales for headers with tight line-heights (`tracking-tight`, `leading-none`) and clean, legible sans-serif for body text.

### 2. Palette & Themes (Commit, Don't Blend)
- Avoid timid, evenly distributed color schemes (e.g. gray backgrounds with purple accents).
- Commit to a deep dark base (`#060810`, `#080b14`) or a warm, organic light base.
- Use CSS variables for all design tokens. Define a dominant accent color with highly focused glow highlights rather than large, bright gradients everywhere.

### 3. Spatial Composition
- **Break the Grid**: Avoid simple 2x2 or 3x3 grids of identical cards.
- **Asymmetry & Overlap**: Use negative space, offset layers, diagonal lines, and grid-breaking elements.
- **Data Density**: Present relevant data efficiently. "Product UI" means clean, dense layouts with compact headers and direct data displays.

### 4. Backgrounds & Micro-details
- **Atmospheric Backgrounds**: Use gradient meshes, noise overlays, and layered transparencies.
- **Thin, Crisp Borders**: Use `1px solid rgba(148, 163, 184, 0.08)` instead of thick borders or solid colors.
- **Glassmorphism**: Utilize blur overlays (`backdrop-filter: blur(16px) saturate(180%)`) for interactive container layers.

## Anti-Patterns to Reject

- **No stacked card grids** that look like generic SaaS landing pages.
- **No emoji bullets** in professional UI. Use custom SVG icons instead.
- **No carousels** without narrative purpose or custom navigation.
- **No plain white boxes** on dark/grey backgrounds without depth or glass reflections.

## Example Prompts

- "Style this dashboard to look editorial and high-density, using Outfit and Plus Jakarta Sans."
- "Apply an atmospheric dark theme with subtle grid lines and gradient meshes."
- "Refactor this card list into an asymmetric, data-dense overview."
