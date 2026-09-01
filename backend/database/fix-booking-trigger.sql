-- Fix meeting_bookings trigger to use correct column name
-- The trigger was looking for "slot_id" but the table has "teacher_slot_id"

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS increment_booking_count ON meeting_bookings;
DROP FUNCTION IF EXISTS increment_slot_booking();

-- Create new trigger function with correct column name
CREATE OR REPLACE FUNCTION increment_slot_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment current_bookings for the slot
  UPDATE teacher_slot_availability
  SET current_bookings = current_bookings + 1
  WHERE id = NEW.teacher_slot_id;  -- Fixed: Use teacher_slot_id, not slot_id
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically increment bookings
CREATE TRIGGER increment_booking_count
AFTER INSERT ON meeting_bookings
FOR EACH ROW
EXECUTE FUNCTION increment_slot_booking();
