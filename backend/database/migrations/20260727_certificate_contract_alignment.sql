-- ============================================================================
-- Certificate lifecycle contract alignment
-- ---------------------------------------------------------------------------
-- Run this AFTER certificate_system.sql and certificate_designer_studio.sql.
--
-- The live academy application uses Clerk user IDs (TEXT) throughout
-- enrollments, learning progress, and teacher dashboards. Older certificate
-- migrations declared certificates.student_id as a profile UUID, which made a
-- fresh database incompatible with the live issuance and student-portal code.
-- This migration safely aligns the certificate table with the live identity
-- contract and adds every field written by the canonical issuance service.
-- ============================================================================

BEGIN;

-- Canonical issuance captures stable display values at the point a certificate
-- is awarded. They are nullable for legacy rows; all newly issued rows provide
-- them, so a historical record remains usable even if a course/profile changes.
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS student_name        TEXT,
  ADD COLUMN IF NOT EXISTS course_name_cached  TEXT,
  ADD COLUMN IF NOT EXISTS total_marks         NUMERIC,
  ADD COLUMN IF NOT EXISTS percentage          NUMERIC,
  ADD COLUMN IF NOT EXISTS expires_at          TIMESTAMP WITH TIME ZONE;

-- Some early database installs were created with student_id UUID references to
-- profiles.id. Convert that column to TEXT and map existing values to the
-- corresponding Clerk identity. Do not add a new FK here: several legacy
-- installs have profiles.clerk_user_id without a unique database constraint,
-- and a failed FK creation would make this safety migration non-portable.
DO $$
DECLARE
  student_id_type TEXT;
  fk_name TEXT;
BEGIN
  SELECT data_type
    INTO student_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'certificates'
    AND column_name = 'student_id';

  IF student_id_type = 'uuid' THEN
    FOR fk_name IN
      SELECT constraint_name
      FROM information_schema.key_column_usage
      WHERE table_schema = 'public'
        AND table_name = 'certificates'
        AND column_name = 'student_id'
        AND position_in_unique_constraint IS NOT NULL
    LOOP
      EXECUTE format('ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS %I', fk_name);
    END LOOP;

    ALTER TABLE public.certificates
      ALTER COLUMN student_id TYPE TEXT USING student_id::TEXT;

    UPDATE public.certificates AS certificate
    SET student_id = profile.clerk_user_id
    FROM public.profiles AS profile
    WHERE certificate.student_id = profile.id::TEXT
      AND profile.clerk_user_id IS NOT NULL;
  END IF;
END $$;

-- Public verification must be unique and fast even for a table with legacy
-- records waiting for backfill. The partial index allows those legacy NULLs
-- while the backfill script fills them safely.
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_code
  ON certificates (verification_code)
  WHERE verification_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_certificates_student_course
  ON certificates (student_id, course_id);

COMMENT ON COLUMN certificates.student_id IS
  'Clerk user ID (TEXT). Matches enrollments.student_id and student progress records.';
COMMENT ON COLUMN certificates.expires_at IS
  'Optional expiry timestamp. The public verifier treats certificates past this time as expired without a background job.';

COMMIT;

-- Verification query:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'certificates'
--   AND column_name IN ('student_id', 'student_name', 'course_name_cached',
--                       'total_marks', 'percentage', 'expires_at');
