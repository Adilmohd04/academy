-- Add professional course fields for Coursera-style overview
-- Migration: add_professional_course_fields.sql
-- Date: 2026-01-31

-- Add learning outcomes (JSON array)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS learning_outcomes TEXT;

-- Add skills gained (text - will be comma-separated or JSON)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS skills_gained TEXT;

-- Add teacher title/credentials
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS teacher_title TEXT;

-- Add teacher bio
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS teacher_bio TEXT;

-- Add teacher avatar URL
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS teacher_avatar TEXT;

-- Add estimated hours for course completion
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;

-- Add primary language
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- Add subtitle languages (JSON array)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS subtitle_languages JSONB DEFAULT '[]'::jsonb;

-- Add average rating (for future reviews feature)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0.0;

-- Add total reviews count
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add total quizzes count (will be calculated)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS total_quizzes INTEGER DEFAULT 0;

-- Add total assignments count (will be calculated)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS total_assignments INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN courses.learning_outcomes IS 'JSON array or newline-separated list of what students will learn';
COMMENT ON COLUMN courses.skills_gained IS 'Comma-separated list or JSON array of skills students will gain';
COMMENT ON COLUMN courses.teacher_title IS 'Instructor credentials and title (e.g., Ph.D., Professor)';
COMMENT ON COLUMN courses.teacher_bio IS 'Instructor biography for course overview page';
COMMENT ON COLUMN courses.estimated_hours IS 'Estimated total hours to complete the course';
COMMENT ON COLUMN courses.language IS 'Primary language of instruction';
COMMENT ON COLUMN courses.average_rating IS 'Average student rating (0.00 to 5.00)';
COMMENT ON COLUMN courses.total_reviews IS 'Total number of student reviews';
