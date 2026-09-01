-- Course Automation Features Migration
-- Adds fields for course completion verification, archiving, and automation

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP;

-- Add index for cron job queries
CREATE INDEX IF NOT EXISTS idx_courses_unlock_date ON course_weeks(unlock_date) WHERE unlock_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_ends_at ON courses(ends_at) WHERE ends_at IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_unlock_date ON course_lessons(release_date) WHERE release_date IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name IN ('is_completed', 'completed_at', 'archived_at', 'ends_at')
ORDER BY column_name;
