-- Update student_payments table for Razorpay
-- Add Razorpay-specific columns while keeping existing Stripe columns for compatibility

-- Add razorpay columns
ALTER TABLE student_payments 
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(512);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_payments_razorpay_order 
ON student_payments(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_student_payments_razorpay_payment 
ON student_payments(razorpay_payment_id);

-- Add comment
COMMENT ON COLUMN student_payments.razorpay_order_id IS 'Razorpay order ID for payment tracking';
COMMENT ON COLUMN student_payments.razorpay_payment_id IS 'Razorpay payment ID after successful payment';
COMMENT ON COLUMN student_payments.razorpay_signature IS 'Razorpay signature for payment verification';
