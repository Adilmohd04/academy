# Skill Catalog

A menu of skills with enough depth to inform generation. Pick only what the project needs. Write custom skills for anything unique not listed here.

## Always Include (every project)

| Skill | Purpose |
|-------|---------|
| `karpathy-guidelines` | Behavioral rules: surface assumptions, simplicity-first, surgical changes, goal-driven execution. Pre-written in `ready-made/`. |
| `search-first` | Research existing tools before writing custom code |
| `verification-loop` | Build, type, lint, test, security check before commit |
| `code-ownership` | Keep AI-generated code understandable and owned |

---

## Frontend / UI

### `frontend-patterns`
- **Best libraries (2026):** React 19, Next.js 15, Zustand, TanStack Query, Tailwind 4
- **Common pitfall:** Over-rendering from bad state shape; premature optimization with useMemo everywhere
- **Evaluation:** Lighthouse score + Core Web Vitals
- **When:** Any project with a user interface
- **Skip when:** CLI tools, pure backend APIs

### `frontend-a11y`
- **Best libraries:** axe-core, react-aria, Radix UI primitives
- **Common pitfall:** Adding aria-* attributes without testing with actual screen readers
- **Evaluation:** axe-core automated scan + manual VoiceOver/NVDA test
- **When:** Public-facing products, compliance requirements
- **Skip when:** Internal tools, hackathon demos

### `design-system`
- **Best libraries:** Radix UI, shadcn/ui, Storybook
- **Common pitfall:** Building a design system before you have 3+ pages that need it
- **When:** Multi-page apps with repeated patterns
- **Skip when:** Single-page demos, early MVPs

### `claude-design`
- **Focus:** Bold, distinctive UI layouts and characterful typography pairings. Banned fonts (Inter/Roboto) and guidelines to avoid generic card grid structures.
- **When:** Styling visual layouts or custom pages where visual personality is critical.

### `impeccable`
- **Focus:** Separation of styling guidelines into Brand Mode (editorial, asymmetric) and Product Mode (high density, quiet colors, micro-interactions).
- **When:** Building multi-step widgets, dashboard elements, and analytical simulator UIs.

### `theme-factory`
- **Focus:** Token-driven design system using strict CSS variables for colors, borders, spacing grids, and rounded radii.
- **When:** Organizing complex elements to ensure consistent scaling and styling without hardcoded values.

### `accesslint`
- **Focus:** WCAG AA/AAA compliance checking, proper semantic structures, keyboard navigability, and contrast verification.
- **When:** All user-facing components to maintain professional usability and pass accessibility checks.

---

## Backend / API

### `backend-patterns`
- **Best libraries (2026):** FastAPI (Python), Hono (Node), Axum (Rust)
- **Common pitfall:** Building microservices before you have 10k users; N+1 queries
- **Evaluation:** Response time p99, error rate, test coverage
- **When:** Any project with server-side logic
- **Skip when:** Pure static sites, client-only apps

### `api-design`
- **Best libraries:** Zod (validation), OpenAPI (docs), tRPC (type-safe)
- **Common pitfall:** Inconsistent error formats; 200 for everything; no pagination
- **Evaluation:** API consumers can use it without asking you questions
- **When:** Building APIs that other code (or other teams) calls
- **Skip when:** Internal functions, no HTTP boundary

### `database-patterns`
- **Best libraries:** Supabase/PostgreSQL (general), Drizzle ORM (TS), SQLAlchemy (Python)
- **Common pitfall:** No migrations from day 1; storing JSON blobs instead of relational data
- **Evaluation:** Can you add a column without breaking production?
- **When:** Any persistent data
- **Skip when:** Stateless tools, demo-only projects

### `realtime-patterns`
- **Best libraries:** Supabase Realtime, Socket.io, Liveblocks, Ably
- **Common pitfall:** Not handling reconnection; building custom WS when a managed service works
- **Evaluation:** Does it recover from network blips?
- **When:** Collaborative features, live dashboards, chat
- **Skip when:** Request-response only, no live updates needed

