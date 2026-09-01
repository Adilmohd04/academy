-- ============================================================================
-- Course Discussions Base Tables
-- ============================================================================
-- The codebase reads/writes `course_discussions` and `discussion_replies`
-- (see backend/src/modules/shared/services/discussionService.ts), and a later
-- migration (20241227_discussion_votes.sql) added `discussion_votes` assuming
-- these base tables existed — but no committed migration ever created them.
--
-- That mismatch is what's causing the 500s on:
--   POST /api/courses/:courseId/discussions
--   GET  /api/courses/:courseId/discussions
--
-- This migration is fully idempotent and safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. course_discussions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_discussions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,                           -- clerk_user_id
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  is_pinned   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_discussions_course_id   ON course_discussions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_discussions_user_id     ON course_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_discussions_pinned_time ON course_discussions(course_id, is_pinned, created_at DESC);

COMMENT ON TABLE course_discussions IS
  'Top-level discussion posts in a course. Authored via clerk_user_id. Replies live in discussion_replies.';

-- ----------------------------------------------------------------------------
-- 2. discussion_replies
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discussion_replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL,                         -- clerk_user_id
  content       TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion ON discussion_replies(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_user_id    ON discussion_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_time       ON discussion_replies(discussion_id, created_at);

COMMENT ON TABLE discussion_replies IS
  'Replies to course_discussions. Authored via clerk_user_id.';

-- ----------------------------------------------------------------------------
-- 3. updated_at triggers (reuse the function from 20241227_discussion_votes.sql
--    if it exists, otherwise create it locally; either way this is safe).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_course_discussions_updated_at'
  ) THEN
    CREATE TRIGGER update_course_discussions_updated_at
      BEFORE UPDATE ON course_discussions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_discussion_replies_updated_at'
  ) THEN
    CREATE TRIGGER update_discussion_replies_updated_at
      BEFORE UPDATE ON discussion_replies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;
