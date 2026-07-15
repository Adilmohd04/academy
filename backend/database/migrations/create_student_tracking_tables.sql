-- Student Tracking System Migration
-- Comprehensive tracking for quiz marks, assignments, activities, and progress

-- ============================================
-- 1. QUIZ SUBMISSIONS & MARKS
-- ============================================

-- Drop existing quiz_submissions if exists and recreate with enhanced tracking
DROP TABLE IF EXISTS quiz_submissions CASCADE;

CREATE TABLE quiz_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Submission details
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken_seconds INTEGER,
  
  -- Grading
  score DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_score DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS ((score / NULLIF(max_score, 0)) * 100) STORED,
  passed BOOLEAN GENERATED ALWAYS AS ((score / NULLIF(max_score, 0)) >= 0.6) STORED,
  
  -- Auto-grading
  auto_graded BOOLEAN DEFAULT true,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  graded_by TEXT,
  
  -- Metadata
  attempt_number INTEGER DEFAULT 1,
  is_final_attempt BOOLEAN DEFAULT false,
  feedback TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, quiz_id, attempt_number)
);

CREATE INDEX idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE INDEX idx_quiz_submissions_quiz ON quiz_submissions(quiz_id);
CREATE INDEX idx_quiz_submissions_course ON quiz_submissions(course_id);
CREATE INDEX idx_quiz_submissions_submitted_at ON quiz_submissions(submitted_at DESC);

-- ============================================
-- 2. ASSIGNMENT SUBMISSIONS & GRADES
-- ============================================

DROP TABLE IF EXISTS assignment_submissions CASCADE;

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Submission details
  submission_text TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Grading
  grade DECIMAL(5,2),
  max_grade DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) GENERATED ALWAYS AS ((grade / NULLIF(max_grade, 0)) * 100) STORED,
  passed BOOLEAN GENERATED ALWAYS AS ((grade / NULLIF(max_grade, 0)) >= 0.6) STORED,
  
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by TEXT REFERENCES profiles(clerk_user_id),
  feedback TEXT,
  
  -- Status
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'late')),
  is_late BOOLEAN DEFAULT false,
  
  -- Resubmission
  attempt_number INTEGER DEFAULT 1,
  is_final_submission BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, assignment_id, attempt_number)
);

CREATE INDEX idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_course ON assignment_submissions(course_id);
CREATE INDEX idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at DESC);

-- ============================================
-- 3. STUDENT ACTIVITY TRACKING
-- ============================================

DROP TABLE IF EXISTS student_activities CASCADE;

CREATE TABLE student_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'lesson_viewed', 'lesson_completed', 
    'quiz_started', 'quiz_completed',
    'assignment_viewed', 'assignment_submitted',
    'discussion_post', 'discussion_comment',
    'live_class_attended', 'resource_downloaded',
    'video_watched', 'course_enrolled'
  )),
  
  -- Related entities (nullable)
  lesson_id UUID,
  quiz_id UUID,
  assignment_id UUID,
  live_session_id UUID,
  
  -- Metadata
  activity_data JSONB DEFAULT '{}',
  duration_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_student_activities_student ON student_activities(student_id);
CREATE INDEX idx_student_activities_course ON student_activities(course_id);
CREATE INDEX idx_student_activities_type ON student_activities(activity_type);
CREATE INDEX idx_student_activities_created_at ON student_activities(created_at DESC);

-- ============================================
-- 4. STUDENT PROGRESS SUMMARY
-- ============================================

DROP TABLE IF EXISTS student_progress_summary CASCADE;

