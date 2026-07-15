-- Combined Migrations for Student Enrollment System
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. Course Prerequisites Table
-- =====================================================

CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, prerequisite_course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_id ON course_prerequisites(prerequisite_course_id);

ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view prerequisites" ON course_prerequisites;
CREATE POLICY "Anyone can view prerequisites" ON course_prerequisites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can manage own course prerequisites" ON course_prerequisites;
CREATE POLICY "Teachers can manage own course prerequisites" ON course_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_prerequisites.course_id 
      AND courses.teacher_id = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Admins can manage all prerequisites" ON course_prerequisites;
CREATE POLICY "Admins can manage all prerequisites" ON course_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.clerk_user_id = auth.uid()::text 
      AND profiles.role = 'admin'
    )
  );

ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30;

COMMENT ON TABLE course_prerequisites IS 'Defines prerequisite courses that must be completed before enrolling';
COMMENT ON COLUMN course_prerequisites.course_id IS 'The course that has prerequisites';
COMMENT ON COLUMN course_prerequisites.prerequisite_course_id IS 'The course that must be completed first';
COMMENT ON COLUMN courses.max_students IS 'Maximum number of students allowed to enroll in this course';

-- =====================================================
-- 2. Student Payments Table
-- =====================================================

CREATE TABLE IF NOT EXISTS student_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  receipt_url TEXT,
  enrollment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_student_payments_student_id ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_course_id ON student_payments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_status ON student_payments(status);
CREATE INDEX IF NOT EXISTS idx_student_payments_stripe_intent ON student_payments(stripe_payment_intent_id);

ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own payments" ON student_payments;
CREATE POLICY "Students can view own payments" ON student_payments
  FOR SELECT USING (student_id = auth.uid()::text);

DROP POLICY IF EXISTS "Service can create payments" ON student_payments;
CREATE POLICY "Service can create payments" ON student_payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service can update payments" ON student_payments;
CREATE POLICY "Service can update payments" ON student_payments
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can view all payments" ON student_payments;
CREATE POLICY "Admins can view all payments" ON student_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.clerk_user_id = auth.uid()::text 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Teachers can view course payments" ON student_payments;
CREATE POLICY "Teachers can view course payments" ON student_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = student_payments.course_id 
      AND courses.teacher_id = auth.uid()::text
    )
  );

CREATE OR REPLACE FUNCTION update_student_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_student_payments_updated_at ON student_payments;
CREATE TRIGGER update_student_payments_updated_at
  BEFORE UPDATE ON student_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_payments_updated_at();

COMMENT ON TABLE student_payments IS 'Stores payment transactions for course enrollments';
COMMENT ON COLUMN student_payments.status IS 'Payment status: pending, completed, failed, or refunded';
COMMENT ON COLUMN student_payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for tracking';
COMMENT ON COLUMN student_payments.receipt_url IS 'URL to payment receipt/slip';

-- =====================================================
-- 3. Discussion Votes Table
-- =====================================================

CREATE TABLE IF NOT EXISTS discussion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(discussion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion_id ON discussion_votes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_user_id ON discussion_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_discussion_votes_type ON discussion_votes(vote_type);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discussion_upvotes') THEN
    INSERT INTO discussion_votes (discussion_id, user_id, vote_type, created_at)
    SELECT discussion_id, user_id, 'up', created_at
    FROM discussion_upvotes
    ON CONFLICT (discussion_id, user_id) DO NOTHING;
  END IF;
END $$;

ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view votes" ON discussion_votes;
CREATE POLICY "Anyone can view votes" ON discussion_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own votes" ON discussion_votes;
CREATE POLICY "Users can insert own votes" ON discussion_votes
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON discussion_votes;
CREATE POLICY "Users can update own votes" ON discussion_votes
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON discussion_votes;
CREATE POLICY "Users can delete own votes" ON discussion_votes
  FOR DELETE USING (auth.uid()::text = user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'course_discussions' 
    AND column_name = 'upvotes'
  ) THEN
    ALTER TABLE course_discussions DROP COLUMN upvotes;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_discussion_votes_updated_at ON discussion_votes;
CREATE TRIGGER update_discussion_votes_updated_at
  BEFORE UPDATE ON discussion_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE discussion_votes IS 'Stores upvote/downvote data for course discussions and replies';
COMMENT ON COLUMN discussion_votes.vote_type IS 'Either "up" for upvote or "down" for downvote';

-- =====================================================
-- DONE! All migrations completed successfully
-- =====================================================
