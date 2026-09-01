---
name: skill-name-in-kebab-case
description: >
  One to three sentences. What this skill is for and WHEN to use it.
  Be specific — this is what Kiro reads to decide whether to activate the skill.
metadata:
  origin: project-name
---

# Skill Title

One-line summary of what mastering this skill lets you do in this project.

## When to Activate

- Bullet list of concrete triggers
- "When building X", "When adding Y", "Before doing Z"
- Be specific so Kiro knows exactly when this applies

## Architecture / Key Concepts

```
Optional ASCII diagram of how this part of the system is structured.
Keep it simple. Show the layers or the flow.
```

## Core Types / Interfaces

```typescript
// The main data shapes or interfaces for this domain
// Only include what matters — don't invent abstractions
interface Example {
  field: string
}
```

## Patterns

### Pattern Name
```typescript
// A concrete, copy-pasteable example of the right way to do this
```

Explain briefly why this is the right pattern.

## Implementation Guidelines

- Concrete rules for doing this well in this project
- Performance considerations if relevant
- Error handling expectations
- Security/privacy notes if relevant

## Anti-Patterns

- Common mistakes to avoid
- "Don't do X because Y"

## Example Prompts

- "Build the X using this skill"
- "Implement Y following the pattern"
- Sample requests a user would make that should trigger this skill

---

## How To Write a Good Skill (delete this section in the final file)

1. **Name** = kebab-case, matches the folder name
2. **Description** = the most important field. Kiro uses it to decide activation. Include trigger words.
3. **When to Activate** = concrete, not vague
4. **Patterns** = real code examples, not theory
5. **Anti-Patterns** = the mistakes specific to this domain
6. Keep it focused. One skill = one domain. If it covers two things, split it.
7. Match the project's actual tech stack — don't include React patterns in a Go project.
