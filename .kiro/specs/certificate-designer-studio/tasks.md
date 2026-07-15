# Implementation Plan: Certificate Designer Studio & Lifecycle System

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

The plan is grouped into the five rollout phases from design §14. Each phase ends with a checkpoint task and is independently shippable. Property-based tests are co-located with the implementation they validate; each property from design §11 has a dedicated test sub-task. Test sub-tasks are marked optional with `*` per the workspace task format. Implementation language is TypeScript everywhere (frontend Next.js + backend Express).

## Tasks

### Phase 1 — Schema additions (non-breaking)

- [x] 1. Write the `certificate_designer_studio.sql` migration
  - [x] 1.1 Add columns to `certificates` (`verification_code`, `qr_code_url`, `pdf_url`, `completion_date`, `is_manual_override`, `override_by`, `override_reason`, `verification_count`, `last_verified_at`, `template_snapshot`) with idempotent `ADD COLUMN IF NOT EXISTS`
    - Add the partial `UNIQUE INDEX idx_certificates_verification_code` on non-null `verification_code`
    - _Requirements: 8.3, 8.4, 8.6, 10.1, 10.2, 10.6, 14.1_

  - [x] 1.2 Add columns to `certificate_templates` (`approval_status`, `approved_by`, `approved_at`, `rejection_reason`, `allow_teacher_editing`, `parent_template_id`) plus indexes on `(approval_status)` and `(course_id, approval_status)`
    - _Requirements: 5.1, 5.5, 6.1, 6.3, 6.4_

  - [x] 1.3 Create `certificate_template_revisions` table with `template_id`, `revision_number`, `template_data`, `status`, submitter/reviewer FKs, `rejection_reason`, plus unique `(template_id, revision_number)` and indexes on `template_id` and `status`
    - _Requirements: 5.5, 5.6, 6.1, 6.2, 6.5_

  - [x] 1.4 Create `certificate_verification_log` table with `certificate_id`, `verification_code`, `verified_by_ip` (`INET`), `verified_by_user_agent`, `verification_result` CHECK constraint, plus indexes on `certificate_id`, `verified_at`, and `(verified_by_ip, verified_at)`
    - _Requirements: 11.3, 11.4_

  - [x] 1.5 Write idempotent backfill `UPDATE`s that promote `approval_status` and `allow_teacher_editing` from `template_data` JSON, defaulting legacy rows to `'approved'`
    - _Requirements: 5.1, 6.3_

- [x] 2. Write the `backfill-cert-verification-codes.ts` one-shot script
  - Place in `backend/scripts/backfill-cert-verification-codes.ts`
  - Use `crypto.randomBytes` over the `A-HJ-NP-Z2-9` alphabet (≥60 bits entropy), retry on collision, skip rows that already have a code, run idempotently
  - _Requirements: 8.3, 14.1, 14.2_

- [ ]* 3. Write migration round-trip test on a snapshot DB
  - Apply migration to a fresh snapshot, verify all new columns/tables/indexes exist, run backfill UPDATEs twice and assert the second pass is a no-op, drop and re-apply to verify idempotence
  - _Requirements: 5.1, 6.1, 11.4_

- [x] 4. Phase 1 checkpoint — verify migration applies cleanly
  - Apply migration in dev/staging; run all existing backend tests; confirm no regressions on legacy `certificate_templates`/`certificates` reads. Ensure all tests pass, ask the user if questions arise.

### Phase 2 — Designer redesign behind feature flag

- [x] 5. Add frontend dependencies and feature flag scaffolding
  - [x] 5.1 Add `zod`, `zustand`, `fast-check`, `@playwright/test`, `pixelmatch`, `qrcode` to `frontend/package.json`
    - _Requirements: 7.5, 12.1, 12.3_

  - [x] 5.2 Configure Playwright project for certificate designer flows in `frontend/playwright.config.ts`
    - _Requirements: 12.1, 12.2_

  - [x] 5.3 Add `NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2` to `frontend/.env.example` and document the rollout flag
    - _Requirements: 7.5_

