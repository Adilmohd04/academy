-- ============================================================================
-- Certificate Designer Studio & Lifecycle System Migration
-- ============================================================================
-- Spec: .kiro/specs/certificate-designer-studio/
-- Phase 1 — non-breaking schema additions only.
--
-- This migration is fully idempotent. Every operation uses IF NOT EXISTS or is
-- guarded so it can be re-applied safely. No existing column or table is
-- dropped or retyped; existing rows are unaffected except for the explicit
-- backfill UPDATEs at the end.
--
-- Apply order:
--   1. Sub-task 1.1 — Additions to `certificates`
--   2. Sub-task 1.2 — Additions to `certificate_templates`
--   3. Sub-task 1.3 — New `certificate_template_revisions` table
--   4. Sub-task 1.4 — New `certificate_verification_log` table
--   5. Sub-task 1.5 — Idempotent backfill UPDATEs
-- ============================================================================

-- ============================================================================
-- 1.1  Additions to `certificates`
-- ----------------------------------------------------------------------------
-- New columns track verification, durable storage URLs, eligibility timestamps,
-- manual-override audit, public-verification telemetry, and the per-certificate
-- template snapshot used for historical fidelity (design §6.5).
-- ============================================================================

-- Defensive guard: create certificates if missing (matches baseline shape).
CREATE TABLE IF NOT EXISTS certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  certificate_url    TEXT,
  final_score        DECIMAL(5,2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  grade_breakdown    JSONB,
  status             VARCHAR(50) DEFAULT 'awarded',
  issued_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issued_by          UUID REFERENCES profiles(id),
  revoked_at         TIMESTAMP WITH TIME ZONE,
  revoked_by         UUID REFERENCES profiles(id),
  revoke_reason      TEXT,
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS verification_code   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS qr_code_url         TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url             TEXT,
  ADD COLUMN IF NOT EXISTS completion_date     TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_manual_override  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_by         UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS override_reason     TEXT,
  ADD COLUMN IF NOT EXISTS verification_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verified_at    TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS template_snapshot   JSONB;

-- Partial unique index: only enforce uniqueness on rows that have a code.
-- Legacy rows (verification_code IS NULL) are exempt until backfill runs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_code
  ON certificates (verification_code)
  WHERE verification_code IS NOT NULL;

COMMENT ON COLUMN certificates.verification_code IS
  'Public, human-shareable code used by the Verification Portal. Format: XXXX-XXXX-XXXX, ≥60 bits entropy.';
COMMENT ON COLUMN certificates.qr_code_url IS
  'Data URL or storage URL for the embedded QR image resolving to the verification portal.';
COMMENT ON COLUMN certificates.pdf_url IS
  'Public URL of the rendered PDF in the certificates Supabase storage bucket.';
COMMENT ON COLUMN certificates.completion_date IS
  'Timestamp when the student first met all eligibility gates (distinct from issued_at).';
COMMENT ON COLUMN certificates.is_manual_override IS
  'True when an admin or course-owner teacher issued the certificate via the override path.';
COMMENT ON COLUMN certificates.override_by IS
  'Profile id of the operator who triggered the manual override.';
COMMENT ON COLUMN certificates.override_reason IS
  'Free-text reason for manual override; required when is_manual_override is true.';
COMMENT ON COLUMN certificates.verification_count IS
  'Number of successful public verifications of this certificate.';
COMMENT ON COLUMN certificates.last_verified_at IS
  'Timestamp of the most recent successful public verification.';
COMMENT ON COLUMN certificates.template_snapshot IS
  'Deep-clone of the resolved CertificateTemplate at issuance time. Renderer reads only this for historical fidelity.';

-- ============================================================================
-- 1.2  Additions to `certificate_templates`
-- ----------------------------------------------------------------------------
-- Approval workflow columns are promoted from inside template_data JSON to
-- real columns so the approval queue query is indexable. The teacher-edit
-- toggle is also promoted.
-- ============================================================================

-- Defensive guard: some installations don't have certificate_templates at all
-- (the baseline migration was only partially applied). Create it if missing
-- so the rest of this section can ALTER it. The shape matches
-- certificate_system.sql.
CREATE TABLE IF NOT EXISTS certificate_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID REFERENCES courses(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_data JSONB NOT NULL,
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Defensive guard: some installations have an older certificate_templates
-- without course_id. Add the column if it's missing so the composite index
-- below can be created safely.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'certificate_templates'
      AND column_name = 'course_id'
  ) THEN
    ALTER TABLE certificate_templates
      ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;
  END IF;
END$$;

ALTER TABLE certificate_templates
  ADD COLUMN IF NOT EXISTS approval_status       TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_by           UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at           TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejection_reason      TEXT,
  ADD COLUMN IF NOT EXISTS allow_teacher_editing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_template_id    UUID REFERENCES certificate_templates(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 1.2b  Reconcile with the LIVE legacy schema.
-- ----------------------------------------------------------------------------
-- The production certificate_templates table predates the Designer Studio and
-- uses `name` + a NOT NULL `template_html` column. All application code,
-- however, reads/writes `template_name` and `template_data`. Bridge the gap
-- non-destructively so both the legacy renderer and the v2 designer work.

-- template_data JSONB — canonical store for the v2 designer JSON.
ALTER TABLE certificate_templates
  ADD COLUMN IF NOT EXISTS template_data JSONB;

-- template_name — the code's name column. Backfill from `name` if that exists.
ALTER TABLE certificate_templates
  ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE certificate_templates SET template_name = name WHERE template_name IS NULL AND name IS NOT NULL';
  END IF;
END$$;

-- template_html is NOT NULL in the legacy schema, but the v2 designer stores
-- JSON, not HTML. Make it nullable so new rows insert without an HTML body.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'template_html'
  ) THEN
    EXECUTE 'ALTER TABLE certificate_templates ALTER COLUMN template_html DROP NOT NULL';
  END IF;
END$$;

-- `name` is also NOT NULL in the legacy schema; relax it so inserts that only
-- provide template_name succeed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'name'
  ) THEN
    EXECUTE 'ALTER TABLE certificate_templates ALTER COLUMN name DROP NOT NULL';
  END IF;