---

## AI / Agents

### `agentic-engineering`
- **Best libraries:** LangGraph (orchestration), CrewAI (multi-agent), Instructor (structured output)
- **Common pitfall:** Building autonomous loops without evaluation; agents that hallucinate and keep going
- **Evaluation:** Task success rate, cost per task, hallucination rate
- **When:** Building AI agents, multi-step autonomous systems
- **Skip when:** Single LLM call products, simple chat interfaces

### `rag-pipeline`
- **Best libraries:** LlamaIndex (high-level), LangChain (flexible), Haystack (enterprise)
- **Chunking:** Start with 512-token chunks, 50-token overlap. Adjust based on eval.
- **Embeddings:** text-embedding-3-small (cheap) or Cohere embed-v3 (multilingual)
- **Common pitfall:** No evaluation of retrieval quality; chunking too large; ignoring metadata
- **Evaluation:** Ragas framework (faithfulness, relevance, context recall)
- **When:** Any project that needs to answer questions from documents
- **Skip when:** All context fits in one prompt; no document corpus

### `prompt-engineering`
- **Best libraries:** Instructor (structured), DSPy (optimization), promptfoo (testing)
- **Common pitfall:** Prompt in code instead of a manageable template; no version control for prompts
- **Evaluation:** promptfoo test suite with expected outputs
- **When:** LLM calls that need reliability and consistency
- **Skip when:** One-shot creative generation where variance is acceptable

### `copilotkit-integration`
- **Best libraries:** @copilotkit/react-core, @copilotkit/react-ui, @copilotkit/runtime
- **Common pitfall:** Exposing functions without strict validation; overloading the client context window
- **Evaluation:** Latency, action handler validation coverage
- **When:** Building in-app AI sidebars, dynamic form controllers, or generative UIs
- **Skip when:** CLI tools, stateless backend APIs with no chat interface

### `prompt-master`
- **Best libraries:** Custom System prompt frameworks (Instructor, promptfoo)
- **Common pitfall:** Generic instructions without JSON outputs; high token waste
- **Evaluation:** JSON validation parser success rate, output tokens limit
- **When:** Structuring complex, multi-variable prompts with high reasoning requirements
- **Skip when:** Simple, one-liner queries where variance is acceptable

### `mcp-integration`
- **Best libraries:** @modelcontextprotocol/sdk, FastMCP (Python)
- **Common pitfall:** Building too many servers before proving one; no error handling on tool calls
- **Evaluation:** Tool call success rate, latency
- **When:** Connecting AI to external tools (databases, APIs, services)
- **Skip when:** Self-contained applications with no external tool needs

### `find-skills`
- **CLI Command:** npx skills find [query]
- **Common pitfall:** Searching CLI before checking the skills.sh leaderboard
- **When:** Discovering or installing external skills to extend agent capabilities
- **Skip when:** All required skills are already pre-written locally

---

## Desktop / Mobile

### `tauri-desktop`
- **Best libraries:** Tauri 2, tauri-plugin-* ecosystem
- **Common pitfall:** Fighting the borrow checker for 3 days on something that should be a 2-line JS call
- **Evaluation:** App startup time < 3s, memory < 200MB
- **When:** Cross-platform desktop apps
- **Skip when:** Web-only, mobile-only

### `react-native-patterns`
- **Best libraries:** Expo (managed), React Navigation, TanStack Query
- **Common pitfall:** Ejecting from Expo too early; not testing on real devices
- **Evaluation:** Cold start time, smooth scrolling (60fps)
- **When:** Cross-platform mobile apps
- **Skip when:** Desktop-only, web-only

### `screen-perception`
- **Best libraries:** Windows UI Automation (Rust), macOS AX API, PaddleOCR (fallback)
- **Common pitfall:** Using OCR when the accessibility tree gives structure for free
- **Evaluation:** Element detection accuracy on 10 test screens
- **When:** Apps that need to understand what's on the user's screen
- **Skip when:** Apps that only show their own UI

