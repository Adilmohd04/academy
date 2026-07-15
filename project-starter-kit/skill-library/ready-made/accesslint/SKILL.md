---
name: accesslint
description: >
  Accessibility linter and guidelines checking WCAG AA/AAA compliance, semantic HTML structures, ARIA descriptors, keyboard focus, and contrast safety.
metadata:
  origin: crossroads-hackathon
---

# AccessLint Skill

A design and review skill focused on accessibility (a11y), enforcing WCAG standards to ensure user interfaces are usable by everyone.

## When to Activate

- When developing interactive form elements, navigation bars, modal dialogs, or dropdowns.
- When auditing existing markup and components for compliance.
- When configuring colors, typography weights, or screen-reader tags.

## Core Accessibility Rules

### 1. Color Contrast (WCAG 2.1 AA/AAA)
- **AA Level**: Minimum contrast ratio of **4.5:1** for body text and **3:1** for large text (>= 18pt or bold >= 14pt).
- **AAA Level**: Minimum contrast ratio of **7:1** for body text and **4.5:1** for large text.
- Do not convey information *solely* via color (e.g. error alerts must include an icon or descriptive text, not just turn red).

### 2. Semantic Elements & Landmarks
- Always use semantic HTML tags over generic `div`/`span` wrappers:
  - Navigation: `<nav>`
  - Main panel: `<main>`
  - Header: `<header>`
  - Footer: `<footer>`
  - Sidebars: `<aside>`
- Ensure a single `<h1>` element exists on the page with a logically ordered heading hierarchy (`<h2>` to `<h6>`).

### 3. Keyboard Focus & Interaction
- **Focus Rings**: Never disable outline focus states (`outline-none`) unless you are replacing them with custom, high-visibility focus indicator rings.
- **Interactive Targets**: Make sure touch targets (buttons, links) are at least **44x44px** (WCAG) or **48x48px** (Android/iOS guidelines) to avoid misclicks.
- Ensure all custom controls are keyboard-navigable (`tabIndex={0}`) and respond to `Enter` and `Space`.

### 4. Interactive Attributes (ARIA)
- Provide alternative text (`alt`) for all non-decorative images.
- Use `aria-label` or `aria-labelledby` for controls without visible labels (e.g. icon buttons).
- Use `aria-expanded` and `aria-controls` for dropdowns, drawers, and collapsibles.

## Example Prompts

- "Check if this form complies with WCAG AA accessibility standards."
- "Refactor this icon button to include accessible descriptions and proper tab navigation."
- "Evaluate the heading structure and semantic landmarks of this dashboard."
