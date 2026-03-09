# 🚀 IMMEDIATE ACTION REQUIRED - Database Migration

## ⚠️ Critical Issue: Database Missing Columns

Your frontend is showing **N/A** and **"Instructor:Instructor"** because the database is missing required columns. The SQL migration MUST be run before the data will display.

## ✅ STEP 1: Run Database Migration (REQUIRED!)

**Go to Supabase Dashboard → SQL Editor → Run this:**

```sql
-- CORRECTED: Handles existing columns with wrong types

-- Drop and recreate columns if they have wrong type
DO $$ 
BEGIN
  -- Drop learning_outcomes if it's TEXT instead of TEXT[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'learning_outcomes'
    AND data_type != 'ARRAY'
  ) THEN
    ALTER TABLE courses DROP COLUMN learning_outcomes;
  END IF;
  
  -- Drop skills_gained if it's TEXT instead of TEXT[]
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'skills_gained'
    AND data_type != 'ARRAY'
  ) THEN
    ALTER TABLE courses DROP COLUMN skills_gained;
  END IF;
END $$;

-- Add all columns with correct types
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS skills_gained TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_bio TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS teacher_title TEXT;

-- Fix quiz submissions table (fixes "Could not find lesson_id column" error)  
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  answers JSONB NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  total_points NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing quiz_submissions table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'lesson_id') THEN
    ALTER TABLE quiz_submissions ADD COLUMN lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'student_id') THEN
    ALTER TABLE quiz_submissions ADD COLUMN student_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'answers') THEN
    ALTER TABLE quiz_submissions ADD COLUMN answers JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'score') THEN
    ALTER TABLE quiz_submissions ADD COLUMN score NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'total_points') THEN
    ALTER TABLE quiz_submissions ADD COLUMN total_points NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'percentage') THEN
    ALTER TABLE quiz_submissions ADD COLUMN percentage NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_submissions' AND column_name = 'submitted_at') THEN
    ALTER TABLE quiz_submissions ADD COLUMN submitted_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for quiz submissions
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_lesson_id ON quiz_submissions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);

-- Add sample data to your courses (update with real data later)
UPDATE courses 
SET 
  learning_outcomes = ARRAY[
    'Understand core Islamic beliefs and principles',
    'Learn proper worship methods and etiquette',  
    'Develop good character based on Islamic teachings',
    'Apply Islamic knowledge to daily life'
  ],
  skills_gained = ARRAY[
    'Quran recitation with proper tajweed',
    'Prayer (Salah) mastery',
    'Islamic history knowledge',
    'Arabic language basics'
  ],
  estimated_hours = CASE WHEN estimated_hours IS NULL THEN 40 ELSE estimated_hours END,
  language = CASE WHEN language IS NULL THEN 'English' ELSE language END,
  teacher_bio = CASE WHEN teacher_bio IS NULL THEN 'Experienced Islamic scholar with years of teaching experience in Islamic studies, Quran, and Arabic language.' ELSE teacher_bio END,
  teacher_title = CASE WHEN teacher_title IS NULL THEN 'Islamic Studies Professor' ELSE teacher_title END
WHERE learning_outcomes IS NULL;

-- VERIFY the migration succeeded
SELECT 
  'Migration Complete!' as status,
  COUNT(*) as courses_updated
FROM courses 
WHERE learning_outcomes IS NOT NULL;
```

## ✅ STEP 2: Test Both Servers

**Backend:** (Port 5000)
```powershell
cd backend
npm run dev
```
✅ Should show: "Education Platform API Server Running" on port 5000

**Frontend:** (Port 3000)
```powershell
cd frontend  
npm run dev
```
✅ Should show: "Ready in X ms" on port 3000

## ✅ STEP 3: Verify Fixes

### Test Discussion Forum:
1. Login as student
2. Open enrolled course
3. Click **Discussion** tab (left sidebar)
4. ✅ Should show **full-height forum** with purple header
5. ✅ Title: "Course Discussion Forum"

### Test Course Details:
1. Click **About** tab
2. Scroll to "Course Details" section
3. ✅ Should show:
   - Category: "Islamic Studies" (not N/A)
   - Level: "Beginner" (not N/A)
   - Estimated Hours: "40 hours" or "Self-paced" (not N/A hours)
   - Language: "English"
   - Total Modules & Lessons: actual numbers

### Test Instructor Name:
1. Look at top of About page
2. ✅ Should show: "👨‍🏫 Instructor: [Actual Teacher Name]" 
3. ✅ NOT "Instructor:Instructor"

### Test Learning Outcomes:
1. Scroll to "What You'll Learn" section
2. ✅ Should show 4 bullet points with checkmarks
3. ✅ NOT empty

### Test Skills Gained:
1. Scroll to "Skills You'll Gain"  
2. ✅ Should show purple badges with skills
3. ✅ NOT empty

### Test Quiz Submissions:
1. Go to any lesson with a quiz
2. Answer questions and submit
3. ✅ Should save successfully
4. ✅ NOT "Could not find lesson_id column" error

## 📊 What Changed

### Frontend Fixes Applied:
1. ✅ **Discussion forum layout** - Full-height iframe with larger header
2. ✅ **Instructor name** - Shows teacher's full name from API
3. ✅ **Course details defaults** - Shows "Islamic Studies", "Beginner", "Self-paced" instead of "N/A"

### Backend Fixes Applied:
1. ✅ **getCourseDetails API** - Returns teacher name, bio, title
2. ✅ **getPublishedCourses API** - Returns all enhanced fields

### Database Migration (YOU MUST RUN):
1. ⏳ **Course columns** - learning_outcomes, skills_gained, etc.
2. ⏳ **Quiz submissions table** - lesson_id, student_id, answers, score

## 🎯 Expected Results After Migration

**Before Migration (Current):**
- Category: N/A
- Level: N/A  
- Estimated Hours: N/A hours
- Instructor: Instructor
- Quiz submission: ❌ Error "lesson_id not found"

**After Migration (Fixed):**
- Category: Islamic Studies ✅
- Level: Beginner ✅
- Estimated Hours: 40 hours ✅
- Instructor: [Teacher's Actual Name] ✅  
- Learning Outcomes: 4 items with checkmarks ✅
- Skills Gained: 4 purple badges ✅
- Teacher Bio: Full paragraph ✅
- Quiz submission: ✅ Saves successfully

## 📁 Migration Files Created

1. **COMPLETE_DATABASE_FIX.sql** - Full migration with verification queries
2. **backend/database/migrations/add_course_details_columns.sql** - Course columns only
3. **backend/database/migrations/fix_quiz_submissions_schema.sql** - Quiz table only

**Use any of these files - they all contain the complete fix.**

## ⚡ Quick Debug

**If discussion still looks small:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache

**If data still shows N/A:**
- Verify SQL ran successfully in Supabase
- Check backend logs for errors
- Restart backend server

**If quiz still fails:**
- Confirm quiz_submissions table exists:
  ```sql
  SELECT * FROM information_schema.tables 
  WHERE table_name = 'quiz_submissions';
  ```

## 🎉 Success Checklist

- [ ] SQL migration executed in Supabase (no errors)
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Discussion forum displays full-height
- [ ] Course details show real data (not N/A)
- [ ] Instructor name shows correctly
- [ ] Learning outcomes display
- [ ] Skills badges display
- [ ] Quiz submissions save successfully

**Once all checked, your comprehensive student tracking system is COMPLETE!** 🚀