- [x] 6. Build the shared template types module
  - [x] 6.1 Create `frontend/features/certificates/types/template.ts` with the `CertificateField` discriminated union (12 field types), `CertificateTemplate` interface, and `ApprovalStatus`/`TemplateScope` types
    - _Requirements: 2.1, 2.2, 7.1, 16.1_

  - [x] 6.2 Implement the Zod schema (permissive on read, strict on write) in the same module, with an `unknown`-field branch that the renderer can skip
    - _Requirements: 16.3, 16.4_

  - [x] 6.3 Implement `serialize(template)` (deterministic `JSON.stringify` with sorted-key replacer) and `parse(json)` returning a `CertificateTemplate` and throwing `TemplateParseError` with `.path`
    - _Requirements: 7.1, 16.1, 16.2, 16.3_

  - [ ]* 6.4 Property test for template serialization round-trip
    - **Property 1: Template serialization round-trip** — `parse(serialize(t))` deeply equals `t`; `serialize(parse(serialize(t)))` is byte-identical to `serialize(t)`
    - **Validates: Requirements 2.2, 2.3, 7.1, 7.2, 7.3, 7.4, 16.1, 16.2**

  - [ ]* 6.5 Property test for forward-compatible parser
    - **Property 2: Forward-compatible parser** — removing any subset of optional/future fields and re-parsing yields a template with those fields absent and no thrown error
    - **Validates: Requirement 16.4**

  - [ ]* 6.6 Property test for malformed-input parser robustness
    - **Property 3: Malformed-input parser robustness** — for any non-valid serialized template `s`, `parse(s)` throws a `TemplateParseError` with non-empty `.path`; no other exception class escapes
    - **Validates: Requirement 16.3**

- [x] 7. Implement field validators
  - [x] 7.1 Add validators in `frontend/features/certificates/validators/fieldValidators.ts` for `fontSize` ∈ [8,200], `fontWeight` ∈ {300..900}, `color` regex, `align` enum, `CustomTextField.text.length ≤ 500`
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.9_

  - [x] 7.2 Add background image validator (mime ∈ {png,jpeg,webp}, size ≤ 10 MB)
    - _Requirements: 1.3, 1.4_

  - [ ]* 7.3 Property test for field style validators
    - **Property 4: Field style validators** — accept iff every style value is in declared range; background validator accepts iff mime and size are within limits
    - **Validates: Requirements 1.4, 2.4, 2.5, 2.6, 2.7, 2.9**

- [x] 8. Build the Zustand designer store and undo/redo
  - [x] 8.1 Create `frontend/features/certificates/store/designerStore.ts` with `template`, `selectedFieldId`, `grid`, `zoom`, `dirty`, `history` slices and selector helpers
    - _Requirements: 1.5, 1.6, 1.12, 7.4_

  - [x] 8.2 Implement field actions (`addField`, `updateField`, `removeField`, `selectField`, `toggleVisibility`) as pure reducers
    - _Requirements: 2.1, 2.8, 7.1_

  - [x] 8.3 Implement geometry reducers (`moveField`, `resizeField`, `nudgeField`, snap-to-grid math, alignment-guide predicate)
    - _Requirements: 1.6, 1.7, 1.9, 1.10, 1.11_

  - [x] 8.4 Implement undo/redo history stack with bounded depth and `dirty` flag toggling
    - _Requirements: 1.12, 7.1_

  - [ ]* 8.5 Property test for designer geometry reducers
    - **Property 5: Designer geometry reducers are pure** — for any sequence of move/resize/snap/nudge actions, geometry equals the deterministic pure-reducer output; alignment guide shown iff field center is within 8px of canvas center
    - **Validates: Requirements 1.6, 1.7, 1.9, 1.10, 1.11**

- [x] 9. Build the shared renderer
  - [x] 9.1 Create `frontend/features/certificates/render/positioning.ts` with px/CSS conversion helpers and the canvas-to-PDF dimension math
    - _Requirements: 7.6, 12.1_

  - [x] 9.2 Create `frontend/features/certificates/render/CertificateRenderer.tsx` outputting absolutely positioned `<div>`s with inline styles
    - _Requirements: 2.2, 2.3, 7.5, 12.3_

  - [x] 9.3 Create `frontend/features/certificates/render/renderToHTML.ts` using `react-dom/server`'s `renderToStaticMarkup` against the same React tree
    - _Requirements: 7.5, 12.3_

  - [x] 9.4 Implement all 12 field renderers (`student_name`, `course_title`, `certificate_title`, `completion_date`, `issue_date`, `instructor_name`, `organization_name`, `certificate_id`, `verification_code`, `qr_code`, `grade`, `custom_text`) with HTML-escape on user content
    - _Requirements: 2.1, 2.10, 2.11, 2.12, 14.6_

  - [x] 9.5 Implement value-substitution rules (Grade → 1 decimal place + `%`, dates via `format` token, QR src via `qrcode.toDataURL`, empty value → empty content with bbox preserved)
    - _Requirements: 2.10, 2.11, 2.12, 3.6_

  - [x] 9.6 Create `frontend/features/certificates/render/fonts.ts` whitelisting the six fonts and load them via `next/font/google`
    - _Requirements: 12.3_

  - [ ]* 9.7 Property test for renderer determinism (DOM-vs-string parity)
    - **Property 6 (logical): Render is a deterministic function of (template, data)** — DOM render and HTML render produce structurally identical output (same field set, same per-field text, same absolute positions); hidden fields excluded; substitution rules applied uniformly
    - **Validates: Requirements 2.8, 2.10, 2.11, 2.12, 3.6, 7.5, 12.4, 15.2**

