-- Migration: Quiz System Enhancements
-- Description: Remove passing_score, add multi-language support, add is_published flag
-- Date: 2024

-- =====================================================
-- PART 1: QUIZ TABLE UPDATES
-- =====================================================

-- Remove passing_score from quizzes table (now only at course level)
ALTER TABLE quizzes 
DROP COLUMN IF EXISTS passing_score;

-- Add is_published flag for draft/published state
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add week_id for associating quizzes with specific weeks
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES course_weeks(id) ON DELETE SET NULL;

-- Add updated_at timestamp
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- PART 2: QUIZ QUESTIONS MULTI-LANGUAGE SUPPORT
-- =====================================================

-- Add Arabic question field
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS question_ar TEXT;

-- Add Tamil question field
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS question_ta TEXT;

-- Add points column if it doesn't exist (for flexible points allocation)
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 1 CHECK (points > 0);

-- Add order column if it doesn't exist (for question ordering)
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- =====================================================
-- PART 3: ASSIGNMENT SUBMISSIONS UPDATES
-- =====================================================

-- Add graded_by to track who graded the submission
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id);

-- Ensure graded_at column exists
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

-- Add file_type for better file handling
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Add link_url for URL submissions
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Add text_content for text submissions
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS text_content TEXT;

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for faster quiz lookups by week
CREATE INDEX IF NOT EXISTS idx_quizzes_week_id ON quizzes(week_id);

-- Index for published quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON quizzes(is_published);

-- Index for assignment submissions by assignment
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id 
ON assignment_submissions(assignment_id);

-- Index for assignment submissions by student
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id 
ON assignment_submissions(student_id);

-- Index for graded submissions
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded 
ON assignment_submissions(graded_at) WHERE graded_at IS NOT NULL;

-- Index for quiz questions ordering
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order 
ON quiz_questions(quiz_id, "order");

-- =====================================================
-- PART 5: UPDATE EXISTING DATA
-- =====================================================

-- Set all existing quizzes to published (backward compatibility)
UPDATE quizzes 
SET is_published = true 
WHERE is_published IS NULL OR is_published = false;

-- Set default order for existing quiz questions
WITH ordered_questions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY quiz_id ORDER BY created_at) as row_num
  FROM quiz_questions
  WHERE "order" = 0 OR "order" IS NULL
)
UPDATE quiz_questions q
SET "order" = oq.row_num
FROM ordered_questions oq
WHERE q.id = oq.id;

-- =====================================================
-- PART 6: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN quizzes.is_published IS 'Flag to indicate if quiz is published (true) or draft (false)';
COMMENT ON COLUMN quizzes.week_id IS 'Optional association with a specific course week';
COMMENT ON COLUMN quiz_questions.question_ar IS 'Arabic translation of the question';
COMMENT ON COLUMN quiz_questions.question_ta IS 'Tamil translation of the question';
COMMENT ON COLUMN quiz_questions.points IS 'Points allocated to this question (default 1)';
COMMENT ON COLUMN quiz_questions."order" IS 'Display order of the question in the quiz';
COMMENT ON COLUMN assignment_submissions.graded_by IS 'Profile ID of teacher who graded the submission';
COMMENT ON COLUMN assignment_submissions.file_type IS 'MIME type of submitted file';
COMMENT ON COLUMN assignment_submissions.link_url IS 'URL if submission type is link';
COMMENT ON COLUMN assignment_submissions.text_content IS 'Text content if submission type is text';

-- =====================================================
-- VERIFICATION QUERIES (Run these after migration)
-- =====================================================

-- Check quiz table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'quizzes';

-- Check quiz_questions table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'quiz_questions';

-- Check assignment_submissions table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'assignment_submissions';

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('quizzes', 'quiz_questions', 'assignment_submissions');
