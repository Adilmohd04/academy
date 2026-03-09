# Student Enrollment System - Quick Setup & Testing Guide

## ✅ Implementation Status

### Backend Complete
- ✅ Database migrations created
- ✅ Enrollment service (eligibility checking)
- ✅ Payment service (Stripe integration)
- ✅ Student course controllers
- ✅ API routes registered
- ✅ Stripe key added to .env

### Frontend Complete
- ✅ Course browse page (already exists)
- ✅ Course detail page with prerequisites
- ✅ Eligibility checking UI
- ✅ API client updated
- ✅ Islamic-themed components

## 🚀 Setup Steps

### 1. Run Database Migrations

**Option A: Via Supabase Dashboard (RECOMMENDED)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "SQL Editor"
4. Open `backend/database/migrations/COMBINED_MIGRATIONS.sql`
5. Copy and paste the entire content
6. Click "Run" to execute

**Option B: Via API (if you have exec_sql RPC)**
```bash
cd backend
node run-all-migrations.mjs
```

### 2. Verify Stripe Configuration

Backend `.env` already updated with:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Note:** The keys in the file are placeholder values. Replace with your actual Stripe test keys from https://dashboard.stripe.com/test/apikeys

### 3. Start Servers

Both servers are already running!

**Backend:** http://localhost:5000
- Check health: http://localhost:5000/api/health

**Frontend:** http://localhost:3000

## 🧪 Testing the Flow

### Step 1: Browse Courses
1. Open http://localhost:3000/student/courses/browse
2. You should see all approved courses
3. Note: Courses with `approval_status = 'approved'` will show

### Step 2: View Course Details
1. Click on any course card
2. Navigate to `/student/courses/browse/[courseId]`
3. **You should see:**
   - Course title, description, category
   - Teacher information
   - Enrollment count and capacity
   - Course syllabus (weeks)
   - Prerequisites section (if any)
   - Eligibility status

### Step 3: Check Prerequisites
**If course has prerequisites:**
- ✅ Green checkmark = Completed
- ❌ Red X = Not completed
- "Not Eligible" banner shows if prerequisites missing

**If course is full:**
- Red "Course is Full" banner
- Enroll button disabled

**If eligible:**
- "Enroll Now" button enabled
- Shows capacity remaining

### Step 4: Enroll Flow
1. Click "Enroll Now" button
2. Redirects to `/student/courses/[courseId]/payment`
3. **Note:** Payment page not yet implemented
4. You'll see a 404 - this is expected

## 📊 Database Tables Created

### 1. `course_prerequisites`
```sql
- id (UUID)
- course_id (references courses)
- prerequisite_course_id (references courses)
- created_at
```

**Example:** Course "Advanced Quran" requires "Basic Quran"

### 2. `student_payments`
```sql
- id (UUID)
- student_id (TEXT)
- course_id (UUID)
- amount (DECIMAL)
- stripe_payment_intent_id (TEXT)
- status (pending/completed/failed/refunded)
- created_at, updated_at, completed_at
```

### 3. `discussion_votes`
```sql
- id (UUID)
- discussion_id (UUID)
- user_id (TEXT)
- vote_type (up/down)
- created_at, updated_at
```

### 4. `courses` (updated)
- Added: `max_students INTEGER DEFAULT 30`

## 🔌 API Endpoints

### Student Course Endpoints
```
GET    /api/student/courses/published          # Browse all approved courses
GET    /api/student/courses/:id/details        # Course with prerequisites
GET    /api/student/courses/:id/eligibility    # Check if student can enroll
GET    /api/student/courses/enrolled           # Student's enrolled courses
POST   /api/student/courses/:id/payment        # Create payment intent
POST   /api/student/courses/payment/confirm    # Confirm payment & enroll
```

### Payment Endpoints
```
GET    /api/student/payments                   # Payment history
GET    /api/student/payments/:id/slip          # Payment slip data
```

