# Scalable Refactor Master Plan

Date: 2026-04-26
Status: In Progress (Phase 1)
Owner: Engineering

## 1) Why This Refactor
The codebase currently mixes multiple architectural styles (role-based, service-type based, and partially feature-based), which slows onboarding and increases regression risk.

This plan moves both frontend and backend to feature-first architecture while preserving runtime behavior and API contracts.

## 2) Non-Negotiable Constraints
- No API contract breaks.
- No behavior changes in business logic.
- No big-bang move. Only incremental, testable migrations.
- Every move must be reversible.

## 3) Target Architecture

### Frontend target
frontend/
- app/
- layouts/
- features/
  - teacher/
  - student/
  - courses/
  - dashboard/
  - certificates/
  - meetings/
  - resources/
  - settings/
- shared/
  - ui/
  - hooks/
  - utils/
  - constants/
  - types/
- lib/

### Backend target
backend/src/
- modules/
  - teacher/
  - user/
  - course/
  - certificate/
  - meeting/
  - resource/
  - auth/
- common/
  - middleware/
  - utils/
  - constants/
- config/
- server.ts

## 4) Migration Strategy (No-Downtime)

### Phase 1: Foundation (this phase)
- Define folder conventions and boundaries.
- Create migration board with feature-by-feature tasks.
- Add initial feature scaffolding and transitional export files.
- Keep legacy paths alive while introducing new paths.

### Phase 2: Frontend feature migration
- Move one feature at a time into frontend/features.
- Extract shared pieces into frontend/shared.
- Replace duplicate feature logic with single reusable hooks/services.
- Add index.ts barrels per feature for stable import surfaces.

### Phase 3: Backend module migration
- For each domain, consolidate controller/service/repository/routes/types under backend/src/modules/<feature>.
- Keep existing route mounts and handlers intact through re-exports until complete cutover.
- Move cross-domain utilities into backend/src/common.

### Phase 4: Cleanup and deletion
- Remove dead files only after import graph confirms zero references.
- Remove archived and superseded docs/scripts in batches.
- Keep a deletion log for traceability.

### Phase 5: Hardening
- Run lint/build/test checks.
- Run smoke checks for high-risk journeys:
  - teacher course builder
  - admin approvals
  - certificate approval flow
  - meeting and resource management

## 5) Feature Migration Order (Recommended)
1. certificates
2. courses
3. teacher
4. meetings
5. resources
6. dashboard
7. student
8. settings

Reason: certificates/courses/teacher have highest coupling and most visible regressions if left fragmented.

## 6) Duplicate Logic Policy
For each duplicate found:
1. Keep the most stable implementation as source-of-truth.
2. Replace others with wrappers or direct imports.
3. Remove old copies only after references reach zero.
4. Record change in refactor board.

## 7) Definition of Done
- Every feature has isolated components/hooks/services/types.
- Reusable assets live only in shared/common.
- No unreferenced files in active source directories.
- Route and API behavior unchanged.
- New contributor can locate a feature in under 2 minutes.

## 8) Risk Controls
- Small PR-sized batches.
- One feature at a time.
- Build + lint after each batch.
- Keep transitional re-export files until migration completion.

## 9) Immediate Next Actions
- Complete certificates feature cutover to feature path usage.
- Add backend module bridge files for certificate/course/meeting.
- Start duplicate inventory for frontend components and backend services.