- [x] 10. Build canvas interaction components
  - [x] 10.1 Create `useDraggable` and `useResizable` hooks using `pointerdown`/`pointermove`/`pointerup` on `document` with snap-to-grid math
    - _Requirements: 1.5, 1.6, 1.7, 1.9_

  - [x] 10.2 Build `<DraggableField>` subscribing to its own field slice via Zustand selector
    - _Requirements: 1.5, 1.6, 1.7, 7.5_

  - [x] 10.3 Build `<GridOverlay>` honoring `grid.size` and `grid.visible`
    - _Requirements: 1.8_

  - [x] 10.4 Build `<AlignmentGuides>` showing center-axis guides within 8px tolerance
    - _Requirements: 1.10_

  - [x] 10.5 Build `<CanvasViewport>` with background image, zoom, and `<SelectionMarquee>` resize handles
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

- [x] 11. Build designer chrome
  - [x] 11.1 Build `<FieldInspector>` (font family, size, weight, color, align, visibility toggle) with inline validation errors
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 15.2_

  - [x] 11.2 Build `<Toolbar>` with add-field menu, grid toggle, snap toggle, zoom controls, undo/redo
    - _Requirements: 1.8, 1.9, 1.12, 15.1_

  - [x] 11.3 Build `<PreviewPane>` rendering with mock data using the shared renderer
    - _Requirements: 1.6, 1.12, 12.4_

  - [x] 11.4 Build `<KeyboardShortcuts>` (arrow nudge, delete, escape, undo/redo, ARIA live region announcements)
    - _Requirements: 1.11, 15.1, 15.2, 15.3_

  - [x] 11.5 Build `<DesignerHeader>` with breadcrumbs, save/submit-for-approval, dirty indicator, navigation guard
    - _Requirements: 5.5, 7.1, 7.7_

- [x] 12. Replace the existing CertificateTemplateDesigner
  - [x] 12.1 Replace `frontend/components/certificates/CertificateTemplateDesigner.tsx` with a feature-flagged shell that picks v2 when `NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2 === '1'`
    - _Requirements: 1.1, 1.2, 7.5_

  - [x] 12.2 Wire admin mode at `/admin/certificates/design` — full-edit, all field types, save creates `approval_status='approved'` directly
    - _Requirements: 3.1, 3.2, 3.7_

  - [x] 12.3 Wire teacher mode at `/teacher/courses/[id]/builder` Certificate tab — read-only when `allow_teacher_editing=false`, submit-for-approval flow when true, render rejection reason banner when present
    - _Requirements: 4.2, 5.4, 5.5, 5.7, 6.6_

  - [ ]* 12.4 Integration test: save fidelity (saved template reloads identically with all 12 field types, all style attributes, visibility flags)
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4** (covered by Property 1 generators)

  - [ ]* 12.5 Playwright + pixelmatch visual regression test
    - **Property 6 (visual): Preview-vs-PDF parity** — render one canonical template (1754×1240) in browser preview and via server PDF, compare with `pixelmatch` at ≤2px-per-field tolerance for three templates covering all 12 field types
    - **Validates: Requirements 7.5, 7.6, 12.1, 12.2, 12.3**

- [x] 13. Phase 2 checkpoint
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3 — Backend Template API + Issuance

- [x] 14. Build admin template CRUD endpoints
  - [x] 14.1 Implement `GET /api/certificate-templates` with `scope` and `approval_status` filters in `backend/src/routes/certificates.ts`
    - _Requirements: 3.7_

  - [x] 14.2 Implement `POST /api/certificate-templates` and `PATCH /api/certificate-templates/:id` for admins (writes go directly to `approved`)
    - _Requirements: 3.1, 3.2, 4.1_

  - [x] 14.3 Implement `DELETE /api/certificate-templates/:id` (admin only) and `POST /api/certificate-templates/:id/set-default` (clears prior default in same scope)
    - _Requirements: 3.3, 3.4, 4.6_

  - [x] 14.4 Implement `POST /api/certificate-templates/:id/render-preview` returning a base64 SVG/PNG via the shared renderer with mock data
    - _Requirements: 7.5, 12.4_