CREATE TABLE student_progress_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Progress metrics
  lessons_completed INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  lessons_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    (lessons_completed::DECIMAL / NULLIF(total_lessons, 0)) * 100
  ) STORED,
  
  quizzes_completed INTEGER DEFAULT 0,
  total_quizzes INTEGER DEFAULT 0,
  quizzes_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    (quizzes_completed::DECIMAL / NULLIF(total_quizzes, 0)) * 100
  ) STORED,
  
  assignments_completed INTEGER DEFAULT 0,
  total_assignments INTEGER DEFAULT 0,
  assignments_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    (assignments_completed::DECIMAL / NULLIF(total_assignments, 0)) * 100
  ) STORED,
  
  -- Grades
  average_quiz_score DECIMAL(5,2) DEFAULT 0,
  average_assignment_grade DECIMAL(5,2) DEFAULT 0,
  overall_grade DECIMAL(5,2) DEFAULT 0,
  
  -- Time tracking
  total_time_spent_seconds INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE,
  
  -- Live classes
  live_classes_attended INTEGER DEFAULT 0,
  total_live_classes INTEGER DEFAULT 0,
  attendance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    (live_classes_attended::DECIMAL / NULLIF(total_live_classes, 0)) * 100
  ) STORED,
  
  -- Completion
  overall_progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Certificate
  certificate_eligible BOOLEAN DEFAULT false,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_issued_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(student_id, course_id)
);

CREATE INDEX idx_progress_summary_student ON student_progress_summary(student_id);
CREATE INDEX idx_progress_summary_course ON student_progress_summary(course_id);
CREATE INDEX idx_progress_summary_completed ON student_progress_summary(is_completed);
CREATE INDEX idx_progress_summary_certificate ON student_progress_summary(certificate_eligible);

-- ============================================
-- 5. TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Update student_progress_summary when quiz is submitted
CREATE OR REPLACE FUNCTION update_progress_on_quiz_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO student_progress_summary (student_id, course_id)
  VALUES (NEW.student_id, NEW.course_id)
  ON CONFLICT (student_id, course_id) DO NOTHING;
  
  UPDATE student_progress_summary
  SET 
    quizzes_completed = (
      SELECT COUNT(DISTINCT quiz_id) 
      FROM quiz_submissions 
      WHERE student_id = NEW.student_id 
        AND course_id = NEW.course_id
        AND passed = true
    ),
    average_quiz_score = (
      SELECT AVG(score) 
      FROM quiz_submissions 
      WHERE student_id = NEW.student_id 
        AND course_id = NEW.course_id
        AND is_final_attempt = true
    ),
    updated_at = NOW()
  WHERE student_id = NEW.student_id 
    AND course_id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_progress_quiz ON quiz_submissions;
CREATE TRIGGER trigger_update_progress_quiz
  AFTER INSERT OR UPDATE ON quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_on_quiz_submission();

-- Update student_progress_summary when assignment is graded
CREATE OR REPLACE FUNCTION update_progress_on_assignment_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO student_progress_summary (student_id, course_id)
  VALUES (NEW.student_id, NEW.course_id)
  ON CONFLICT (student_id, course_id) DO NOTHING;
  
  UPDATE student_progress_summary
  SET 
    assignments_completed = (
      SELECT COUNT(DISTINCT assignment_id) 
      FROM assignment_submissions 
      WHERE student_id = NEW.student_id 
        AND course_id = NEW.course_id
        AND status = 'graded'
        AND passed = true
    ),
    average_assignment_grade = (
      SELECT AVG(grade) 
      FROM assignment_submissions 
      WHERE student_id = NEW.student_id 
        AND course_id = NEW.course_id
        AND status = 'graded'
        AND is_final_submission = true
    ),
    updated_at = NOW()
  WHERE student_id = NEW.student_id 
    AND course_id = NEW.course_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_progress_assignment ON assignment_submissions;
CREATE TRIGGER trigger_update_progress_assignment
  AFTER INSERT OR UPDATE ON assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_on_assignment_submission();

