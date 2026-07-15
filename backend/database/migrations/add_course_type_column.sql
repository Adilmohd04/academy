/**
 * Migration: Add course_type column to courses table
 * Date: 2026-01-09
 * Description: Adds course_type column to support different course delivery formats
 */

-- Add course_type column with default value
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS course_type VARCHAR(50) DEFAULT 'pre-recorded' 
CHECK (course_type IN ('pre-recorded', 'live', 'hybrid'));

-- Add comment for documentation
COMMENT ON COLUMN courses.course_type IS 'Course delivery format: pre-recorded (self-paced), live (scheduled classes), or hybrid (combination)';

-- Update existing courses to have default course_type
UPDATE courses 
SET course_type = 'pre-recorded' 
WHERE course_type IS NULL;
