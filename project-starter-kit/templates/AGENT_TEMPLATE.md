---
name: agent-name
description: What this agent specializes in and when to use it.
---

# Agent Name

## Role

One paragraph: what this agent is an expert at and what it owns.

## Responsibilities

- What this agent does
- What it is responsible for delivering
- The boundaries of its work

## Tools / Access

- Which tools this agent should use (read-only? can write? can run commands?)
- Any restrictions

## When to Invoke

- Concrete situations where this agent should be used
- What kinds of tasks to delegate to it

## Hand-off

- What this agent produces for the next step
- Which agent or human picks up after

---

## How To Define Good Agents for a Project (delete this section in final file)

### Why agents matter for concurrent building
When building under time pressure (hackathons), multiple agents can work in parallel on independent parts:
- One agent builds the frontend while another builds the API
- One agent writes tests while another implements
- One agent researches libraries while another scaffolds

### Common agents for most projects:
- **planner** — breaks the idea into tasks (use first, every time)
- **architect** — designs system structure and tech decisions
- **builder / general-task-execution** — implements features
- **code-reviewer** — reviews after each feature
- **security-reviewer** — checks auth, secrets, input handling
- **verifier** — runs build/test/lint before commit

### Rules:
- Keep each agent focused on ONE responsibility
- Give read-only agents read-only tools (safer)
- Agents that can run in parallel = independent work with no shared files
- Always start with planner to decompose before parallelizing
