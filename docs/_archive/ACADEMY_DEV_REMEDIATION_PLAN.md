# Academy Dev — Remediation & Buyability Plan

Status: Draft

Purpose
- Produce a prioritized, actionable plan to remediate critical issues in the codebase so it becomes reliable, secure, and buyable.

High-level goals
- Eliminate silent DB failures by removing the compatibility layer and using the Supabase client consistently.
- Fix schema mismatches and normalize profile fields.
- Replace raw interpolated SQL with parameterized Supabase calls.
- Harden critical flows (payments, meetings, receipts) and add tests and CI.

Scope
- Backend services under `backend/src/` (payments, meetings, discussions, courses, exams, enrollments, certificates, grading).
- Database schema and migrations where required.
- Tests (unit/integration) for critical flows.
- CI pipeline (lint, typecheck, tests).

Phases & Tasks

Phase 0 — Audit (3–5 days)
- Run `tsc` and collect TypeScript errors.
- Run a quick dynamic smoke-test of API endpoints (payments, meeting booking, discussion endpoints) in dev.
- Produce an issues matrix (file-level list of problems, severity, suggested fix).

Phase 1 — Remove/Replace Compatibility Layer (2–4 days)
- Identify `pool` compatibility wrapper in `backend/src/config/database.ts`.
- Replace `pool.connect()` usage; standardize on `supabase` client across project.
- Add compatibility wrappers only for trivial, well-tested cases (avoid raw SQL parsing fallback).
- Run `tsc` and fix resulting type errors.

Phase 2 — Fix Schema & Query Mismatches (4–8 days)
- Replace all references to nonexistent `users` table and `profile_image_url` columns with `profiles` and normalized fields (`clerk_user_id`, `full_name`, `email`).
- Add migration(s) if migrating column names is needed or add adapter helper to normalize fields at read-time.
- Replace FK-style joins in Supabase `.select()` calls that expect DB-level FK naming (e.g., `users!join`) with manual enrichment queries.

Phase 3 — Remove Raw SQL Interpolation & RPC Execution (5–10 days)
- Find all uses of `supabase.rpc('exec_sql', { sql_query: `...${id}...` })` and replace with parameterized Supabase calls or `supabase.from().select()`.
- For complex aggregates or windowed queries, move logic into small safe Postgres functions (with parameters) or use query builder with parameter binding.

Phase 4 — Critical Flow Remediation (payments, meetings, receipts) (3–6 days)
- Ensure `getMeetingRequestById` and meeting booking flow use manual enrichers (no FK join expectations).
- Ensure payment verification flow reads meeting data reliably and that receipt generation returns PDF blobs (not JSON).
- Add end-to-end tests covering Razorpay payment → booking insertion → receipt download.

Phase 5 — Discussions & Notifications (2–4 days)
- Replace raw SQL `pool.connect()` usages in discussion modules with Supabase calls.
- Ensure mention resolution (`@username`) queries `profiles` correctly.
- Add tests for creating discussions, replies, mentions, upvotes, and accepted answer flows.

Phase 6 — Tests & CI (3–6 days)
- Add unit tests for services (mock Supabase client where needed).
- Add integration tests for the critical flows (payments, meetings, discussions).
- Create GitHub Actions (or equivalent) pipeline: lint → tsc → tests.

Phase 7 — Security Review & Hardening (2–4 days)
- Static review for SQL injection vectors and secrets.
- Ensure all external calls are parameterized and sanitized.
- Run dependency audit and update vulnerable packages.

Phase 8 — QA, Staging Deploy, Handover (3–5 days)
- Deploy to staging environment.
- Run smoke tests and manual QA checklist.
- Prepare release notes and remediation summary for buyers.

Deliverables
- `ACADEMY_DEV_REMEDIATION_PLAN.md` (this file)
- Issues matrix (CSV/MD) with file, severity, and fix
- PRs implementing changes, each with tests
- CI pipeline (GitHub Actions)
- Final QA report and acceptance checklist

Estimates & Cost
- Engineering effort: 80–160 hours (senior backend dev) depending on complexity found during audit.
- Time: ~2–4 weeks.
- Cost (example rates): $100/hr → $8k–$16k. Agency/consulting higher.

Acceptance Criteria
- All critical flows (payments, meetings, receipt generation) pass integration tests.
- No silent failures from DB compatibility layer — all queries return expected rows or throw informative errors.
- No raw SQL string interpolation; parameterized queries or safe RPCs only.
- CI runs on PRs and `main` with tsc and tests passing.

Next steps (recommended)
1. Approve this remediation plan.
2. Run Phase 0 audit (I can run `tsc` and list errors if you want).
3. Start Phase 1 (replace compatibility layer) — this unlocks reliable fixes.

Contact
- If you'd like, I can produce a detailed per-file task list with time estimates and open PRs for the highest-priority fixes.
