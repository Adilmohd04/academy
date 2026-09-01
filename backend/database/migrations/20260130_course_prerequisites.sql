-- Create course_prerequisites table for managing course dependencies
-- This allows courses to require completion of other courses before enrollment

CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, prerequisite_course_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course_id ON course_prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prerequisite_id ON course_prerequisites(prerequisite_course_id);

-- Add RLS policies
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Anyone can view prerequisites
CREATE POLICY "Anyone can view prerequisites" ON course_prerequisites
  FOR SELECT USING (true);

-- Teachers can manage prerequisites for their own courses
CREATE POLICY "Teachers can manage own course prerequisites" ON course_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_prerequisites.course_id 
      AND courses.teacher_id = auth.uid()::text
    )
  );

-- Admins can manage all prerequisites
CREATE POLICY "Admins can manage all prerequisites" ON course_prerequisites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.clerk_user_id = auth.uid()::text 
      AND profiles.role = 'admin'
    )
  );

-- Add max_students column to courses if not exists
ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30;

COMMENT ON TABLE course_prerequisites IS 'Defines prerequisite courses that must be completed before enrolling';
COMMENT ON COLUMN course_prerequisites.course_id IS 'The course that has prerequisites';
COMMENT ON COLUMN course_prerequisites.prerequisite_course_id IS 'The course that must be completed first';
COMMENT ON COLUMN courses.max_students IS 'Maximum number of students allowed to enroll in this course';
