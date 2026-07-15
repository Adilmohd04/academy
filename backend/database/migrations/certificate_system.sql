-- Certificate System Migration
-- Description: Add certificate tables and grading policy
-- Date: 2024

-- =====================================================
-- PART 1: ADD GRADING POLICY TO COURSES
-- =====================================================

-- Add grading policy columns to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS quiz_weight DECIMAL(5,2) DEFAULT 30.00 CHECK (quiz_weight >= 0 AND quiz_weight <= 100);

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS assignment_weight DECIMAL(5,2) DEFAULT 40.00 CHECK (assignment_weight >= 0 AND assignment_weight <= 100);

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS final_exam_weight DECIMAL(5,2) DEFAULT 30.00 CHECK (final_exam_weight >= 0 AND final_exam_weight <= 100);

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS passing_score DECIMAL(5,2) DEFAULT 70.00 CHECK (passing_score >= 0 AND passing_score <= 100);

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS enable_certificates BOOLEAN DEFAULT true;

-- =====================================================
-- PART 2: CERTIFICATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  certificate_url TEXT,
  final_score DECIMAL(5,2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  grade_breakdown JSONB, -- Store detailed breakdown: {quiz_avg, assignment_avg, final_exam_score}
  status VARCHAR(50) DEFAULT 'awarded', -- 'awarded', 'revoked', 'pending'
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  issued_by UUID REFERENCES profiles(id),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES profiles(id),
  revoke_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- =====================================================
-- PART 3: CERTIFICATE TEMPLATES (Optional)
-- =====================================================

CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_data JSONB NOT NULL, -- Store template configuration
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_student_id ON certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON certificates(issued_at);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificate_templates_course_id ON certificate_templates(course_id);

-- =====================================================
-- PART 5: FUNCTION TO GENERATE CERTIFICATE NUMBER
-- =====================================================

CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
  cert_number TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate format: CERT-YYYY-XXXXXX (e.g., CERT-2024-A1B2C3)
    cert_number := 'CERT-' || 
                   EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                   UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Check if this number already exists
    SELECT COUNT(*) INTO exists_check
    FROM certificates
    WHERE certificate_number = cert_number;
    
    -- If unique, return it
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN cert_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 6: FUNCTION TO CALCULATE STUDENT FINAL SCORE
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_student_final_score(
  p_course_id UUID,
  p_student_id UUID
)
RETURNS TABLE (
  final_score DECIMAL(5,2),
  quiz_average DECIMAL(5,2),
  assignment_average DECIMAL(5,2),
  final_exam_score DECIMAL(5,2),
  passed BOOLEAN
) AS $$
DECLARE
  v_quiz_weight DECIMAL(5,2);
  v_assignment_weight DECIMAL(5,2);
  v_final_exam_weight DECIMAL(5,2);
  v_passing_score DECIMAL(5,2);
  v_quiz_avg DECIMAL(5,2) := 0;
  v_assignment_avg DECIMAL(5,2) := 0;
  v_final_exam_score DECIMAL(5,2) := 0;
  v_final_score DECIMAL(5,2);
  v_passed BOOLEAN;
BEGIN
  -- Get course grading policy
  SELECT 
    quiz_weight,
    assignment_weight,
    final_exam_weight,
    passing_score
  INTO 
    v_quiz_weight,
    v_assignment_weight,
    v_final_exam_weight,
    v_passing_score
  FROM courses
  WHERE id = p_course_id;

  -- Calculate quiz average (best attempt per quiz)
  SELECT COALESCE(AVG(best_scores.percentage), 0) INTO v_quiz_avg
  FROM (
    SELECT 
      qa.quiz_id,
      MAX(qa.percentage) as percentage
    FROM quiz_attempts qa
    INNER JOIN quizzes q ON qa.quiz_id = q.id
    WHERE q.course_id = p_course_id
      AND qa.student_id = p_student_id
    GROUP BY qa.quiz_id
  ) best_scores;

  -- Calculate assignment average
  SELECT COALESCE(AVG((asub.grade::DECIMAL / a.points::DECIMAL) * 100), 0) INTO v_assignment_avg
  FROM assignment_submissions asub
  INNER JOIN assignments a ON asub.assignment_id = a.id
  WHERE a.course_id = p_course_id
    AND asub.student_id = p_student_id
    AND asub.grade IS NOT NULL;

  -- Get final exam score
  SELECT COALESCE((fes.grade::DECIMAL / fe.points::DECIMAL) * 100, 0) INTO v_final_exam_score
  FROM final_exam_submissions fes
  INNER JOIN final_exams fe ON fes.final_exam_id = fe.id
  WHERE fe.course_id = p_course_id
    AND fes.student_id = p_student_id
    AND fes.grade IS NOT NULL
  LIMIT 1;

  -- Calculate weighted final score
  v_final_score := (
    (v_quiz_avg * v_quiz_weight / 100) +
    (v_assignment_avg * v_assignment_weight / 100) +
    (v_final_exam_score * v_final_exam_weight / 100)
  );

  -- Determine if passed
  v_passed := v_final_score >= v_passing_score;

  -- Return results
  RETURN QUERY SELECT 
    ROUND(v_final_score, 2),
    ROUND(v_quiz_avg, 2),
    ROUND(v_assignment_avg, 2),
    ROUND(v_final_exam_score, 2),
    v_passed;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 7: COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE certificates IS 'Student certificates awarded upon course completion';
COMMENT ON COLUMN certificates.certificate_number IS 'Unique certificate number in format CERT-YYYY-XXXXXX';
COMMENT ON COLUMN certificates.final_score IS 'Weighted final score (0-100)';
COMMENT ON COLUMN certificates.grade_breakdown IS 'JSON containing quiz_avg, assignment_avg, final_exam_score';
COMMENT ON COLUMN certificates.status IS 'Certificate status: awarded, revoked, pending';

COMMENT ON TABLE certificate_templates IS 'Certificate template configurations for courses';

COMMENT ON COLUMN courses.quiz_weight IS 'Weight of quizzes in final grade (0-100%)';
COMMENT ON COLUMN courses.assignment_weight IS 'Weight of assignments in final grade (0-100%)';
COMMENT ON COLUMN courses.final_exam_weight IS 'Weight of final exam in final grade (0-100%)';
COMMENT ON COLUMN courses.passing_score IS 'Minimum score required to pass and earn certificate (0-100%)';
COMMENT ON COLUMN courses.enable_certificates IS 'Whether certificates are enabled for this course';

-- =====================================================
-- PART 8: DEFAULT GRADING POLICIES FOR EXISTING COURSES
-- =====================================================

-- Update existing courses with default grading policy
UPDATE courses 
SET 
  quiz_weight = 30.00,
  assignment_weight = 40.00,
  final_exam_weight = 30.00,
  passing_score = 70.00,
  enable_certificates = true
WHERE quiz_weight IS NULL;

-- =====================================================
-- PART 9: TRIGGER TO AUTO-AWARD CERTIFICATES
-- =====================================================

CREATE OR REPLACE FUNCTION auto_award_certificate()
RETURNS TRIGGER AS $$
DECLARE
  v_course_id UUID;
  v_final_score_data RECORD;
  v_cert_number TEXT;
  v_enable_certificates BOOLEAN;
BEGIN
  -- Get course_id based on what was updated
  IF TG_TABLE_NAME = 'quiz_attempts' THEN
    SELECT course_id INTO v_course_id FROM quizzes WHERE id = NEW.quiz_id;
  ELSIF TG_TABLE_NAME = 'assignment_submissions' THEN
    SELECT course_id INTO v_course_id FROM assignments WHERE id = NEW.assignment_id;
  ELSIF TG_TABLE_NAME = 'final_exam_submissions' THEN
    SELECT course_id INTO v_course_id FROM final_exams WHERE id = NEW.final_exam_id;
  END IF;

  -- Check if certificates are enabled for this course
  SELECT enable_certificates INTO v_enable_certificates FROM courses WHERE id = v_course_id;
  
  IF NOT v_enable_certificates THEN
    RETURN NEW;
  END IF;

  -- Calculate final score
  SELECT * INTO v_final_score_data 
  FROM calculate_student_final_score(v_course_id, NEW.student_id);

  -- If student passed and doesn't have a certificate yet, award one
  IF v_final_score_data.passed THEN
    -- Check if certificate already exists
    IF NOT EXISTS (
      SELECT 1 FROM certificates 
      WHERE course_id = v_course_id 
        AND student_id = NEW.student_id
    ) THEN
      -- Generate certificate number
      v_cert_number := generate_certificate_number();
      
      -- Award certificate
      INSERT INTO certificates (
        course_id,
        student_id,
        certificate_number,
        final_score,
        grade_breakdown,
        status
      ) VALUES (
        v_course_id,
        NEW.student_id,
        v_cert_number,
        v_final_score_data.final_score,
        jsonb_build_object(
          'quiz_average', v_final_score_data.quiz_average,
          'assignment_average', v_final_score_data.assignment_average,
          'final_exam_score', v_final_score_data.final_exam_score
        ),
        'awarded'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-awarding (optional - can be enabled later)
-- DROP TRIGGER IF EXISTS trigger_auto_award_on_quiz ON quiz_attempts;
-- CREATE TRIGGER trigger_auto_award_on_quiz
--   AFTER INSERT OR UPDATE ON quiz_attempts
--   FOR EACH ROW
--   EXECUTE FUNCTION auto_award_certificate();

-- DROP TRIGGER IF EXISTS trigger_auto_award_on_assignment ON assignment_submissions;
-- CREATE TRIGGER trigger_auto_award_on_assignment
--   AFTER INSERT OR UPDATE ON assignment_submissions
--   FOR EACH ROW
--   EXECUTE FUNCTION auto_award_certificate();

-- DROP TRIGGER IF EXISTS trigger_auto_award_on_final_exam ON final_exam_submissions;
-- CREATE TRIGGER trigger_auto_award_on_final_exam
--   AFTER INSERT OR UPDATE ON final_exam_submissions
--   FOR EACH ROW
--   EXECUTE FUNCTION auto_award_certificate();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check courses grading policy columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'courses' 
-- AND column_name IN ('quiz_weight', 'assignment_weight', 'final_exam_weight', 'passing_score', 'enable_certificates');

-- Check certificates table
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'certificates';

-- Test calculate_student_final_score function
-- SELECT * FROM calculate_student_final_score('course-uuid', 'student-uuid');

-- Test certificate number generation
-- SELECT generate_certificate_number();
