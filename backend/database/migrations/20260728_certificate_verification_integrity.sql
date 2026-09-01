-- ============================================================================
-- Certificate verification integrity
-- ---------------------------------------------------------------------------
-- A newly issued, publicly-valid certificate must always carry the canonical
-- opaque verification code and a QR representation. The constraint is NOT
-- VALID so old rows can be backfilled without blocking deployment, while all
-- future inserts/updates are enforced immediately by PostgreSQL.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'certificates_active_verification_artifacts_check'
      AND conrelid = 'public.certificates'::regclass
  ) THEN
    ALTER TABLE certificates
      ADD CONSTRAINT certificates_active_verification_artifacts_check
      CHECK (
        LOWER(COALESCE(status, '')) NOT IN ('active', 'awarded', 'issued')
        OR (
          verification_code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'
          AND NULLIF(BTRIM(qr_code_url), '') IS NOT NULL
        )
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON CONSTRAINT certificates_active_verification_artifacts_check ON certificates IS
  'Future active certificates require a canonical 60-bit verification code and non-empty QR artifact; legacy rows are backfilled separately.';