## 🧩 Testing Scenarios

### Scenario 1: Course Without Prerequisites
1. Find course with no prerequisites
2. Check eligibility → Should be eligible (if capacity available)
3. Click "Enroll Now" → Redirects to payment

### Scenario 2: Course With Prerequisites (Not Completed)
1. Add a prerequisite to a course:
```sql
INSERT INTO course_prerequisites (course_id, prerequisite_course_id)
VALUES 
  ('advanced-course-id', 'basic-course-id');
```
2. View course → Should show "Not Eligible"
3. Prerequisites section shows red X for uncompleted

### Scenario 3: Course at Full Capacity
1. Set `max_students = 1` on a course
2. Enroll 1 student manually:
```sql
INSERT INTO enrollments (student_id, course_id, status)
VALUES ('student-clerk-id', 'course-id', 'active');
```
3. View course → Should show "Course is Full"

### Scenario 4: Already Enrolled
1. Enroll in a course
2. View course again → Shows "Already Enrolled"
3. Button changes to "Continue Learning"

## 🛠️ Manual Testing with SQL

### Add Prerequisites to a Course
```sql
-- Make "Advanced Arabic" require "Basic Arabic"
INSERT INTO course_prerequisites (course_id, prerequisite_course_id)
SELECT 
  c1.id as course_id,
  c2.id as prerequisite_course_id
FROM courses c1, courses c2
WHERE c1.title = 'Advanced Arabic'
AND c2.title = 'Basic Arabic';
```

### Check Prerequisites
```sql
SELECT 
  c.title as course,
  p.title as prerequisite
FROM course_prerequisites cp
JOIN courses c ON c.id = cp.course_id
JOIN courses p ON p.id = cp.prerequisite_course_id;
```

### Simulate Course Completion
```sql
-- Mark prerequisite as completed for testing
UPDATE enrollments
SET status = 'completed', progress = 100
WHERE student_id = 'your-clerk-user-id'
AND course_id = 'prerequisite-course-id';
```

### Check Course Capacity
```sql
SELECT 
  c.title,
  c.max_students,
  COUNT(e.id) as enrolled_count,
  c.max_students - COUNT(e.id) as seats_available
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
GROUP BY c.id, c.title, c.max_students;
```

## 🎨 UI Components Used

- **IslamicPageLoader** - Loading states
- **IslamicCard** - Course detail sections
- **IslamicButton** - Enroll button
- **Badges** - Status indicators (Full, Eligible, Prerequisites)
- **Icons** - CheckCircle, XCircle, Lock, AlertCircle

## 🚧 Still To Implement

1. **Payment Page** (`/student/courses/[courseId]/payment`)
   - Stripe Elements integration
   - Payment form
   - Success/failure handling

2. **Course Learning Page** (`/student/courses/[courseId]/learn`)
   - Protected route for enrolled students
   - Display course content (weeks, lessons)
   - Progress tracking

3. **Payment History Page**
   - List in student profile
   - Download slip functionality
   - PDF generation

4. **Middleware Protection**
   - Check enrollment before allowing /learn access

## 📝 Next Steps

1. ✅ Run migrations in Supabase
2. ✅ Test course browsing
3. ✅ Test course details page
4. ✅ Test eligibility checking
5. ⏳ Add test data (prerequisites)
6. ⏳ Implement payment page
7. ⏳ Implement learning page
8. ⏳ Add payment history

## 🔗 Quick Links

- Frontend: http://localhost:3000/student/courses/browse
- Backend API: http://localhost:5000/api/student/courses/published
- Supabase Dashboard: https://supabase.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com/test

## 💡 Tips

- Use Supabase Table Editor to manually add prerequisites for testing
- Check browser console for API errors
- Backend logs show in terminal
- Use Chrome DevTools Network tab to debug API calls
- Teacher can update `max_students` via course settings (future feature)

---

**Status:** Backend & Frontend running, ready for testing! 🎉
