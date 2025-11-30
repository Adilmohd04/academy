# Database Schema for Courses

Run this SQL in your Supabase SQL Editor:

```sql
-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id TEXT NOT NULL, -- Clerk user ID of the teacher
  teacher_name TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  thumbnail_url TEXT,
  duration_weeks INTEGER DEFAULT 4,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL, -- Clerk user ID
  student_email TEXT,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  progress INTEGER DEFAULT 0,
  UNIQUE(course_id, student_id)
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service role
CREATE POLICY "Service role can manage courses"
ON courses FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage enrollments"
ON enrollments FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage meetings"
ON meetings FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

Save this file and run the SQL in Supabase!
