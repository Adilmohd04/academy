---
inclusion: auto
description: One line describing what rules/context this steering file provides.
---

# Steering File Title

Brief intro: what this file governs and why it matters for the project.

## Section 1

The actual rules, context, or standards. Be direct and specific.

## Section 2

More rules or context.

---

## How To Write a Good Steering File (delete this section in the final file)

### inclusion options (in the frontmatter):
- `inclusion: auto` — loaded in EVERY Kiro session. Use for: product context, coding style, security, architecture. Keep these tight — they cost context budget every message.
- `inclusion: fileMatch` — loaded only when matching files are open. Add `fileMatchPattern: "*.ts"`. Use for language-specific rules.
- `inclusion: manual` — loaded only when user types `#filename`. Use for: long-term vision, strategy docs, deep references that aren't needed every session.

### What belongs in steering (vs skills):
- **Steering** = always-on rules and context ("what this project is", "how we code", "never commit secrets")
- **Skills** = on-demand specialist knowledge for specific tasks ("how to build the overlay engine")

### Common steering files for most projects:
- `product.md` (auto) — what the product is and isn't
- `architecture.md` (auto) — tech stack and structure
- `coding-style.md` (auto) — code quality rules
- `security.md` (auto) — security baseline
- `git-workflow.md` (auto) — commit/backup discipline

### Keep auto-loaded files short
Every auto file is read on every message. Bloat here slows everything. Put long content in manual files.
