-- Final Exam System Migration
-- Description: Add final exam tables and relationships
-- Date: 2024

-- =====================================================
-- PART 1: FINAL EXAMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS final_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  exam_type VARCHAR(50) NOT NULL DEFAULT 'quiz', -- 'quiz', 'interview', 'document', 'project'
  points INTEGER NOT NULL DEFAULT 100 CHECK (points > 0),
  due_date TIMESTAMP WITH TIME ZONE,
  instructions TEXT,
  resources TEXT, -- JSON array of resource URLs
  duration_minutes INTEGER, -- For timed exams
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 2: FINAL EXAM SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS final_exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_exam_id UUID NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_type VARCHAR(50), -- 'file', 'link', 'text', 'quiz_attempt'
  file_url TEXT,
  file_type VARCHAR(100),
  link_url TEXT,
  text_content TEXT,
  quiz_attempt_id UUID, -- Reference to quiz_attempts if exam_type is 'quiz'
  grade INTEGER,
  max_grade INTEGER,
  feedback TEXT,
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'graded', 'needs_revision'
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES profiles(id),
  UNIQUE(final_exam_id, student_id)
);

-- =====================================================
-- PART 3: INTERVIEW SCHEDULING (For interview-type exams)
-- =====================================================

CREATE TABLE IF NOT EXISTS final_exam_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_exam_id UUID NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_link TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(final_exam_id, student_id)
);

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_final_exams_course_id ON final_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_final_exams_is_published ON final_exams(is_published);
CREATE INDEX IF NOT EXISTS idx_final_exams_due_date ON final_exams(due_date);
CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_exam_id ON final_exam_submissions(final_exam_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_student_id ON final_exam_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_status ON final_exam_submissions(status);
CREATE INDEX IF NOT EXISTS idx_final_exam_interviews_exam_id ON final_exam_interviews(final_exam_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_interviews_student_id ON final_exam_interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_interviews_scheduled_date ON final_exam_interviews(scheduled_date);

-- =====================================================
-- PART 5: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE final_exams IS 'Final exams for courses (quiz, interview, document submission, or project)';
COMMENT ON COLUMN final_exams.exam_type IS 'Type of final exam: quiz (online test), interview (scheduled meeting), document (file submission), project (comprehensive submission)';
COMMENT ON COLUMN final_exams.points IS 'Maximum points for this final exam';
COMMENT ON COLUMN final_exams.resources IS 'JSON array of resource URLs or materials for the exam';

COMMENT ON TABLE final_exam_submissions IS 'Student submissions for final exams';
COMMENT ON COLUMN final_exam_submissions.submission_type IS 'Type of submission: file, link, text, or quiz_attempt';
COMMENT ON COLUMN final_exam_submissions.quiz_attempt_id IS 'Links to quiz_attempts table if exam_type is quiz';
COMMENT ON COLUMN final_exam_submissions.status IS 'Submission status: submitted, graded, needs_revision';

COMMENT ON TABLE final_exam_interviews IS 'Scheduled interviews for interview-type final exams';
COMMENT ON COLUMN final_exam_interviews.status IS 'Interview status: scheduled, completed, cancelled, rescheduled';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check final_exams table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'final_exams';

-- Check final_exam_submissions table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'final_exam_submissions';

-- Check final_exam_interviews table structure
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'final_exam_interviews';
