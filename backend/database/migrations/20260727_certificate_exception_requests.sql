-- ============================================================================
-- Certificate exception requests
-- ---------------------------------------------------------------------------
-- Teacher-submitted exceptional certificate requests.  An exception is never
-- itself a certificate: an administrator must review it, and the API then
-- delegates issuance to the canonical certificate lifecycle service.
--
-- This migration is intentionally idempotent. It can be applied alongside
-- the existing certificate_designer_studio migration without replacing any
-- legacy certificate data.
-- ============================================================================

CREATE TABLE IF NOT EXISTS certificate_exception_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id         UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  -- Student identifiers are stored as text because this codebase supports
  -- both legacy profile UUIDs and Clerk user IDs in enrollment/certificate
  -- records. The canonical issuance service receives the same identifier.
  student_id        TEXT NOT NULL,
  requested_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  requested_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMP WITH TIME ZONE,
  rejection_reason  TEXT,
  certificate_id    UUID REFERENCES certificates(id) ON DELETE SET NULL,
  issued_at         TIMESTAMP WITH TIME ZONE,
  approval_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at   TIMESTAMP WITH TIME ZONE,
  last_error        TEXT,
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT certificate_exception_requests_reason_check
    CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  CONSTRAINT certificate_exception_requests_status_check
    CHECK (status IN ('pending', 'processing', 'approved', 'rejected')),
  CONSTRAINT certificate_exception_requests_rejection_reason_check
    CHECK (status <> 'rejected' OR char_length(btrim(COALESCE(rejection_reason, ''))) BETWEEN 1 AND 2000),
  CONSTRAINT certificate_exception_requests_approved_audit_check
    CHECK (
      status <> 'approved'
      OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND certificate_id IS NOT NULL AND issued_at IS NOT NULL)
    )
);

-- A teacher can retry after a rejection, but there can only be one request
-- awaiting an administrator's decision for a course/student pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_exception_requests_one_pending
  ON certificate_exception_requests (course_id, student_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_certificate_exception_requests_pending_queue
  ON certificate_exception_requests (status, requested_at ASC);

CREATE INDEX IF NOT EXISTS idx_certificate_exception_requests_teacher
  ON certificate_exception_requests (requested_by, requested_at DESC);

COMMENT ON TABLE certificate_exception_requests IS
  'Teacher requests for an administrator to issue a certificate despite unmet standard eligibility gates.';
COMMENT ON COLUMN certificate_exception_requests.reason IS
  'Teacher-supplied exceptional-case justification. Reused as the immutable certificate override reason when approved.';
COMMENT ON COLUMN certificate_exception_requests.last_error IS
  'Last canonical issuance error. The request remains pending so an administrator can retry after correcting the cause.';