- [x] 15. Build teacher template endpoints
  - [x] 15.1 Implement `GET /api/certificate-templates?courseId=` filtered to courses the teacher owns; expose rejection reason when present
    - _Requirements: 5.2, 5.3, 6.6_

  - [x] 15.2 Implement `GET /api/certificate-templates/:id` with 403 for non-owners
    - _Requirements: 4.5_

  - [x] 15.3 Implement teacher `PATCH /api/certificate-templates/:id` with `submitForApproval=true` that creates a new revision row with `status='pending_approval'` and supersedes any prior pending revision
    - _Requirements: 5.4, 5.5_

- [x] 16. Build approval queue endpoints
  - [x] 16.1 Implement `GET /api/certificate-templates/approval/queue` with `page`/`pageSize=25` pagination
    - _Requirements: 6.1, 13.4_

  - [x] 16.2 Implement `GET /api/certificate-templates/:id/revisions` returning `{ current, pending?, history[] }`
    - _Requirements: 6.2_

  - [x] 16.3 Implement `POST /api/certificate-templates/:id/approve` flipping the pending revision to `approved`, prior approved to `superseded`, and copying `template_data` onto the parent row
    - _Requirements: 6.3_

  - [x] 16.4 Implement `POST /api/certificate-templates/:id/reject` with reason ≤1000 chars, flipping to `rejected` and storing the reason on the revision (parent unchanged)
    - _Requirements: 6.4, 6.5_

  - [ ]* 16.5 Property test for authorization matrix invariant
    - **Property 13: Authorization matrix invariant** — every (role, endpoint, ownership, body) tuple maps to the allow/deny decision in design §10
    - **Validates: Requirements 3.8, 4.2, 4.5, 5.1, 5.2, 5.3, 6.7, 9.7, 14.3**

- [x] 17. Build template resolution
  - [x] 17.1 Implement `resolveTemplate(courseId)` in `backend/src/modules/certificate/services/templateResolutionService.ts` — prefer course-scoped approved revision, else default global, else null; ignore pending and rejected revisions
    - _Requirements: 3.5, 4.3, 4.6, 5.6, 6.5_

  - [ ]* 17.2 Property test for template resolution
    - **Property 7: Template resolution is a pure function of (course, templates, revisions)**
    - **Validates: Requirements 3.3, 3.4, 3.5, 4.3, 4.6, 5.6, 6.5**

  - [ ]* 17.3 Property test for per-certificate snapshot stability
    - **Property 8: Per-certificate snapshot stability** — for any sequence of edits/approvals/rejections/deletions on the source template, `render(c, data)` is byte-identical to render with the original `template_snapshot`
    - **Validates: Requirements 4.7, 10.3, 10.4, 10.5, 10.6**

- [x] 18. Build the eligibility service
  - [x] 18.1 Create `backend/src/modules/certificate/services/eligibilityService.ts` exporting `isEligibleForCertificate(courseId, studentId)` returning `{ eligible: boolean, unmet: string[] }`
    - _Requirements: 8.1, 8.2_

  - [x] 18.2 Implement all six gates per design §8.1 (`enable_certificates`, enrollment completed, required lessons, required quizzes/assignments, final exam, weighted score via `calculate_student_final_score`, course-defined extra gates)
    - _Requirements: 8.1, 8.2_

  - [ ]* 18.3 Property test for eligibility predicate (and idempotence of `checkAndAwardCertificate`)
    - **Property 9: Eligibility predicate** — `eligible: true` iff every gate holds; `unmet` exactly equals the failing gate ids; double-call results in at most one row
    - **Validates: Requirements 8.1, 8.2, 8.7**

