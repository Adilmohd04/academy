-- =====================================================
-- QUIZ & ASSIGNMENT GRADING SYSTEM
-- Complete implementation with scheduled releases,
-- auto-grading, manual grading, and final grade calculation
-- =====================================================

-- =====================================================
-- 1. QUIZ TABLES
-- =====================================================

-- Quiz metadata (extends course_lessons where content_type='quiz')
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  time_limit_minutes INTEGER, -- NULL means no time limit
  passing_score INTEGER DEFAULT 70, -- Percentage
  max_attempts INTEGER DEFAULT 1, -- 0 or NULL means unlimited
  show_correct_answers BOOLEAN DEFAULT FALSE, -- Show after submission
  show_answers_after_deadline BOOLEAN DEFAULT TRUE,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  release_date TIMESTAMP WITH TIME ZONE, -- NULL means available immediately
  deadline TIMESTAMP WITH TIME ZONE, -- NULL means no deadline
  weight_percentage DECIMAL(5,2) DEFAULT 10.00, -- Weight in final grade
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT, -- Shown after answering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz question options (for multiple choice and true/false)
CREATE TABLE IF NOT EXISTS quiz_question_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quiz attempts/submissions
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_taken_minutes INTEGER,
  score DECIMAL(5,2), -- Percentage
  points_earned INTEGER,
  total_points INTEGER,
  is_passed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(quiz_id, student_id, attempt_number)
);

-- Student answers for quiz attempts
CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES quiz_question_options(id) ON DELETE SET NULL, -- For multiple choice
  answer_text TEXT, -- For short answer
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. ASSIGNMENT TABLES
-- =====================================================

-- Assignment metadata (extends course_lessons where content_type='assignment')
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  description TEXT,
  instructions TEXT,
  max_points INTEGER NOT NULL DEFAULT 100,
  release_date TIMESTAMP WITH TIME ZONE, -- NULL means available immediately
  due_date TIMESTAMP WITH TIME ZONE,
  late_submission_allowed BOOLEAN DEFAULT TRUE,
  late_penalty_percentage DECIMAL(5,2) DEFAULT 0, -- Per day late
  weight_percentage DECIMAL(5,2) DEFAULT 20.00, -- Weight in final grade
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_text TEXT,
  submission_url TEXT, -- Link to uploaded file or external resource
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_late BOOLEAN DEFAULT FALSE,
  grade INTEGER, -- Points earned out of max_points
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMP WITH TIME ZONE,
  feedback TEXT,
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- =====================================================
-- 3. FINAL GRADE CALCULATION
-- =====================================================

-- Course grade configuration
CREATE TABLE IF NOT EXISTS course_grade_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  quiz_weight_percentage DECIMAL(5,2) DEFAULT 30.00,
  assignment_weight_percentage DECIMAL(5,2) DEFAULT 30.00,
  final_exam_weight_percentage DECIMAL(5,2) DEFAULT 40.00,
  passing_grade DECIMAL(5,2) DEFAULT 60.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id)
);

-- Student final grades (calculated and stored)
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_average DECIMAL(5,2) DEFAULT 0,
  assignment_average DECIMAL(5,2) DEFAULT 0,
  final_exam_score DECIMAL(5,2) DEFAULT 0,
  final_grade DECIMAL(5,2) DEFAULT 0,
  letter_grade VARCHAR(2),
  is_passed BOOLEAN DEFAULT FALSE,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, student_id)
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON quiz_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student ON quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);

CREATE INDEX IF NOT EXISTS idx_assignments_lesson_id ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_published ON assignments(is_published);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_student ON assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);

CREATE INDEX IF NOT EXISTS idx_student_grades_course_student ON student_grades(course_id, student_id);

-- =====================================================
-- 5. FUNCTIONS FOR AUTO-CALCULATION
-- =====================================================

-- Function to calculate quiz score
CREATE OR REPLACE FUNCTION calculate_quiz_score(attempt_uuid UUID)
RETURNS void AS $$
DECLARE
  total_points INTEGER;
  earned_points INTEGER;
  score_percentage DECIMAL(5,2);
  v_quiz_id UUID;
  v_passing_score INTEGER;
BEGIN
  -- Get quiz_id and passing score
  SELECT quiz_id INTO v_quiz_id FROM quiz_attempts WHERE id = attempt_uuid;
  SELECT passing_score INTO v_passing_score FROM quizzes WHERE id = v_quiz_id;
  
  -- Calculate total and earned points
  SELECT 
    SUM(qq.points),
    SUM(qa.points_earned)
  INTO total_points, earned_points
  FROM quiz_answers qa
  JOIN quiz_questions qq ON qa.question_id = qq.id
  WHERE qa.attempt_id = attempt_uuid;
  
  -- Calculate percentage
  IF total_points > 0 THEN
    score_percentage := (earned_points::DECIMAL / total_points::DECIMAL) * 100;
  ELSE
    score_percentage := 0;
  END IF;
  
  -- Update attempt
  UPDATE quiz_attempts SET
    score = score_percentage,
    points_earned = earned_points,
    total_points = total_points,
    is_passed = (score_percentage >= v_passing_score)
  WHERE id = attempt_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate student final grade
