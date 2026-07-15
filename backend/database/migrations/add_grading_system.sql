-- Add grading policy columns to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS quiz_weight INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS assignment_weight INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS final_exam_weight INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS min_score_for_certificate INTEGER DEFAULT 60;

-- Add scoring columns to enrollments table
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS internal_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS final_exam_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS total_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS certificate_eligible BOOLEAN DEFAULT false;

-- Add grading columns to quiz_attempts
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS teacher_comment TEXT,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP;

-- Create index for faster grading queries (assignment_submissions already has graded_at)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_quiz ON quiz_attempts(student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_lesson ON assignment_submissions(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_student ON enrollments(course_id, student_id);

COMMENT ON COLUMN courses.quiz_weight IS 'Weight of quizzes in final grade (percentage)';
COMMENT ON COLUMN courses.assignment_weight IS 'Weight of assignments in final grade (percentage)';
COMMENT ON COLUMN courses.final_exam_weight IS 'Weight of final exam in final grade (percentage)';
COMMENT ON COLUMN courses.min_score_for_certificate IS 'Minimum total score required for certificate';
COMMENT ON COLUMN enrollments.internal_score IS 'Calculated internal score (quiz + assignment average)';
COMMENT ON COLUMN enrollments.final_exam_score IS 'Final exam score';
COMMENT ON COLUMN enrollments.total_score IS 'Total weighted score';
COMMENT ON COLUMN enrollments.certificate_eligible IS 'Whether student is eligible for certificate';