- [ ] 19. Build the issuance engine
  - [x] 19.1 Implement `issueCertificate(courseId, studentId, opts)` in `backend/src/modules/certificate/services/issuanceService.ts` orchestrating eligibility, score breakdown, template resolution, and snapshot deep-clone
    - _Requirements: 8.1, 8.4, 4.7, 10.6_

  - [x] 19.2 Generate `verification_code` via crypto-random over `A-HJ-NP-Z2-9` (≥60 bits) with collision retry; integrate `generate_certificate_number()`
    - _Requirements: 8.3, 14.1, 14.2_

  - [ ] 19.3 Render PDF via shared `renderToHTML` + Puppeteer `page.pdf({ width, height, printBackground: true })`, upload to Supabase Storage `certificates/<id>.pdf`, persist `pdf_url`
    - _Requirements: 7.5, 7.6, 10.2, 12.1_

  - [ ] 19.4 Generate QR data URL pointing at `${VERIFICATION_PORTAL_URL}/${verification_code}` and persist `qr_code_url`
    - _Requirements: 2.10, 11.6_

  - [x] 19.5 Persist all issuance artifacts atomically (`certificate_number`, `verification_code`, `qr_code_url`, `pdf_url`, `template_snapshot`, `final_score`, `grade_breakdown`, `completion_date`, `issued_at`); roll back the row + storage upload on render failure
    - _Requirements: 8.4, 8.7, 10.1, 10.2_

  - [ ]* 19.6 Property test for issuance artifact completeness
    - **Property 10: Issuance artifact completeness** — successful issuances have all required fields non-null; manual-override issuances additionally have `is_manual_override=true`, non-null `override_by`, non-empty `override_reason`
    - **Validates: Requirements 8.4, 8.6, 10.1, 10.2**

  - [ ]* 19.7 Property test for verification code uniqueness and entropy
    - **Property 11: Verification code uniqueness and entropy** — all `verification_code` and `certificate_number` values are pairwise distinct; random component ≥60 bits
    - **Validates: Requirements 8.3, 14.1, 14.2**

- [x] 20. Wire issuance hooks and backstop
  - [x] 20.1 Wire post-final-exam-grade hook in `backend/src/routes/finalExams.ts` calling `checkAndAwardCertificate` synchronously
    - _Requirements: 8.5_

  - [x] 20.2 Wire post-required-lesson-complete hook in `backend/src/routes/courseProgress.ts`
    - _Requirements: 8.5_

  - [x] 20.3 Implement `backend/src/jobs/certificateBackstopJob.ts` (`node-cron`, 15-minute cadence) finding completed enrollments without certificates and re-running `checkAndAwardCertificate`
    - _Requirements: 8.5_

  - [x] 20.4 Implement manual override path on `POST /api/teacher/courses/:courseId/students/:studentId/certificate` requiring non-empty `override.reason`
    - _Requirements: 8.6_

- [ ] 21. Backfill legacy data and migrate the PDF service
  - [ ] 21.1 Run `backfill-cert-verification-codes.ts` in staging then production
    - _Requirements: 8.3, 14.1_

  - [ ] 21.2 Run a render-and-upload backfill pass for legacy `certificates` rows lacking `pdf_url` and `template_snapshot`
    - _Requirements: 10.2, 10.6_

  - [ ] 21.3 Migrate `backend/src/modules/certificate/services/certificatePdfService.ts` to call the shared `renderToHTML(template, data)` and remove the legacy `generateCertificateHTML`
    - _Requirements: 7.5, 12.3_

- [ ] 22. Phase 3 checkpoint
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4 — Public verification portal

- [x] 23. Build the backend verification endpoint
  - [x] 23.1 Mount a dedicated `verifyLimiter` (60 req/min/IP) using `express-rate-limit` ahead of `GET /api/verify/:code` in `backend/src/modules/shared/routes/certificate.ts`
    - _Requirements: 11.8_

  - [x] 23.2 Set `Cache-Control: no-store` on every response and return the narrow public whitelist shape (`student_name`, `course_title`, `completion_date`, `certificate_id`, `instructor_name`, `organization_name`, `status`, `revoked_at?`, `revoke_reason?`)
    - _Requirements: 11.7, 14.5_

  - [x] 23.3 Resolve status (`valid`/`revoked`/`expired`/`invalid`) and write a `certificate_verification_log` row on every call with `verified_by_ip`, `verified_by_user_agent`, and `verification_result`
    - _Requirements: 11.2, 11.3, 11.5, 14.4_

  - [x] 23.4 On `valid` lookups, increment `verification_count` and set `last_verified_at`
    - _Requirements: 11.4_

  - [ ]* 23.5 Property test for public verification correctness
    - **Property 12: Public verification correctness** — status mapping per (i); response keys ⊆ whitelist per (ii); exactly one log row per call per (iii); `verification_count` and `last_verified_at` updated only on `valid`
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5, 11.7, 14.4**

