---
name: karpathy-guidelines
description: >
  Behavioral guidelines to reduce common LLM coding mistakes. Use when writing,
  reviewing, or refactoring code to avoid overcomplication, make surgical changes,
  surface assumptions, and define verifiable success criteria. Works on any platform
  (Kiro, Claude Code, Cursor) and any tech stack.
license: MIT
metadata:
  origin: andrej-karpathy-skills by forrestchang, adapted for cross-platform use
  source: https://github.com/forrestchang/andrej-karpathy-skills
---

# Karpathy Guidelines

Behavioral guidelines to reduce common LLM coding mistakes, derived from Andrej Karpathy's observations on LLM coding pitfalls. Platform-agnostic: applies regardless of language, framework, or which AI tool is used.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks (typo fixes, obvious one-liners), use judgment — not every change needs full rigor.

## When to Activate

- Before implementing any non-trivial feature
- When reviewing or refactoring existing code
- When a request is ambiguous or could be interpreted multiple ways
- When tempted to add abstractions, config, or "flexibility"
- When editing code you didn't write

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform imperative tasks into verifiable goals:

| Instead of... | Transform to... |
|---------------|-----------------|
| "Add validation" | "Write tests for invalid inputs, then make them pass" |
| "Fix the bug" | "Write a test that reproduces it, then make it pass" |
| "Refactor X" | "Ensure tests pass before and after" |

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## How To Know It's Working

- Fewer unnecessary changes in diffs
- Fewer rewrites due to overcomplication
- Clarifying questions come before implementation, not after mistakes
- Clean, minimal PRs with no drive-by refactoring

---

Derived from Andrej Karpathy's observations. Original: https://github.com/forrestchang/andrej-karpathy-skills (MIT License).
