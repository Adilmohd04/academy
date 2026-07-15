# Generation Guide

This file tells the AI how to turn a project idea into a tailored `.kiro/` setup. When the user pastes their idea, follow this process EXACTLY.

## The Process

### Step 1 — Run the Idea Analyzer

Before writing any code or skills, produce this structured analysis for the user:

#### Required Output Format:

```
## IDEA ANALYSIS

### 1. Required Capabilities
- [capability] — confidence: HIGH/MEDIUM/LOW
- [capability] — confidence: HIGH/MEDIUM/LOW
(list every technical capability the idea needs)

### 2. Recommended Stack
- Frontend: [choice] — reason: [one line]
- Backend: [choice] — reason: [one line]
- Database: [choice] — reason: [one line]
- AI/ML: [choice] — reason: [one line]
- Hosting: [choice] — reason: [one line]

### 3. Risk Analysis (Top 3-5 reasons this could fail)
1. [risk] — mitigation: [one line]
2. [risk] — mitigation: [one line]
3. [risk] — mitigation: [one line]

### 4. Startup Validation (if applicable)
- Who is the customer? [specific persona, not "everyone"]
- Why would they pay? [the pain point, not the feature]
- What's the alternative today? [how people solve this without your product]
- Competitors that exist: [list real ones, not imagined gaps]
- What are people saying? [search X/Twitter, Reddit, HackerNews, ProductHunt for the problem space — report what real users complain about]
- Is it worth building? [honest YES/NO with reasoning]
- Estimated market: [TAM guess, be honest about assumptions]

### 5. Mode-Specific Analysis
(see Step 2 for which mode applies)
```

**IMPORTANT:** For startup validation, actually USE web search tools to check:
- Reddit discussions about this problem
- X/Twitter posts about similar tools
- ProductHunt for existing solutions
- HackerNews discussions about the space
- Competitor pricing and positioning

Report what you find honestly. If someone already built this, say so. If nobody is complaining about this problem, that's a red flag.

### Step 2 — Determine the Mode

Based on the timeline and purpose the user stated, pick ONE mode:

#### Hackathon Mode (timeline: hours to days)
Add to the analysis:
```
### HACKATHON PRIORITIES
Must-have (demo must show these):
- [feature]
- [feature]

Should-have (if time allows):
- [feature]

Nice-to-have (cut first):
- [feature]

What judges care about:
- [insight about what wins this type of hackathon]

Where to STOP building:
- [the line past which you're over-engineering for a demo]

Demo-first build order (work backward from the demo):
1. [what the audience sees first]
2. [what makes the demo convincing]
3. [the infra that supports the above]
```

#### Startup Mode (timeline: weeks to months, building a real product)
Add to the analysis:
```
### STARTUP PRIORITIES
Week 1 goal (prove the thesis):
- [the smallest thing that tests if users want this]

V1 scope (first paying user):
- [features]

Explicitly NOT in V1:
- [things to resist building early]

First 10 users plan:
- [how to find them, not "build and they will come"]

Competitive moat (long-term):
- [what gets harder to copy over time]
```

#### Learning Mode (timeline: flexible, building to learn a technology)
Add to the analysis:
```
### LEARNING PRIORITIES
Core concept to master:
- [the ONE thing this project teaches]

Stretch goals (deepen understanding):
- [harder extensions once the core works]

Resources to study alongside:
- [docs, courses, papers relevant to the learning goal]

What "done" means:
- [concrete outcome: "I can explain X" or "I built Y from scratch"]
```

#### Research Mode (timeline: flexible, exploring a problem space or writing a paper)
Add to the analysis:
```
### RESEARCH PRIORITIES
Research question:
- [the specific question this project answers]

Hypothesis (if applicable):
- [what you believe is true, that this work will validate/invalidate]

Related work:
- [key papers, repos, or projects in this space — use web search to find current ones]
- [what's been tried, what gap exists]

Methodology:
- Experiment type: [prototype / benchmark / ablation / comparison / proof-of-concept]
- Success metric: [what number or outcome proves the hypothesis]
- Baseline: [what you're comparing against]

Deliverables:
- [ ] Working prototype / experiment code
- [ ] Results documentation (graphs, tables, findings)
- [ ] Paper draft / technical report (if applicable)

Novel contribution:
- [what is NEW here that doesn't exist in related work]
```

