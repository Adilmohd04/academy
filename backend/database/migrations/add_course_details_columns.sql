-- Add missing course detail columns for enhanced student interface
-- These columns support the comprehensive course introduction and teacher information

-- Add columns to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS skills_gained TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_bio TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_title TEXT;

-- Add sample data to existing courses for testing
UPDATE courses 
SET 
  learning_outcomes = ARRAY[
    'Understand core Islamic beliefs and principles',
    'Learn proper worship methods and etiquette',
    'Develop good character based on Islamic teachings',
    'Apply Islamic knowledge to daily life'
  ],
  skills_gained = ARRAY[
    'Quran recitation with proper tajweed',
    'Prayer (Salah) mastery',
    'Islamic history knowledge',
    'Arabic language basics'
  ],
  estimated_hours = COALESCE(estimated_hours, 40),
  language = COALESCE(language, 'English'),
  teacher_bio = COALESCE(teacher_bio, 'Experienced Islamic scholar with years of teaching experience in Islamic studies, Quran, and Arabic language.'),
  teacher_title = COALESCE(teacher_title, 'Islamic Studies Professor')
WHERE learning_outcomes IS NULL;

-- Verify the changes
SELECT 
  id,
  title,
  array_length(learning_outcomes, 1) as outcomes_count,
  array_length(skills_gained, 1) as skills_count,
  estimated_hours,
  language,
  CASE WHEN teacher_bio IS NOT NULL THEN 'Yes' ELSE 'No' END as has_bio,
  CASE WHEN teacher_title IS NOT NULL THEN 'Yes' ELSE 'No' END as has_title
FROM courses
LIMIT 5;
