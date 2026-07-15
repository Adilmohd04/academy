-- Student Tracking Tables Migration
-- This adds comprehensive student performance tracking

-- Quiz Submissions Table
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,  -- clerk_user_id
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Quiz data
  quiz_questions JSONB NOT NULL,  -- The questions that were answered
  student_answers JSONB NOT NULL,  -- Student's submitted answers
  
  -- Scoring
  score DECIMAL(5,2) NOT NULL,  -- Percentage score (0-100)
  total_marks INTEGER NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  
  -- Metadata
  attempt_number INTEGER DEFAULT 1,
  time_taken_minutes INTEGER,  -- Time taken to complete
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100),
  CONSTRAINT valid_marks CHECK (marks_obtained >= 0 AND marks_obtained <= total_marks)
);

-- Assignment Submissions Table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,  -- clerk_user_id
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Submission data
  submission_type TEXT CHECK (submission_type IN ('file', 'link', 'text')),
  submission_url TEXT,  -- Google Drive link or file URL
  submission_text TEXT,  -- For text submissions
  
  -- Grading
  total_marks INTEGER NOT NULL,
  marks_obtained DECIMAL(5,2),
  grade_percentage DECIMAL(5,2),
  
  -- Teacher feedback
  teacher_feedback TEXT,
  graded_by TEXT,  -- clerk_user_id of teacher
  graded_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'resubmission_requested')),
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_assignment_marks CHECK (marks_obtained IS NULL OR (marks_obtained >= 0 AND marks_obtained <= total_marks))
);

-- Student Progress Tracking Table
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,  -- clerk_user_id
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  
  -- Progress tracking
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  
  -- Time tracking
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one progress record per student per lesson
  UNIQUE(enrollment_id, lesson_id)
);

-- Lesson Engagement Tracking
CREATE TABLE IF NOT EXISTS lesson_engagement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Engagement metrics
  views_count INTEGER DEFAULT 1,
  total_watch_time_seconds INTEGER DEFAULT 0,  -- For video lessons
  last_position_seconds INTEGER DEFAULT 0,  -- Video progress
  
  -- Interaction tracking
  notes TEXT,  -- Student's personal notes on the lesson
  bookmarked BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  first_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lesson ON quiz_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_enrollment ON quiz_submissions(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_lesson ON assignment_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_enrollment ON assignment_submissions(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_enrollment ON student_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_status ON student_progress(status);

CREATE INDEX IF NOT EXISTS idx_lesson_engagement_student ON lesson_engagement(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_engagement_course ON lesson_engagement(course_id);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_submissions_timestamp
  BEFORE UPDATE ON quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

CREATE TRIGGER update_assignment_submissions_timestamp
  BEFORE UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

CREATE TRIGGER update_student_progress_timestamp
  BEFORE UPDATE ON student_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

CREATE TRIGGER update_lesson_engagement_timestamp
  BEFORE UPDATE ON lesson_engagement
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_updated_at();

COMMENT ON TABLE quiz_submissions IS 'Stores student quiz attempts and scores';
COMMENT ON TABLE assignment_submissions IS 'Stores student assignment submissions and grades';
COMMENT ON TABLE student_progress IS 'Tracks student progress through course lessons';
COMMENT ON TABLE lesson_engagement IS 'Tracks student engagement with individual lessons';