#### Creator Mode (timeline: flexible, building content, tools, or creative projects)
Add to the analysis:
```
### CREATOR PRIORITIES
What you're creating:
- [video / course / tutorial / open-source tool / template / dataset / plugin]

Target audience:
- [who consumes this, their skill level]

Distribution channel:
- [YouTube / GitHub / Twitter / blog / marketplace / npm]

Success metric:
- [stars, views, downloads, signups — one number that matters]

Differentiation:
- [why would someone choose this over existing alternatives?]

Content/Asset plan:
- [what artifacts need to be produced, in what order]

Monetization (if any):
- [free / sponsorware / paid / freemium]
```

### Step 3 — Select Skills

Pick from `skill-library/CATALOG.md`. Rules:
- Only include skills this project ACTUALLY needs (no bloat)
- Always include: `karpathy-guidelines`, `search-first`, `verification-loop`, `code-ownership`
- Add domain skills based on the stack
- Add security skills if the project touches auth, payments, PII
- WRITE CUSTOM skills for anything unique not in the catalog
- **Max 7-8 skills for hackathons.** More = over-provisioning.

### Step 4 — Write the Skills

For each selected skill, create `.kiro/skills/<name>/SKILL.md` using `templates/SKILL_TEMPLATE.md`.
- Tailor content to the project's actual stack
- Include real code patterns, not theory
- Delete the "how to write" helper section from the final file

### Step 5 — Write the Steering Files

Always create these:
- `product.md` (auto) — what this project is and isn't, who it's for
- `architecture.md` (auto) — the chosen stack and structure
- `coding-style.md` (auto) — simplicity-first, small files, error handling
- `security.md` (auto) — secrets, input validation, auth baseline
- `git-workflow.md` (auto) — daily commit/push, no leaked secrets

Add conditionally:
- `performance.md` if latency/scale matters
- `testing.md` if timeline allows tests
- A vision/strategy file (manual) if it's a long-term product

### Step 6 — Recommend Agents + Parallelization

Based on `templates/AGENT_TEMPLATE.md`, recommend which agents to use. For hackathons, emphasize parallelism:
- planner (first, decompose)
- then parallel: frontend builder + backend builder
- then: reviewer + verifier before each commit

### Step 7 — Give a Build Order

Produce a concrete, time-boxed plan matching their timeline.

Hackathon example (48h):
```
Hour 0-2:   Scaffold + planner decomposes
Hour 2-12:  Core feature (parallel: frontend + backend)
Hour 12-24: Integration + second feature
Hour 24-36: Polish + edge cases
Hour 36-44: Testing + bug fixes
Hour 44-48: Demo prep + deploy
```

Startup example (4 weeks):
```
Week 1: Core thesis feature. Ship to first 5 test users.
Week 2: Feedback loop. Fix the top 3 complaints.
Week 3: Second feature that locks in retention.
Week 4: Polish, edge cases, deploy properly.
```

### Step 8 — Mid-Project Learning (Ongoing)

During project execution, the AI should:
- **Search for better approaches** when stuck or when a task is unfamiliar
- **Capture useful discoveries** as new skills if they'll help future projects
- **Update existing skills** if a library recommendation turns out to be outdated

The format for a mid-project learned skill:
```
.kiro/skills/<name>/SKILL.md  (same template as any other skill)
```

Add a `learned: true` field in the metadata so you know this was discovered during execution, not pre-planned. This builds your personal skill library over time without requiring a separate "learning system."

## Output Format (Present to User)

After analysis, present:
1. **Idea Analysis** (full structured output from Step 1)
2. **Mode** (hackathon/startup/learning) with mode-specific additions
3. **Skills list** (each with why)
4. **Steering files** (created)
5. **Agents + parallelization plan**
6. **Build order** for their timeline

Then create all the files.

## Core Rules

- **Minimal, not maximal.** Only what the project needs.
- **Match the stack.** No React patterns in a Go project.
- **Respect the timeline.** Hackathon = managed services + skip heavy infra.
- **Custom over generic.** If the idea has a unique core, write a custom skill.
- **Security scales with sensitivity.** Demo = light. Fintech = heavy.
- **Be honest in validation.** If competitors exist, say so. If the idea is generic, say so. Don't flatter.
- **Search before generating.** Use web search to validate assumptions about libraries, competitors, and market demand.
