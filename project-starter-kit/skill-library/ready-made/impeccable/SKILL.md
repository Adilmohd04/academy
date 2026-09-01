---
name: impeccable
description: >
  Impeccable design skill that separates design vocabularies into Brand Mode (marketing, bold layout, typography) and Product Mode (app UI, high density, micro-interactions).
metadata:
  origin: crossroads-hackathon
---

# Impeccable Design Skill

A design skill focused on separating marketing and editorial sites (Brand Mode) from complex dashboards and app interfaces (Product Mode).

## When to Activate

- When designing multi-step interactive workflows, forms, or simulators.
- When organizing complex dashboard screens with mixed data views.
- When creating marketing landing pages or developer portfolios.

## Design Vocabularies & Modes

### 1. Brand Mode
- **Target**: Marketing landing pages, product introductions, portfolios.
- **Focus**: Bold layouts, large display typography, high-impact animations, storytelling, and high contrast.
- **Aesthetic**: Creative, asymmetrical, emotional. Employs large gradient text, scroll-driven visual narratives, and dynamic transitions.

### 2. Product Mode
- **Target**: Application dashboards, analytics views, simulation panels, settings, and internal tools.
- **Focus**: Data density, visual scanning, quiet colors, micro-interactions, and clear data-to-interaction pathways.
- **Aesthetic**: Precise, clean, functional. Uses subtle borders, compact labels, monochrome typography, and 100ms hover indicators.

## Key Design Commands

- `typeset`: Focus strictly on line-height, kerning, hierarchical weight, and tabular numbers for numerical displays.
- `colorize`: Establish a single primary accent color, dark baseline neutrals, and functional status colors (emerald, amber, rose).
- `delight`: Orchestrate one high-impact entry animation or micro-interaction (e.g. state-specific focus pulse or smooth tab transitions).
- `quieter`: Reduce visual noise by stripping borders, lowering text contrast on labels, and shrinking padding to fit more data.

## Anti-Pattern Detections

- **Mixing Modes**: Do not put massive hero animations or large gradient text inside dense application tables/dashboards (Product Mode).
- **Hard-to-Scan Numbers**: In dashboards, always use monospace or tabular numbers for numeric lists to align digits cleanly.
- **Excessive Margins**: Avoid large, empty gaps in app interfaces. Keep information compact and structured.

## Example Prompts

- "Refactor this dashboard page in Product Mode, keeping colors quiet and layout dense."
- "Design an intake form using Impeccable's Product Mode with clear field groups and instant validations."
- "Apply Brand Mode styling to the landing section to hook the user immediately."