-- Update overall grade and certificate eligibility
CREATE OR REPLACE FUNCTION calculate_overall_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate overall grade (60% quizzes, 40% assignments)
  NEW.overall_grade := (COALESCE(NEW.average_quiz_score, 0) * 0.6) + 
                       (COALESCE(NEW.average_assignment_grade, 0) * 0.4);
  
  -- Calculate overall progress
  NEW.overall_progress_percentage := (
    COALESCE(NEW.lessons_percentage, 0) * 0.4 +
    COALESCE(NEW.quizzes_percentage, 0) * 0.3 +
    COALESCE(NEW.assignments_percentage, 0) * 0.3
  );
  
  -- Check certificate eligibility
  NEW.certificate_eligible := (
    NEW.overall_grade >= 60 AND
    NEW.overall_progress_percentage >= 80 AND
    COALESCE(NEW.attendance_percentage, 100) >= 70
  );
  
  -- Auto-complete if 100% progress
  IF NEW.overall_progress_percentage >= 100 AND NOT NEW.is_completed THEN
    NEW.is_completed := true;
    NEW.completed_at := NOW();
  END IF;
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_progress ON student_progress_summary;
CREATE TRIGGER trigger_calculate_progress
  BEFORE UPDATE ON student_progress_summary
  FOR EACH ROW
  EXECUTE FUNCTION calculate_overall_progress();

-- ============================================
-- 6. HELPER VIEWS
-- ============================================

-- Student performance overview
CREATE OR REPLACE VIEW vw_student_performance AS
SELECT 
  sps.student_id,
  sps.course_id,
  p.full_name,
  p.email,
  c.title as course_title,
  sps.overall_progress_percentage,
  sps.overall_grade,
  sps.lessons_completed || '/' || sps.total_lessons as lessons_progress,
  sps.quizzes_completed || '/' || sps.total_quizzes as quizzes_progress,
  sps.assignments_completed || '/' || sps.total_assignments as assignments_progress,
  sps.attendance_percentage,
  sps.certificate_eligible,
  sps.is_completed,
  sps.last_accessed,
  sps.updated_at
FROM student_progress_summary sps
JOIN profiles p ON sps.student_id = p.clerk_user_id
JOIN courses c ON sps.course_id = c.id;

-- Recent student activities
CREATE OR REPLACE VIEW vw_recent_student_activities AS
SELECT 
  sa.id,
  sa.student_id,
  p.full_name,
  p.email,
  sa.course_id,
  c.title as course_title,
  sa.activity_type,
  sa.created_at
FROM student_activities sa
JOIN profiles p ON sa.student_id = p.clerk_user_id
JOIN courses c ON sa.course_id = c.id
ORDER BY sa.created_at DESC;

-- Quiz performance by student
CREATE OR REPLACE VIEW vw_quiz_performance AS
SELECT 
  qs.student_id,
  p.full_name,
  p.email,
  qs.course_id,
  c.title as course_title,
  qs.quiz_id,
  q.title as quiz_title,
  qs.score,
  qs.max_score,
  qs.percentage,
  qs.passed,
  qs.attempt_number,
  qs.submitted_at
FROM quiz_submissions qs
JOIN profiles p ON qs.student_id = p.clerk_user_id
JOIN courses c ON qs.course_id = c.id
JOIN quizzes q ON qs.quiz_id = q.id
ORDER BY qs.submitted_at DESC;

-- Assignment performance by student
CREATE OR REPLACE VIEW vw_assignment_performance AS
SELECT 
  asub.student_id,
  p.full_name,
  p.email,
  asub.course_id,
  c.title as course_title,
  asub.assignment_id,
  a.title as assignment_title,
  asub.grade,
  asub.max_grade,
  asub.percentage,
  asub.passed,
  asub.status,
  asub.is_late,
  asub.submitted_at,
  asub.graded_at
FROM assignment_submissions asub
JOIN profiles p ON asub.student_id = p.clerk_user_id
JOIN courses c ON asub.course_id = c.id
JOIN assignments a ON asub.assignment_id = a.id
ORDER BY asub.submitted_at DESC;

-- Grant permissions
GRANT SELECT ON vw_student_performance TO authenticated;
GRANT SELECT ON vw_recent_student_activities TO authenticated;
GRANT SELECT ON vw_quiz_performance TO authenticated;
GRANT SELECT ON vw_assignment_performance TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
