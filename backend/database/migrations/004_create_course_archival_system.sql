-- ============================================
-- COURSE ARCHIVAL SYSTEM SCHEMA
-- ============================================
-- Track course archival and restoration

-- ============================================
-- 1. COURSE ARCHIVE LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS course_archive_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  archived_by TEXT NOT NULL, -- User ID who performed the action
  archive_reason TEXT,
  action VARCHAR(50) NOT NULL CHECK (action IN ('archived', 'restored', 'permanently_deleted')),
  performed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archive_log_course ON course_archive_log(course_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_archive_log_user ON course_archive_log(archived_by);
CREATE INDEX IF NOT EXISTS idx_archive_log_action ON course_archive_log(action, performed_at DESC);

COMMENT ON TABLE course_archive_log IS 'Tracks archival, restoration, and permanent deletion of courses';