- [x] 24. Build the frontend verification page
  - [x] 24.1 Create `frontend/app/verify/[code]/page.tsx` server component with `dynamic = 'force-dynamic'`, `cache: 'no-store'`, forwarding `x-forwarded-for`
    - _Requirements: 11.1, 11.6_

  - [x] 24.2 Add `/verify/:code` to the public-route bypass in `frontend/middleware.ts`
    - _Requirements: 11.1_

  - [x] 24.3 Build `<VerificationResultView>` with explicit UI states for `valid`, `revoked`, `expired`, `invalid` (revoked surfaces date + reason)
    - _Requirements: 11.2, 11.3, 11.5_

  - [ ]* 24.4 Property test for custom text sanitization
    - **Property 14: Custom text sanitization** — for any string `s` (including XSS payloads, bidi tricks), the rendered output HTML-encodes `<`, `>`, `&`, `"`, `'` and contains no executable script or active content
    - **Validates: Requirement 14.6**

- [x] 25. Phase 4 checkpoint
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5 — Student Center & Rollout

- [x] 26. Rebuild the Student Certificate Center
  - [x] 26.1 Rebuild `frontend/app/student/certificates/page.tsx` listing every active certificate with course name, completion date, certificate id, instructor, verification status
    - _Requirements: 9.1, 9.2, 9.7_

  - [x] 26.2 Implement in-page PDF viewer triggered by "View"
    - _Requirements: 9.3_

  - [x] 26.3 Implement "Download PDF" action that pulls from `pdf_url` (or generates on demand if empty) without re-running eligibility
    - _Requirements: 9.4_

  - [x] 26.4 Implement "Share" action with copyable verification URL plus Web Share API fallback
    - _Requirements: 9.5_

  - [x] 26.5 Implement empty-state with link to course catalog
    - _Requirements: 9.6_

  - [ ]* 26.6 Add LinkedIn "Add to Profile" share button
    - _Requirements: 9.5_

- [x] 27. Build the admin approval review UI
  - [x] 27.1 Build `<ApprovalPanel>` rendering side-by-side previous-approved vs pending revision via the shared renderer with the same mock data
    - _Requirements: 6.2_

  - [x] 27.2 Build a structural per-field diff helper (added/removed/changed properties)
    - _Requirements: 6.2_

  - [x] 27.3 Wire the approve action calling `POST /api/certificate-templates/:id/approve`
    - _Requirements: 6.3_

  - [x] 27.4 Wire the reject form with a 1000-char textarea + inline counter calling `POST /api/certificate-templates/:id/reject`
    - _Requirements: 6.4_

  - [ ]* 27.5 Property test for approval queue pagination
    - **Property 15: Approval queue pagination** — for any `N` pending templates and `pageSize=25`, the response returns ≤25 items at offset `(page-1)×25`, exposes `total=N`, and the union across pages with no duplicates equals the full pending set
    - **Validates: Requirement 13.4**

- [ ] 28. Build the admin certificate library
  - [x] 28.1 Build the global + course templates list view with `is_default` indicator and approval-status badge
    - _Requirements: 3.7_

  - [x] 28.2 Wire the set-default action with a confirmation prompt
    - _Requirements: 3.3, 3.4_

  - [ ] 28.3 Wire the delete action with a confirmation prompt
    - _Requirements: 3.1, 4.6_

- [ ] 29. Flip the feature flag and remove legacy paths
  - [x] 29.1 Default `NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2` to `'1'` in `frontend/.env.example` and the deployment env templates
    - _Requirements: 7.5_

  - [ ] 29.2 Remove the legacy `placeholders`-only renderer branch (deprecation pass), leaving only the `CertificateField[]` path
    - _Requirements: 7.5, 12.3_

  - [ ] 29.3 Soft-deprecate `template_data.approval_status` and `template_data.allow_teacher_edits` reads with a `console.warn` once per process
    - _Requirements: 5.1, 6.3_

- [x] 30. Final checkpoint — full test suite and build green
  - Run the full backend `jest` suite, the frontend `jest` suite, the Playwright suite, and the production builds for both packages. Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. They are predominantly property-based tests, integration tests, and supplemental share targets.
- Each task references the specific requirement IDs it satisfies for traceability.
- Property-based tests (Properties 1–15 from design §11) are co-located with the implementation they validate so failures are caught early.
- Checkpoints (tasks 4, 13, 22, 25, 30) sit on phase boundaries so the rollout can stop and ship at any phase.
- Phase 1 is non-breaking and reversible by leaving the new columns/tables unused. Phases 2–5 are flag-flipped via `NEXT_PUBLIC_FEATURE_CERT_DESIGNER_V2`.
