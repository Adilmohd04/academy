# Cross-Platform Skill Usage

Skills in this kit are plain Markdown with frontmatter. The same skill content works across AI coding tools — you just place it where each tool looks for it.

## Where Each Tool Reads Skills

| Tool | Location | Format |
|------|----------|--------|
| **Kiro** | `.kiro/skills/<name>/SKILL.md` | SKILL.md with `name` + `description` frontmatter |
| **Claude Code** | `CLAUDE.md` (project root) or plugin | Merge skill content into CLAUDE.md, or install as plugin |
| **Cursor** | `.cursor/rules/<name>.mdc` | Same content, `.mdc` extension |
| **Generic / any** | `AGENTS.md` or project docs | Paste content into the agent's instruction file |

## Making a Skill Work Everywhere

A skill's *content* is identical across tools. Only the *file location and wrapper* differ:

### For Kiro
Copy the skill folder into `.kiro/skills/`. Done — Kiro picks it up by frontmatter.

### For Claude Code
Two options:
- **Per-project:** Append the skill body to `CLAUDE.md` at the project root.
- **Global plugin:** Package as a Claude Code plugin (see the source repo's plugin structure).

### For Cursor
Copy the skill body into `.cursor/rules/<name>.mdc`. Cursor applies it as a project rule.

## The Rule

Write the skill once in `SKILL.md` format. To use it on another platform, copy the body into that platform's instruction file. The behavioral guidance (like `karpathy-guidelines`) is tool-agnostic — it tells the AI how to behave, not which tool to use.

## For This Kit

When generating a project, default to Kiro's `.kiro/skills/` layout. If the user says they also use Claude Code or Cursor, additionally:
- Write a `CLAUDE.md` at the root merging the always-include skills (especially `karpathy-guidelines`)
- Write `.cursor/rules/karpathy-guidelines.mdc` with the same content

This way the same standards apply no matter which tool the user opens the project in.
