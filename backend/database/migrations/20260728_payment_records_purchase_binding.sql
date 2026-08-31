-- ============================================================================
-- Secure purchase binding for legacy payment_records
-- ---------------------------------------------------------------------------
-- The course-payment API must be able to prove which authenticated student
-- created an order before an enrollment exists. Older installations used
-- payment_records only for meetings, so these nullable columns are additive
-- and leave historical rows untouched.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.payment_records') IS NOT NULL THEN
    ALTER TABLE public.payment_records
      ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS student_clerk_id TEXT,
      ADD COLUMN IF NOT EXISTS payment_data JSONB;

    CREATE INDEX IF NOT EXISTS idx_payment_records_course_student
      ON public.payment_records (course_id, student_clerk_id)
      WHERE course_id IS NOT NULL AND student_clerk_id IS NOT NULL;
  END IF;
END $$;

