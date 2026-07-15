-- Migration: Create Quiz and Assignment Base Tables
-- Description: Create missing base tables for quizzes and assignments
-- Date: 2024

-- =====================================================
-- PART 1: CREATE ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_id UUID REFERENCES course_weeks(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 100 CHECK (points > 0),
  due_date TIMESTAMP WITH TIME ZONE,
  allow_late_submission BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 1,
  submission_types TEXT[] DEFAULT ARRAY['file'], -- 'file', 'text', 'link'
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 2: CREATE ASSIGNMENT SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT,
  file_type VARCHAR(100),
  link_url TEXT,
  text_content TEXT,
  grade INTEGER CHECK (grade >= 0),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'graded', 'late', 'missing'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(assignment_id, student_id, attempt_number)
);

-- =====================================================
-- PART 3: CREATE FINAL EXAMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS final_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  exam_type VARCHAR(50) NOT NULL CHECK (exam_type IN ('quiz', 'interview', 'document', 'project')),
  points INTEGER DEFAULT 100 CHECK (points > 0),
  due_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  instructions TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 4: CREATE FINAL EXAM SUBMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS final_exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_exam_id UUID NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url TEXT,
  submission_text TEXT,
  grade INTEGER CHECK (grade >= 0),
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'graded', 'late'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(final_exam_id, student_id)
);

-- =====================================================
-- PART 5: CREATE FINAL EXAM INTERVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS final_exam_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  final_exam_id UUID NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 30,
  meeting_link TEXT,
  meeting_platform VARCHAR(50) DEFAULT 'google_meet',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'rescheduled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(final_exam_id, student_id)
);

-- =====================================================
-- PART 6: INDEXES FOR PERFORMANCE
-- =====================================================

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_week_id ON assignments(week_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Assignment submissions indexes
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded ON assignment_submissions(graded_at) WHERE graded_at IS NOT NULL;

-- Final exams indexes
CREATE INDEX IF NOT EXISTS idx_final_exams_course_id ON final_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_final_exams_is_published ON final_exams(is_published);

-- Final exam submissions indexes
CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_exam_id ON final_exam_submissions(final_exam_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_student_id ON final_exam_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_submissions_status ON final_exam_submissions(status);

-- Final exam interviews indexes
CREATE INDEX IF NOT EXISTS idx_final_exam_interviews_exam_id ON final_exam_interviews(final_exam_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_interviews_student_id ON final_exam_interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_interviews_status ON final_exam_interviews(status);

-- =====================================================
-- PART 7: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE assignments IS 'Course assignments that students need to complete';
COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments';
COMMENT ON TABLE final_exams IS 'Final exams for courses (various types)';
COMMENT ON TABLE final_exam_submissions IS 'Student submissions for final exams';
COMMENT ON TABLE final_exam_interviews IS 'Interview scheduling for final exams';

COMMENT ON COLUMN assignments.submission_types IS 'Array of allowed submission types: file, text, link';
COMMENT ON COLUMN assignment_submissions.status IS 'Submission status: submitted, graded, late, missing';
COMMENT ON COLUMN assignment_submissions.attempt_number IS 'Attempt number for this assignment (for multiple attempts)';
COMMENT ON COLUMN final_exams.exam_type IS 'Type of final exam: quiz, interview, document, project';
COMMENT ON COLUMN final_exam_interviews.status IS 'Interview status: scheduled, completed, cancelled, rescheduled';
