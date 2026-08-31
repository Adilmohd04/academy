-- ============================================================================
-- Certificate reissue revisions
-- ---------------------------------------------------------------------------
-- Run this AFTER:
--   1. certificate_system.sql
--   2. certificate_designer_studio.sql
--   3. 20260727_certificate_contract_alignment.sql
--
-- Revocation is immutable: a corrected certificate is a new revision with a
-- fresh certificate number, verification URL, and QR code. The original row
-- remains available to the public verifier and continues to report revoked.
-- ============================================================================

BEGIN;

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS revision_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reissued_from_certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reissue_reason TEXT,
  ADD COLUMN IF NOT EXISTS reissued_by TEXT,
  ADD COLUMN IF NOT EXISTS reissued_at TIMESTAMP WITH TIME ZONE;

-- The original schema allowed only one record for a course/student pair. That
-- rule prevents preserving a revoked credential alongside a corrected one.
-- Remove only the two-column unique constraint, never certificate_number's
-- own uniqueness constraint.
DO $$
DECLARE
  existing_constraint TEXT;
BEGIN
  FOR existing_constraint IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON kcu.constraint_schema = tc.constraint_schema
      AND kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
      AND kcu.table_name = tc.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'certificates'
      AND tc.constraint_type = 'UNIQUE'
    GROUP BY tc.constraint_name
    HAVING COUNT(*) = 2
      AND BOOL_AND(kcu.column_name IN ('course_id', 'student_id'))
  LOOP
    EXECUTE format('ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS %I', existing_constraint);
  END LOOP;
END $$;

-- Number the legacy history deterministically. Existing installs normally
-- have one row per pair; this also makes imported historical records readable.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id, student_id
      ORDER BY issued_at ASC NULLS LAST, id ASC
    ) AS revision_number
  FROM certificates
)
UPDATE certificates AS certificate
SET revision_number = ranked.revision_number
FROM ranked
WHERE certificate.id = ranked.id;

-- At most one non-revoked credential may be active for a student/course.
-- Revoked records are deliberately excluded, allowing a linked reissue.
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_active_student_course
  ON certificates (course_id, student_id)
  WHERE status IN ('active', 'awarded', 'issued');

CREATE INDEX IF NOT EXISTS idx_certificates_reissue_source
  ON certificates (reissued_from_certificate_id)
  WHERE reissued_from_certificate_id IS NOT NULL;

COMMENT ON COLUMN certificates.revision_number IS
  'Monotonic certificate revision number per course/student pair.';
COMMENT ON COLUMN certificates.reissued_from_certificate_id IS
  'Revoked certificate superseded by this new credential revision.';
COMMENT ON COLUMN certificates.reissue_reason IS
  'Audited administrator reason for issuing a replacement credential.';
COMMENT ON COLUMN certificates.reissued_by IS
  'Administrator profile UUID or Clerk ID that authorized the replacement.';

COMMIT;
