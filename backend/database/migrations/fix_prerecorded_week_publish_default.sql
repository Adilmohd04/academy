-- Fix: Change course_weeks.is_published default from TRUE to FALSE
-- This corrects the original migration that defaulted weeks to published,
-- causing pre-recorded course weeks to appear published on page reload.

-- 1. Fix the column default for all future inserts
ALTER TABLE course_weeks ALTER COLUMN is_published SET DEFAULT FALSE;

-- 2. Update existing pre-recorded course weeks to unpublished
-- Only affects pre-recorded courses; live/hybrid course weeks are NOT changed.
UPDATE course_weeks
SET is_published = false
WHERE course_id IN (
  SELECT id FROM courses WHERE course_type = 'pre-recorded'
);
