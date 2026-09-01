-- Create student_payments table for managing course payment transactions
-- Supports Stripe integration and payment slip generation

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_payments_student_id ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_course_id ON student_payments(course_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_status ON student_payments(status);
CREATE INDEX IF NOT EXISTS idx_student_payments_stripe_intent ON student_payments(stripe_payment_intent_id);

-- Add RLS policies
ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;

-- Students can view their own payments
CREATE POLICY "Students can view own payments" ON student_payments
  FOR SELECT USING (student_id = auth.uid()::text);

-- System can create payments (via service role)
CREATE POLICY "Service can create payments" ON student_payments
  FOR INSERT WITH CHECK (true);

-- System can update payments (via service role)
CREATE POLICY "Service can update payments" ON student_payments
  FOR UPDATE USING (true);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON student_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.clerk_user_id = auth.uid()::text 
      AND profiles.role = 'admin'
    )
  );

-- Teachers can view payments for their courses
CREATE POLICY "Teachers can view course payments" ON student_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = student_payments.course_id 
      AND courses.teacher_id = auth.uid()::text
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_student_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_payments_updated_at
  BEFORE UPDATE ON student_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_payments_updated_at();

COMMENT ON TABLE student_payments IS 'Stores payment transactions for course enrollments';
COMMENT ON COLUMN student_payments.status IS 'Payment status: pending, completed, failed, or refunded';
COMMENT ON COLUMN student_payments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for tracking';
COMMENT ON COLUMN student_payments.receipt_url IS 'URL to payment receipt/slip';
