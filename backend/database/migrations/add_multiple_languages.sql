-- Migration: Update course language to support multiple languages
-- This allows teachers to select multiple languages for their courses

-- Add new column for multiple languages (array type)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_languages TEXT[];

-- Migrate existing data from language column to course_languages array
UPDATE courses 
SET course_languages = ARRAY[language] 
WHERE language IS NOT NULL AND course_languages IS NULL;

-- For backwards compatibility, we'll keep the language column for now
-- But add a generated column that shows primary language
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_language TEXT GENERATED ALWAYS AS (course_languages[1]) STORED;

-- Add comment
COMMENT ON COLUMN courses.course_languages IS 'Array of languages the course is taught in (e.g., {English, Arabic})';
COMMENT ON COLUMN courses.course_language IS 'Primary course language (first element of course_languages array)';