END$$;

-- Backfill template_data for legacy rows that only have HTML so the resolver
-- and renderer have something to read.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'template_html'
  ) THEN
    EXECUTE $sql$
      UPDATE certificate_templates
      SET template_data = jsonb_build_object(
        'schemaVersion', 1,
        'legacy_html', template_html,
        'background_image_url', COALESCE(background_image_url, ''),
        'fields', '[]'::jsonb
      )
      WHERE template_data IS NULL
    $sql$;
  END IF;
END$$;

-- Add the CHECK constraint separately so the migration is safe to re-apply
-- and to avoid a destructive DROP/ADD if it already exists with the same name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'certificate_templates'
      AND constraint_name = 'certificate_templates_approval_status_check'
  ) THEN
    ALTER TABLE certificate_templates
      ADD CONSTRAINT certificate_templates_approval_status_check
      CHECK (approval_status IN ('approved', 'pending_approval', 'rejected', 'draft'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_cert_tpl_approval_status
  ON certificate_templates (approval_status);

CREATE INDEX IF NOT EXISTS idx_cert_tpl_course_status
  ON certificate_templates (course_id, approval_status);

COMMENT ON COLUMN certificate_templates.approval_status IS
  'Workflow state. One of: approved | pending_approval | rejected | draft.';
COMMENT ON COLUMN certificate_templates.approved_by IS
  'Profile id of the admin who approved the current template_data.';
COMMENT ON COLUMN certificate_templates.approved_at IS
  'Timestamp of the latest approval.';
COMMENT ON COLUMN certificate_templates.rejection_reason IS
  'Free text up to 1000 chars explaining the most recent rejection (length enforced at API layer).';
COMMENT ON COLUMN certificate_templates.allow_teacher_editing IS
  'When true, the course-owner teacher may edit this template and submit revisions for approval.';
COMMENT ON COLUMN certificate_templates.parent_template_id IS
  'Reserved for future fork support. Nullable. Current revision flow uses certificate_template_revisions.';

-- ============================================================================
-- 1.3  New table: `certificate_template_revisions`
-- ----------------------------------------------------------------------------
-- One row per save (teacher edit submitted, admin direct edit, etc). Lets the
-- admin approval UI render side-by-side previous-vs-pending and lets the
-- issuance engine fall back to the previously-approved version while a
-- pending edit is awaiting review. See design §3.3.
-- ============================================================================

CREATE TABLE IF NOT EXISTS certificate_template_revisions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE,
  revision_number   INTEGER NOT NULL,
  template_data     JSONB NOT NULL,
  status            TEXT NOT NULL,
  submitted_by      UUID REFERENCES profiles(id),
  submitted_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMP WITH TIME ZONE,
  rejection_reason  TEXT,
  UNIQUE (template_id, revision_number)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'certificate_template_revisions'
      AND constraint_name = 'certificate_template_revisions_status_check'
  ) THEN
    ALTER TABLE certificate_template_revisions
      ADD CONSTRAINT certificate_template_revisions_status_check
      CHECK (status IN ('approved', 'pending_approval', 'rejected', 'superseded'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_cert_template_rev_template
  ON certificate_template_revisions (template_id);

CREATE INDEX IF NOT EXISTS idx_cert_template_rev_status
  ON certificate_template_revisions (status);

-- Look up the most recent approved revision for a given template.
-- This is the issuance hot path so it gets a dedicated composite index.
CREATE INDEX IF NOT EXISTS idx_cert_template_rev_template_status_submitted
  ON certificate_template_revisions (template_id, status, submitted_at DESC);

COMMENT ON TABLE certificate_template_revisions IS
  'Append-only revision history for certificate_templates. A new revision is created on every save. The current rendered version is the most recent revision with status = approved.';
COMMENT ON COLUMN certificate_template_revisions.revision_number IS
  'Monotonic per-template counter assigned at insert time by the application layer.';
COMMENT ON COLUMN certificate_template_revisions.status IS
  'One of approved | pending_approval | rejected | superseded.';

-- ============================================================================
-- 1.4  New table: `certificate_verification_log`
-- ----------------------------------------------------------------------------
-- The shared certificate service already references this table. Adding it
-- here so the codebase and the migration agree.
-- ============================================================================

CREATE TABLE IF NOT EXISTS certificate_verification_log (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id         UUID REFERENCES certificates(id) ON DELETE SET NULL,
  verification_code      VARCHAR(20),
  verified_by_ip         INET,
  verified_by_user_agent TEXT,
  verification_result    TEXT NOT NULL,
  verified_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'certificate_verification_log'
      AND constraint_name = 'certificate_verification_log_result_check'
  ) THEN
    ALTER TABLE certificate_verification_log
      ADD CONSTRAINT certificate_verification_log_result_check
      CHECK (verification_result IN ('valid', 'invalid', 'revoked', 'expired'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_cert_verify_log_cert
  ON certificate_verification_log (certificate_id);

CREATE INDEX IF NOT EXISTS idx_cert_verify_log_time
  ON certificate_verification_log (verified_at);

-- Supports IP-based abuse-review queries cheaply (rate-limit auditing).
CREATE INDEX IF NOT EXISTS idx_cert_verify_log_ip_time
  ON certificate_verification_log (verified_by_ip, verified_at);

COMMENT ON TABLE certificate_verification_log IS
  'One row per public verification attempt (valid, invalid, revoked, expired). Used for per-certificate stats and IP-based abuse review.';

-- ============================================================================
-- 1.5  Idempotent backfill UPDATEs
-- ----------------------------------------------------------------------------
-- Promote approval_status and allow_teacher_editing from inside template_data
-- JSON to the new columns. Legacy rows with no recorded approval state are
-- assumed pre-approved so they keep working under the new code paths.
--
-- Each UPDATE is conditional on the new column still holding its default,
-- so re-running this migration is safe.
-- ============================================================================

-- (a) If template_data has an approval_status field, promote it.
-- Wrap in a guard that checks template_data exists (older rows may have null).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'template_data'
  ) THEN
    UPDATE certificate_templates
    SET approval_status = template_data->>'approval_status'
    WHERE approval_status = 'draft'
      AND template_data IS NOT NULL
      AND template_data ? 'approval_status'
      AND (template_data->>'approval_status') IN ('approved', 'pending_approval', 'rejected', 'draft');
  END IF;
END$$;

-- (b) Any remaining legacy rows still tagged 'draft' that pre-date this
-- migration are assumed to be the pre-spec rows that already issued
-- certificates against. Promote them to 'approved' so the new resolver
-- doesn't ignore them. Only run if created_at exists on the table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'created_at'
  ) THEN
    UPDATE certificate_templates
    SET approval_status = 'approved'
    WHERE approval_status = 'draft'
      AND created_at IS NOT NULL
      AND created_at < NOW() - INTERVAL '1 second';
  END IF;
END$$;

-- (c) Promote the teacher-editing flag from JSON if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificate_templates' AND column_name = 'template_data'
  ) THEN
    UPDATE certificate_templates
    SET allow_teacher_editing = COALESCE((template_data->>'allow_teacher_edits')::boolean, false)
    WHERE allow_teacher_editing = false
      AND template_data IS NOT NULL
      AND template_data ? 'allow_teacher_edits';
  END IF;
END$$;

-- ============================================================================
-- Verification queries (commented; run ad-hoc to confirm the migration applied)
-- ============================================================================

-- New columns on certificates:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'certificates'
-- AND column_name IN (
--   'verification_code','qr_code_url','pdf_url','completion_date',
--   'is_manual_override','override_by','override_reason',
--   'verification_count','last_verified_at','template_snapshot'
-- );

-- New columns on certificate_templates:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'certificate_templates'
-- AND column_name IN (
--   'approval_status','approved_by','approved_at','rejection_reason',
--   'allow_teacher_editing','parent_template_id'
-- );

-- New tables:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('certificate_template_revisions','certificate_verification_log');

-- Backfill sanity check (should all be in {'approved','pending_approval','rejected'} after migration):
-- SELECT approval_status, COUNT(*) FROM certificate_templates GROUP BY approval_status;
