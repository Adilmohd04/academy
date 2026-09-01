-- Migration: Add multi-language video support
-- Created: January 12, 2026
-- Phase 2: Multi-Language Video Support

-- Add language-specific video URL columns to course_lessons
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS content_url_en TEXT,
ADD COLUMN IF NOT EXISTS content_url_ta TEXT,  -- Tamil
ADD COLUMN IF NOT EXISTS content_url_ar TEXT;  -- Arabic

-- Migrate existing content_url to English version
UPDATE course_lessons 
SET content_url_en = content_url 
WHERE content_url IS NOT NULL AND content_url_en IS NULL;

-- Add language preference to user profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

-- Create index for language preference lookups
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language 
ON profiles(preferred_language);

-- Add comments for documentation
COMMENT ON COLUMN course_lessons.content_url_en IS 'English video URL';
COMMENT ON COLUMN course_lessons.content_url_ta IS 'Tamil video URL';
COMMENT ON COLUMN course_lessons.content_url_ar IS 'Arabic video URL';
COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language (en, ta, ar)';

-- Create helper view for lessons with language availability
CREATE OR REPLACE VIEW lesson_language_availability AS
SELECT 
  id,
  title,
  CASE WHEN content_url_en IS NOT NULL THEN TRUE ELSE FALSE END as has_english,
  CASE WHEN content_url_ta IS NOT NULL THEN TRUE ELSE FALSE END as has_tamil,
  CASE WHEN content_url_ar IS NOT NULL THEN TRUE ELSE FALSE END as has_arabic,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN content_url_en IS NOT NULL THEN 'en' ELSE NULL END,
    CASE WHEN content_url_ta IS NOT NULL THEN 'ta' ELSE NULL END,
    CASE WHEN content_url_ar IS NOT NULL THEN 'ar' ELSE NULL END
  ], NULL) as available_languages
FROM course_lessons;

COMMENT ON VIEW lesson_language_availability IS 'Shows which languages are available for each lesson';