---

## Voice / Media

### `voice-interaction`
- **Best libraries:** OpenAI Realtime API (streaming), Deepgram (STT), ElevenLabs/Cartesia (TTS)
- **Common pitfall:** Buffering full utterance instead of streaming; not handling interruptions
- **Evaluation:** End-to-end latency (target < 500ms), transcription accuracy
- **When:** Voice-driven products
- **Skip when:** Text-only interfaces

### `media-processing`
- **Best libraries:** ffmpeg (video/audio), sharp (images), Whisper (audio transcription)
- **Common pitfall:** Processing in the main thread; not validating file types
- **Evaluation:** Processing speed, output quality, memory usage
- **When:** Uploading/transforming images, audio, or video
- **Skip when:** Text-only products

---

## Quality / Security

### `security-review`
- **Best libraries:** Zod (input validation), helmet (headers), bcrypt/argon2 (passwords)
- **Common pitfall:** Hardcoded secrets; trusting client-side validation; not enabling RLS
- **Evaluation:** OWASP Top 10 checklist pass, npm audit clean
- **When:** Auth, payments, PII, user-generated content, API endpoints
- **Skip when:** Local-only tools with no user data

### `tdd-workflow`
- **Best libraries:** Vitest (TS), pytest (Python), testing-library (React)
- **Common pitfall:** Writing tests after the fact that just test implementation details
- **Evaluation:** Coverage > 80%, tests catch real bugs not just happy paths
- **When:** Any project where bugs have consequences
- **Skip when:** 12-hour hackathon demos (write tests for the core logic only)

### `performance-optimization`
- **Best libraries:** Lighthouse, k6 (load testing), React DevTools Profiler
- **Common pitfall:** Optimizing before measuring; premature memoization
- **Evaluation:** p95 response time, FCP/LCP, memory profile
- **When:** User-facing products where latency matters
- **Skip when:** Internal tools, early prototypes

---

## Language-Specific

### `python-patterns`
- **Key:** Type hints everywhere, Pydantic for validation, async where IO-bound
- **Pitfall:** No virtual environment management; mixing sync and async
- **When:** Python projects

### `typescript-patterns`
- **Key:** strict mode always, Zod at boundaries, no `any` types
- **Pitfall:** Overusing generics; `as` type assertions hiding bugs
- **When:** TypeScript projects

### `rust-patterns`
- **Key:** Ownership/borrowing, error handling with Result, derive macros
- **Pitfall:** Fighting the borrow checker instead of restructuring; over-using `clone()`
- **When:** Rust projects (Tauri backends, systems code)

---

## Infra / Deployment

### `docker-patterns`
- **Best libraries:** Docker, docker-compose, multi-stage builds
- **Common pitfall:** Giant images (use alpine/distroless); running as root
- **When:** Deploying to cloud, sharing dev environments
- **Skip when:** Local-only tools, Vercel/Railway handle it, hackathon demos

### `deployment-patterns`
- **Best libraries:** GitHub Actions (CI), Vercel (frontend), Railway/Fly.io (backend)
- **Common pitfall:** No CI until the day before launch; manual deploys
- **When:** Real products that need reliable shipping
- **Skip when:** Hackathon demos (deploy manually last hour)

---

## Anti-Bloat Rule

If you're adding more than **7-8 skills** for a hackathon project, you're over-provisioning. Cut to what the core demo needs.

For startups: max **10-12 skills** is reasonable. Beyond that, you're generating bureaucracy, not value.

For learning projects: **3-5 skills** focused on the thing you're learning plus code quality basics.

---

## Missing Something?

If the idea has a domain not listed here (blockchain, IoT, game dev, biotech, hardware), **write a custom skill** using the template. Research current best libraries via web search. The catalog grows with every project.
