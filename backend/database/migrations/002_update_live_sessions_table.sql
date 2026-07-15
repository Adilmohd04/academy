-- ============================================
-- Migration: Update live_sessions table
-- Add missing columns for Course Management System
-- ============================================

-- Add description column if it doesn't exist
ALTER TABLE live_sessions 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add week_id column (for course week association)
ALTER TABLE live_sessions 
ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES course_weeks(id) ON DELETE SET NULL;

-- Add google_event_id for calendar integration
ALTER TABLE live_sessions 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Add recording_duration_minutes
ALTER TABLE live_sessions 
ADD COLUMN IF NOT EXISTS recording_duration_minutes INTEGER;

-- Add max_participants
ALTER TABLE live_sessions 
ADD COLUMN IF NOT EXISTS max_participants INTEGER;

-- Add updated_at timestamp
ALTER TABLE live_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update status column to have proper constraints if not already set
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE live_sessions DROP CONSTRAINT IF EXISTS live_sessions_status_check;
  
  -- Add new constraint with all status values
  ALTER TABLE live_sessions 
  ADD CONSTRAINT live_sessions_status_check 
  CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_schedule ON live_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_sessions_week ON live_sessions(week_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_live_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_live_sessions_updated_at ON live_sessions;
CREATE TRIGGER trigger_update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_live_sessions_updated_at();

COMMENT ON COLUMN live_sessions.description IS 'Detailed description of the live session';
COMMENT ON COLUMN live_sessions.week_id IS 'Associated course week (optional)';
COMMENT ON COLUMN live_sessions.google_event_id IS 'Google Calendar event ID for integration';
COMMENT ON COLUMN live_sessions.recording_duration_minutes IS 'Duration of the recorded session in minutes';
COMMENT ON COLUMN live_sessions.max_participants IS 'Maximum number of participants allowed';