CREATE OR REPLACE FUNCTION recalculate_student_grade(p_course_id UUID, p_student_id UUID)
RETURNS void AS $$
DECLARE
  v_quiz_avg DECIMAL(5,2);
  v_assignment_avg DECIMAL(5,2);
  v_final_exam DECIMAL(5,2);
  v_quiz_weight DECIMAL(5,2);
  v_assignment_weight DECIMAL(5,2);
  v_exam_weight DECIMAL(5,2);
  v_final_grade DECIMAL(5,2);
  v_letter_grade VARCHAR(2);
  v_passing_grade DECIMAL(5,2);
BEGIN
  -- Get grade configuration
  SELECT 
    quiz_weight_percentage,
    assignment_weight_percentage,
    final_exam_weight_percentage,
    passing_grade
  INTO v_quiz_weight, v_assignment_weight, v_exam_weight, v_passing_grade
  FROM course_grade_config
  WHERE course_id = p_course_id;
  
  -- If no config, use defaults
  IF v_quiz_weight IS NULL THEN
    v_quiz_weight := 30;
    v_assignment_weight := 30;
    v_exam_weight := 40;
    v_passing_grade := 60;
  END IF;
  
  -- Calculate quiz average (best attempt for each quiz)
  SELECT COALESCE(AVG(best_scores.score), 0)
  INTO v_quiz_avg
  FROM (
    SELECT DISTINCT ON (qa.quiz_id) qa.score
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    JOIN course_lessons cl ON q.lesson_id = cl.id
    WHERE cl.course_id = p_course_id 
      AND qa.student_id = p_student_id
      AND qa.submitted_at IS NOT NULL
    ORDER BY qa.quiz_id, qa.score DESC
  ) best_scores;
  
  -- Calculate assignment average
  SELECT COALESCE(AVG((asub.grade::DECIMAL / a.max_points::DECIMAL) * 100), 0)
  INTO v_assignment_avg
  FROM assignment_submissions asub
  JOIN assignments a ON asub.assignment_id = a.id
  JOIN course_lessons cl ON a.lesson_id = cl.id
  WHERE cl.course_id = p_course_id
    AND asub.student_id = p_student_id
    AND asub.grade IS NOT NULL;
  
  -- TODO: Get final exam score (implement later)
  v_final_exam := 0;
  
  -- Calculate weighted final grade
  v_final_grade := (v_quiz_avg * v_quiz_weight / 100) +
                   (v_assignment_avg * v_assignment_weight / 100) +
                   (v_final_exam * v_exam_weight / 100);
  
  -- Determine letter grade
  IF v_final_grade >= 90 THEN v_letter_grade := 'A';
  ELSIF v_final_grade >= 80 THEN v_letter_grade := 'B';
  ELSIF v_final_grade >= 70 THEN v_letter_grade := 'C';
  ELSIF v_final_grade >= 60 THEN v_letter_grade := 'D';
  ELSE v_letter_grade := 'F';
  END IF;
  
  -- Insert or update student grade
  INSERT INTO student_grades (
    course_id, student_id, quiz_average, assignment_average,
    final_exam_score, final_grade, letter_grade, is_passed, calculated_at
  ) VALUES (
    p_course_id, p_student_id, v_quiz_avg, v_assignment_avg,
    v_final_exam, v_final_grade, v_letter_grade,
    (v_final_grade >= v_passing_grade), CURRENT_TIMESTAMP
  )
  ON CONFLICT (course_id, student_id) DO UPDATE SET
    quiz_average = v_quiz_avg,
    assignment_average = v_assignment_avg,
    final_exam_score = v_final_exam,
    final_grade = v_final_grade,
    letter_grade = v_letter_grade,
    is_passed = (v_final_grade >= v_passing_grade),
    calculated_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Auto-calculate quiz score when attempt is submitted
CREATE OR REPLACE FUNCTION trigger_calculate_quiz_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    PERFORM calculate_quiz_score(NEW.id);
    -- Recalculate student grade
    PERFORM recalculate_student_grade(
      (SELECT cl.course_id FROM quizzes q 
       JOIN course_lessons cl ON q.lesson_id = cl.id 
       WHERE q.id = NEW.quiz_id),
      NEW.student_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_attempt_submitted
AFTER UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_quiz_score();

-- Auto-recalculate grade when assignment is graded
CREATE OR REPLACE FUNCTION trigger_recalculate_on_assignment_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.grade IS NOT NULL AND (OLD.grade IS NULL OR NEW.grade != OLD.grade) THEN
    PERFORM recalculate_student_grade(
      (SELECT cl.course_id FROM assignments a 
       JOIN course_lessons cl ON a.lesson_id = cl.id 
       WHERE a.id = NEW.assignment_id),
      NEW.student_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assignment_graded
AFTER UPDATE ON assignment_submissions
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_on_assignment_grade();

-- =====================================================
-- 7. RLS POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_grade_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;

-- Policies will be added based on your authentication system
-- For now, allowing service role access
