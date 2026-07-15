-- Fix quiz_submissions table schema
-- Add missing columns required for quiz submission feature

-- Create or update quiz_submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL, -- clerk_user_id (TEXT)
  answers JSONB NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  total_points NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS student_id TEXT;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS total_points NUMERIC DEFAULT 0;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS percentage NUMERIC DEFAULT 0;
ALTER TABLE quiz_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lesson_id ON quiz_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lesson_student ON quiz_submissions(lesson_id, student_id);

-- Verify the schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'quiz_submissions'
ORDER BY ordinal_position;
