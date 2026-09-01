-- Coursera-Style Course Fields Migration
-- Run this in Supabase SQL Editor

-- Add new fields to courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS mentoring_text TEXT,
  ADD COLUMN IF NOT EXISTS mentoring_structured JSONB,
  ADD COLUMN IF NOT EXISTS schedule_frequency TEXT,
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS enrollment_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS course_format_description TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name IN (
  'mentoring_text',
  'mentoring_structured',
  'schedule_frequency',
  'schedule_timezone',
  'enrollment_deadline',
  'course_format_description'
)
ORDER BY column_name;

-- Expected output:
-- column_name                | data_type | is_nullable
-- ---------------------------|-----------|--------------
-- course_format_description  | text      | YES
-- enrollment_deadline        | timestamp | YES
-- mentoring_structured       | jsonb     | YES
-- mentoring_text             | text      | YES
-- schedule_frequency         | text      | YES
-- schedule_timezone          | text      | YES
