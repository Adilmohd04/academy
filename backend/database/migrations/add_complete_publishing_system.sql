-- Add publishing and scheduling columns to course_weeks and course_lessons tables

-- 1. Add columns to course_lessons (quizzes and assignments)
ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS quiz_questions JSONB,
ADD COLUMN IF NOT EXISTS assignment_details JSONB,
ADD COLUMN IF NOT EXISTS video_urls JSONB,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS release_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER,
ADD COLUMN IF NOT EXISTS show_answers_after_deadline BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN DEFAULT FALSE;

-- 2. Add columns to course_weeks
ALTER TABLE course_weeks
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS release_date TIMESTAMP WITH TIME ZONE;

-- 3. Add comments
COMMENT ON COLUMN course_lessons.quiz_questions IS 'JSONB storage for quiz questions';
COMMENT ON COLUMN course_lessons.assignment_details IS 'JSONB storage for assignment details';
COMMENT ON COLUMN course_lessons.video_urls IS 'JSONB array of {language, url} for multi-language videos';
COMMENT ON COLUMN course_lessons.is_published IS 'Whether quiz/assignment is published and visible to students';
COMMENT ON COLUMN course_lessons.release_date IS 'When content becomes available (NULL = immediately when published)';
COMMENT ON COLUMN course_lessons.deadline IS 'Last date/time students can submit (NULL = no deadline)';
COMMENT ON COLUMN course_lessons.time_limit_minutes IS 'Time limit for quiz in minutes (NULL = no limit)';
COMMENT ON COLUMN course_lessons.max_attempts IS 'Maximum attempts allowed (NULL = unlimited)';
COMMENT ON COLUMN course_lessons.show_answers_after_deadline IS 'Show correct answers after deadline passes';
COMMENT ON COLUMN course_lessons.show_correct_answers IS 'Show correct answers immediately after submission';

COMMENT ON COLUMN course_weeks.is_published IS 'Whether week is published and visible to students';
COMMENT ON COLUMN course_weeks.release_date IS 'When week becomes available (NULL = immediately when is_published=true)';

-- 4. Create index for auto-publishing query optimization
CREATE INDEX IF NOT EXISTS idx_lessons_autopublish 
ON course_lessons(is_published, release_date) 
WHERE is_published = false AND release_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weeks_autopublish 
ON course_weeks(is_published, release_date) 
WHERE is_published = false AND release_date IS NOT NULL;
