-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create course_teachers junction table for co-teachers
CREATE TABLE IF NOT EXISTS course_teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    role VARCHAR(50) DEFAULT 'co-teacher', -- 'main', 'co-teacher', 'assistant'
    added_at TIMESTAMP DEFAULT NOW(),
    added_by UUID,
    UNIQUE(course_id, teacher_id)
);

-- Add foreign key constraints only if the tables exist
DO $$ 
BEGIN
    -- Add foreign key for course_id if courses table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
        ALTER TABLE course_teachers 
        DROP CONSTRAINT IF EXISTS course_teachers_course_id_fkey;
        
        ALTER TABLE course_teachers 
        ADD CONSTRAINT course_teachers_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key for teacher_id if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        ALTER TABLE course_teachers 
        DROP CONSTRAINT IF EXISTS course_teachers_teacher_id_fkey;
        
        ALTER TABLE course_teachers 
        ADD CONSTRAINT course_teachers_teacher_id_fkey 
        FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        -- Add foreign key for added_by if profiles table exists
        ALTER TABLE course_teachers 
        DROP CONSTRAINT IF EXISTS course_teachers_added_by_fkey;
        
        ALTER TABLE course_teachers 
        ADD CONSTRAINT course_teachers_added_by_fkey 
        FOREIGN KEY (added_by) REFERENCES profiles(id);
    END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_teachers_course ON course_teachers(course_id);
CREATE INDEX IF NOT EXISTS idx_course_teachers_teacher ON course_teachers(teacher_id);
