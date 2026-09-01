# Start Here

Copy-paste this prompt into your AI coding tool (Kiro, Claude Code, Cursor) after copying the kit into your new project folder.

## The Prompt

```
I'm starting a new project. Read the project-starter-kit folder and generate my .kiro setup.

MODE: [hackathon / startup / learning / research / creator]
TIMELINE: [e.g. "48 hours", "4 weeks", "ongoing personal project"]

MY IDEA:
- What is it? (one line)
- Who is it for? (specific user, not "everyone")
- What problem does it solve? (the pain, not the feature)
- Tech stack (or "you decide")
- Scale needs (e.g. "just a demo", "real users", "enterprise")

ADDITIONAL CONTEXT (optional):
- Hackathon name/theme: [if applicable]
- Am I building this alone or in a team?
- Budget constraints: [free tier only / can spend $X]
- Key constraint: [the hardest part of this idea]

Based on this idea:
1. Run the full Idea Analyzer (capabilities, stack, risks, validation)
2. Apply the mode-specific analysis (hackathon/startup/learning priorities)
3. Recommend skills and explain WHY each one
4. Write skills into .kiro/skills/ and steering into .kiro/steering/
5. Recommend agents and which can run in parallel
6. Give me a build order for my timeline
7. Be honest — if this idea has problems, tell me before I build it
```

## Modes Explained

### Hackathon Mode
For time-boxed competitions (hours to days). Optimizes for:
- Demo impact over code quality
- Must-have / should-have / nice-to-have prioritization
- "Where to stop building" guardrails
- Judge perspective (what actually wins)

### Startup Mode
For real products (weeks to months). Optimizes for:
- Customer validation before building
- Competitive analysis (who exists, why they'd pay)
- V1 scope discipline (what's explicitly OUT)
- Finding first 10 users

### Learning Mode
For personal growth projects. Optimizes for:
- Core concept focus (ONE thing to master)
- Stretch goals for deeper understanding
- Resource recommendations
- Clear "done" definition

### Research Mode
For exploring problem spaces, experiments, or writing papers. Optimizes for:
- Clear research question and hypothesis
- Related work survey (papers, repos, prior art)
- Methodology: experiment type, success metric, baseline
- Novel contribution (what's genuinely new)
- Reproducibility and results documentation

### Creator Mode
For building content, open-source tools, templates, courses, or creative work. Optimizes for:
- Target audience and their skill level
- Distribution channel (GitHub, YouTube, npm, marketplace)
- Differentiation from existing alternatives
- Content/asset production order
- Success metric (one number: stars, views, downloads)

## Example: Hackathon Mode

```
MODE: hackathon
TIMELINE: 36 hours

MY IDEA:
- What: Voice-controlled recipe finder that reads ingredients from a photo
- For: Home cooks who don't want to type while cooking
- Problem: Typing with messy hands; existing apps need too much input
- Tech: you decide
- Scale: demo only, 3 judges

ADDITIONAL CONTEXT:
- Hackathon: MLH Global Hack Week (AI track)
- Team of 2
- Budget: free tier only
- Key constraint: real-time voice must feel responsive
```

## Example: Startup Mode

```
MODE: startup
TIMELINE: 6 weeks to V1

MY IDEA:
- What: AI that reads Slack threads and generates weekly team summaries
- For: Engineering managers with 10+ direct reports
- Problem: They miss important context because they can't read every thread
- Tech: you decide
- Scale: 50 users for pilot

ADDITIONAL CONTEXT:
- Solo founder
- Budget: $200/month for infra
- Key constraint: Slack API rate limits + privacy concerns
```

## Example: Learning Mode

```
MODE: learning
TIMELINE: 2 weeks (evenings)

MY IDEA:
- What: Build a basic RAG system from scratch (no LangChain)
- For: myself — want to understand retrieval deeply
- Problem: I use LangChain but don't understand what's underneath
- Tech: Python + FAISS + OpenAI embeddings
- Scale: local only

ADDITIONAL CONTEXT:
- Want to understand chunking tradeoffs deeply
- End goal: be able to build production RAG without a framework
```

## What Happens After You Paste

1. AI reads `GENERATION-GUIDE.md` (the full process)
2. AI runs the Idea Analyzer (capabilities, risks, validation)
3. AI applies mode-specific analysis
4. AI searches the web if needed (competitor check, library versions)
5. AI picks skills from `skill-library/CATALOG.md` + writes custom ones
6. AI writes all `.kiro/` files
7. AI gives you a build plan

## During the Project

The AI should also:
- Search for better approaches when stuck
- Capture useful discoveries as new skills (with `learned: true` in metadata)
- Flag if the original plan was wrong and suggest course-correction

Your skill library grows with every project you complete.
