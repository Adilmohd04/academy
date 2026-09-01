-- Final Exams Module Migration
-- Creates tables for end-of-course final exams

-- Final exams table
CREATE TABLE IF NOT EXISTS final_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Final Examination',
    description TEXT,
    total_marks INTEGER NOT NULL DEFAULT 100,
    passing_marks INTEGER DEFAULT 40,
    time_limit_minutes INTEGER DEFAULT 120,
    instructions TEXT,
    exam_mode VARCHAR(50) DEFAULT 'timer' CHECK (exam_mode IN ('timer', 'no_timer', 'proctored')),
    is_published BOOLEAN DEFAULT false,
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    scheduled_publish_time TIMESTAMP,
    max_attempts INTEGER DEFAULT 1,
    show_results_to_student BOOLEAN DEFAULT true,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id)
);

-- Final exam questions table
CREATE TABLE IF NOT EXISTS final_exam_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'text_response', 'file_upload')),
    marks INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,
    file_type VARCHAR(50), -- for file upload questions
    max_file_size_mb INTEGER DEFAULT 5,
    max_duration_minutes INTEGER, -- for video/audio response questions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Final exam options (for multiple choice questions)
CREATE TABLE IF NOT EXISTS final_exam_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES final_exam_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Final exam submissions table (student attempts)
CREATE TABLE IF NOT EXISTS final_exam_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submission_status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (submission_status IN ('in_progress', 'submitted', 'graded')),
    total_score INTEGER,
    passing_score INTEGER,
    passed BOOLEAN,
    attempt_number INTEGER DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent_minutes INTEGER,
    auto_saved_at TIMESTAMP,
    UNIQUE(exam_id, student_id, attempt_number)
);

-- Student exam answers table
CREATE TABLE IF NOT EXISTS final_exam_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES final_exam_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES final_exam_questions(id) ON DELETE CASCADE,
    student_answer TEXT, -- stores answer for text/short answer
    selected_option_id UUID REFERENCES final_exam_options(id) ON DELETE SET NULL, -- stores selected option for MCQ
    uploaded_file_url VARCHAR(500), -- stores file URL for file uploads
    points_earned INTEGER,
    is_correct BOOLEAN,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- for essay/subjective questions
    graded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, question_id)
);

-- Create indexes
CREATE INDEX idx_final_exams_course_id ON final_exams(course_id);
CREATE INDEX idx_final_exams_is_published ON final_exams(is_published);
CREATE INDEX idx_final_exam_questions_exam_id ON final_exam_questions(exam_id);
CREATE INDEX idx_final_exam_options_question_id ON final_exam_options(question_id);
CREATE INDEX idx_final_exam_submissions_exam_id ON final_exam_submissions(exam_id);
CREATE INDEX idx_final_exam_submissions_student_id ON final_exam_submissions(student_id);
CREATE INDEX idx_final_exam_submissions_status ON final_exam_submissions(submission_status);
CREATE INDEX idx_final_exam_answers_submission_id ON final_exam_answers(submission_id);
CREATE INDEX idx_final_exam_answers_question_id ON final_exam_answers(question_id);

-- Create triggers
CREATE TRIGGER update_final_exams_updated_at BEFORE UPDATE ON final_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_final_exam_questions_updated_at BEFORE UPDATE ON final_exam_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_final_exam_answers_updated_at BEFORE UPDATE ON final_exam_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
