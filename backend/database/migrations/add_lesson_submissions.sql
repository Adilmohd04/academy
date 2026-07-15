-- Add quiz_submissions and assignment_submissions tables

-- Drop existing tables if they exist
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;

CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score DECIMAL(5,2),
  total_points DECIMAL(5,2),
  percentage DECIMAL(5,2),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES profiles(id),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_type VARCHAR(50) NOT NULL DEFAULT 'file',
  file_url TEXT,
  link_url TEXT,
  text_content TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  grade DECIMAL(5,2),
  total_points DECIMAL(5,2) DEFAULT 100,
  feedback TEXT,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_quiz_submissions_lesson_student ON quiz_submissions(lesson_id, student_id);
CREATE INDEX idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE INDEX idx_assignment_submissions_lesson_student ON assignment_submissions(lesson_id, student_id);
CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_assignment_submissions_status ON assignment_submissions(status);

-- Add comments
COMMENT ON TABLE quiz_submissions IS 'Stores student quiz submissions for lessons';
COMMENT ON TABLE assignment_submissions IS 'Stores student assignment submissions for lessons';
