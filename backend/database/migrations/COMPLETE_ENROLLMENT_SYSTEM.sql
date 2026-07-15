-- ===============================================
-- COMPLETE ENROLLMENT SYSTEM MIGRATION
-- Includes: Prerequisites, Payments (Razorpay), and Discussion Votes
-- ===============================================

-- 1. Course Prerequisites Table
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, prerequisite_course_id),
  CHECK (course_id != prerequisite_course_id)
);

-- Indexes for prerequisites
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course 
ON course_prerequisites(course_id);

CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prereq 
ON course_prerequisites(prerequisite_course_id);

-- RLS for course_prerequisites
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their course prerequisites" ON course_prerequisites;
CREATE POLICY "Teachers can manage their course prerequisites"
ON course_prerequisites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE courses.id = course_prerequisites.course_id 
    AND courses.teacher_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Admins can manage all prerequisites" ON course_prerequisites;
CREATE POLICY "Admins can manage all prerequisites"
ON course_prerequisites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.clerk_user_id = auth.uid()::text
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Everyone can view prerequisites" ON course_prerequisites;
CREATE POLICY "Everyone can view prerequisites"
ON course_prerequisites
FOR SELECT
USING (true);

-- 2. Student Payments Table with Razorpay Support
CREATE TABLE IF NOT EXISTS student_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Razorpay fields
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(512),
  
  -- Stripe fields (for backward compatibility)
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  
  payment_method VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_student_payments_student 
ON student_payments(student_id);

CREATE INDEX IF NOT EXISTS idx_student_payments_course 
ON student_payments(course_id);

CREATE INDEX IF NOT EXISTS idx_student_payments_status 
ON student_payments(status);

CREATE INDEX IF NOT EXISTS idx_student_payments_razorpay_order 
ON student_payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_student_payments_razorpay_payment 
ON student_payments(razorpay_payment_id);

-- RLS for student_payments
ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own payments" ON student_payments;
CREATE POLICY "Students can view their own payments"
ON student_payments
FOR SELECT
USING (student_id = auth.uid()::text);

DROP POLICY IF EXISTS "Students can create payments" ON student_payments;
CREATE POLICY "Students can create payments"
ON student_payments
FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

DROP POLICY IF EXISTS "Admins can view all payments" ON student_payments;
CREATE POLICY "Admins can view all payments"
ON student_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.clerk_user_id = auth.uid()::text
    AND profiles.role = 'admin'
  )
);

-- 3. Discussion Votes Table
CREATE TABLE IF NOT EXISTS discussion_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- Indexes for votes
CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion 
ON discussion_votes(discussion_id);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_user 
ON discussion_votes(user_id);

-- RLS for discussion_votes
ALTER TABLE discussion_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all votes" ON discussion_votes;
CREATE POLICY "Users can view all votes"
ON discussion_votes
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can manage their own votes" ON discussion_votes;
CREATE POLICY "Users can manage their own votes"
ON discussion_votes
FOR ALL
USING (user_id = auth.uid()::text);

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Check prerequisites
SELECT 'Prerequisites table' as table_name, COUNT(*) as row_count 
FROM course_prerequisites;

-- Check payments
SELECT 'Student payments table' as table_name, COUNT(*) as row_count 
FROM student_payments;

-- Check votes
SELECT 'Discussion votes table' as table_name, COUNT(*) as row_count 
FROM discussion_votes;

-- List all indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('course_prerequisites', 'student_payments', 'discussion_votes')
ORDER BY tablename, indexname;
