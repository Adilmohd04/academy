# FIX ALL ISSUES - RUN THIS NOW

## Problem Summary:
- ❌ Admin can't see users
- ❌ Student sees "Failed to fetch courses"
- ❌ Student can't schedule meetings (no teachers/slots shown)
- ❌ Teacher sees "Failed to create course"
- ❌ Teacher can't open schedule meetings page
- ❌ **ROOT CAUSE**: Database missing teacher availability tables

---

## ✅ SOLUTION - Follow These Steps:

### STEP 1: Run the Database Migration (REQUIRED)

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Click on your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open the file: `COMPLETE_TEACHER_AVAILABILITY_MIGRATION.sql`
6. Copy ALL content and paste into Supabase SQL Editor
7. Click **RUN** button
8. ✅ You should see "Success" message

### STEP 2: Verify Tables Were Created

Run this query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'teacher_weekly_availability',
  'teacher_slot_availability',
  'time_slots',
  'meeting_requests',
  'profiles'
)
ORDER BY table_name;
```

You should see all 5 tables listed.

### STEP 3: Add Sample Time Slots (If Not Already Added)

If your time_slots table is empty, run this:

```sql
INSERT INTO time_slots (slot_name, start_time, end_time, duration_minutes, display_order, is_active)
VALUES 
  ('Morning 9-10 AM', '09:00:00', '10:00:00', 60, 1, true),
  ('Morning 10-11 AM', '10:00:00', '11:00:00', 60, 2, true),
  ('Morning 11-12 PM', '11:00:00', '12:00:00', 60, 3, true),
  ('Afternoon 2-3 PM', '14:00:00', '15:00:00', 60, 4, true),
  ('Afternoon 3-4 PM', '15:00:00', '16:00:00', 60, 5, true),
  ('Afternoon 4-5 PM', '16:00:00', '17:00:00', 60, 6, true),
  ('Evening 5-6 PM', '17:00:00', '18:00:00', 60, 7, true),
  ('Evening 6-7 PM', '18:00:00', '19:00:00', 60, 8, true)
ON CONFLICT DO NOTHING;
```

### STEP 4: Check Your .env File

Make sure `c:\Users\sadil\Desktop\acad\.env` has these lines:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Supabase (Database)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key_here
```

### STEP 5: Start Both Servers

**Terminal 1 - Backend:**
```powershell
cd c:\Users\sadil\Desktop\acad\backend
npm install
npm run dev
```

Backend should start on: `http://localhost:5000`

**Terminal 2 - Frontend:**
```powershell
cd c:\Users\sadil\Desktop\acad\frontend
npm install
npm run dev
```

Frontend should start on: `http://localhost:3000`

---

## 🎯 HOW IT SHOULD WORK AFTER FIX:

### **TEACHER** (http://localhost:3000/teacher/availability):
1. See weekly calendar
2. Click days you're available (Monday, Thursday, etc.)
3. Click "Configure Slots" button
4. For each date, add time slots:
   - Select time slot (9-10 AM, 2-3 PM, etc.)
   - Set capacity (1 student, 5 students, or Unlimited)
   - Set booking deadline (e.g., bookings close 2 days before meeting)
5. Click "Save Availability"
6. ✅ Students can now see your available slots

### **STUDENT** (http://localhost:3000/student/schedule-meeting):
1. Fill in: Name, Phone, Email
2. **Select Teacher** dropdown shows list of teachers
3. After selecting teacher, **Select Date** shows only dates teacher is available
4. After selecting date, **Select Time Slot** shows:
   - Available time slots for that teacher on that date
   - Remaining capacity: "3/5 slots remaining" or "Unlimited" or "FULL"
5. Can only book if:
   - Slots available (not full)
   - Before booking deadline
6. Click "Proceed to Payment"
7. Complete Razorpay payment
8. ✅ Booking confirmed, email sent to student + admin

### **ADMIN** (http://localhost:3000/admin):
1. **Users Tab**: See all users (students, teachers, admins)
   - Can update user roles
2. **Meeting Requests**: See all pending bookings
   - Student name, teacher, date, time, payment status
   - Click "Assign Teacher & Send Email" to confirm
3. ✅ Email automatically sent to teacher + student with meeting details

---

## 📊 WHAT THE MIGRATION ADDS:

### New Tables:
1. **teacher_weekly_availability** - Teachers mark which days they're free each week
2. **teacher_slot_availability** - Capacity per time slot per date (1, 5, unlimited)
3. **Triggers** - Auto-update booking count when student pays (3→2→1→0)
4. **Views** - Pre-built queries for available slots
5. **Functions** - Get teacher availability, check capacity, etc.

### Key Features:
- ✅ Dynamic capacity management (tracks 3→2→1→0→FULL)
- ✅ Booking deadlines (e.g., Wednesday meeting closes Monday)
- ✅ Unlimited capacity option
- ✅ Real-time availability updates
- ✅ Multi-teacher support
- ✅ Week-by-week scheduling

---

## ❌ IF YOU STILL SEE ERRORS:

### "Failed to fetch courses"
```sql
-- Check if courses table exists and has data
SELECT * FROM courses LIMIT 5;
```

### "Failed to fetch users" (Admin)
```sql
-- Check if profiles table exists
SELECT * FROM profiles LIMIT 5;
```

### "No teachers available"
```sql
-- Check if any teachers exist
SELECT * FROM profiles WHERE role = 'teacher';

-- If no teachers, create one manually in Clerk dashboard
-- Set publicMetadata: { "role": "teacher" }
```

### Backend not starting
```powershell
cd c:\Users\sadil\Desktop\acad\backend
npm install
npm run dev
```
Check console for errors.

---

## 🆘 QUICK TEST CHECKLIST:

After running migration, test this flow:

1. ✅ Login as **Teacher**
2. ✅ Go to "Schedule Availability"
3. ✅ Mark Monday as available
4. ✅ Add slot: Morning 9-10 AM, Capacity: 5 students
5. ✅ Save
6. ✅ Login as **Student** (different account)
7. ✅ Go to "Schedule Meeting"
8. ✅ Should see teacher in dropdown
9. ✅ Select teacher → should see Monday
10. ✅ Select Monday → should see "Morning 9-10 AM (5/5 slots remaining)"
11. ✅ Complete payment
12. ✅ Check admin portal → should see pending meeting request

---

**🔥 RUN THE SQL MIGRATION FIRST - EVERYTHING DEPENDS ON IT!**
