# Project Starter Kit

A portable kit for spinning up a new project with the right Kiro skills, steering, and agents — fast. Built for hackathons and rapid project starts where you juggle multiple ideas at once.

## What This Is

Instead of starting every project from scratch, you copy this kit in, describe your idea, and Kiro generates a tailored `.kiro/` setup: the skills you'll need, the steering rules to keep quality high, and the agents to parallelize the build.

## How To Use It (3 Steps)

### Step 1 — Copy the kit into your new project folder
Copy this entire `project-starter-kit/` folder into your new project directory.

### Step 2 — Describe your idea to Kiro
Open the new project in Kiro and paste the prompt from `START-HERE.md`, filling in your idea.

### Step 3 — Kiro generates everything
Kiro reads the templates and the generation guide, analyzes your idea, and produces:
- `.kiro/skills/*/SKILL.md` — tailored skills
- `.kiro/steering/*.md` — product, architecture, coding rules
- A recommended agent + build-order plan

## What's Inside

```
project-starter-kit/
├── README.md                   ← you are here
├── START-HERE.md               ← the prompt to paste + workflow
├── GENERATION-GUIDE.md         ← how Kiro turns an idea into skills/steering/agents
├── templates/
│   ├── SKILL_TEMPLATE.md       ← blank skill skeleton (correct format)
│   ├── STEERING_TEMPLATE.md    ← blank steering skeleton
│   └── AGENT_TEMPLATE.md       ← blank agent skeleton
└── skill-library/
    └── CATALOG.md              ← menu of common skills to pick from per project type
```

## The Point

Every project gets a consistent, high-quality foundation in minutes — not hours. Same discipline that built VIC, reusable for any new idea.
