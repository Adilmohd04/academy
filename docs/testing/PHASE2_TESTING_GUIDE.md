# Phase 2: Auto Google Meet Integration - Testing Guide

## 🎯 What We Built

Added **one-click Google Meet generation** for meeting approvals. Admin can now click a button to:
1. Auto-create Google Meet link via Calendar API
2. Send calendar invites to all participants (teacher + students)
3. Approve all students in the box
4. Save meeting link and event ID in database
5. Send email notifications with meeting link

---

## ✅ Changes Made

### Backend Changes

1. **Controller** (`backend/src/controllers/boxApprovalController.ts`)
   - Added `generateMeetingAndApprove` endpoint
   - Validates request (auth, required fields)
   - Calls service layer and returns result

2. **Route** (`backend/src/routes/boxes.ts`)
   - New endpoint: `POST /api/boxes/:boxId/generate-meeting`
   - Protected with `requireAuth` middleware

3. **Service** (`backend/src/services/boxApprovalService.ts`)
   - Enhanced `generateMeetingAndApprove` function
   - Fetches teacher + student emails
   - Calls Google Calendar API to create event
   - Sends calendar invites automatically
   - Saves `google_event_id` to database
   - Falls back to pseudo-link if API fails

4. **Database Migration** (`backend/database/migrations/002_add_google_meet_fields.sql`)
   - Added `google_event_id` column
   - Added `calendar_invite_sent` boolean
   - Added `calendar_invite_sent_at` timestamp
   - Created indexes for performance

### Frontend Changes

1. **Admin Approval Page** (`frontend/app/admin/meetings/approval/page.tsx`)
   - Added `handleGenerateMeetLink` function
   - New blue button: "🎥 Generate Google Meet & Approve"
   - Made manual approval button secondary (gray styling)
   - Updated help text to explain both options

---

## 🧪 Testing Steps

### Step 1: Run Database Migration

**Go to Supabase Dashboard:**
1. Open https://supabase.com/dashboard
2. Select your project (Islamic Academy)
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy and paste the contents of `backend/database/migrations/002_add_google_meet_fields.sql`
6. Click "Run" button
7. Verify you see: "Success. No rows returned"

**Verify columns added:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meeting_bookings' 
  AND column_name IN ('google_event_id', 'calendar_invite_sent', 'calendar_invite_sent_at');
```

Expected output: 3 rows showing the new columns

---

### Step 2: Start Backend Locally

```bash
cd backend
npm install
npm run dev
```

**Expected output:**
```
Server running on http://localhost:5000
✅ Database connected successfully
```

**Check Google Calendar config:**
Look for log message:
```
📤 Creating Google Calendar event: summary='...'
```

---

### Step 3: Start Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
✓ Ready in 2.5s
```

---

### Step 4: Create Test Booking

**As Student:**
1. Go to http://localhost:3000
2. Sign in as student (or create account)
3. Navigate to "Book Meeting"
4. Select a teacher, date, and time slot
5. Complete payment (use test mode)
6. Verify booking status shows "Pending Approval"

---

### Step 5: Test Auto Google Meet Generation

**As Admin:**
1. Go to http://localhost:3000
2. Sign in as admin
3. Navigate to "Admin" → "Meeting Approval"
4. Find the pending box with the test student
5. Look for the **blue button**: "🎥 Generate Google Meet & Approve"
6. Click the button

**Expected behavior:**
- Button shows loading: "Generating Google Meet..."
- After 3-5 seconds: Success alert appears
- Alert shows: "✅ Successfully generated Google Meet link and approved 1 student(s)!"
- Alert includes the Meet link (e.g., https://meet.google.com/abc-defg-hij)
- Box disappears from pending list

---

### Step 6: Verify Calendar Invites Sent

**Check Google Calendar:**
1. Go to https://calendar.google.com
2. Sign in with the Google Workspace account (calendar-service@littlemuslima.iam.gserviceaccount.com)
3. Find the created event on the scheduled date
4. Click the event

**Expected details:**
- Title: "Islamic Academy - Class with [Teacher Name]"
- Time: Matches the selected slot
- Attendees: Teacher email + all student emails
- Video conferencing: Google Meet link attached
- Reminders: Default Google Calendar reminders (10 min, 30 min before)

---

### Step 7: Verify Email Notifications

**Check Student Email:**
1. Open the student's email inbox
2. Look for email from "Islamic Academy"
3. Subject: "Meeting Approved - [Teacher Name]"

**Email should contain:**
- Meeting date and time
- Teacher name
- Google Meet link (clickable)
- Calendar invite attachment (.ics file)

**Check Teacher Email:**
1. Open the teacher's email inbox
2. Look for email from "Islamic Academy"
3. Subject: "New Meeting Scheduled - [Student Name]"

**Email should contain:**
- Student name and contact
- Meeting date and time
- Google Meet link (clickable)
- Calendar invite attachment

---

### Step 8: Verify Database Records

**Run this query in Supabase SQL Editor:**
```sql
SELECT 
  id,
  student_name,
  teacher_name,
  meeting_date,
  meeting_link,
  google_event_id,
  calendar_invite_sent,
  calendar_invite_sent_at,
  approval_status,
  status
FROM meeting_bookings
WHERE google_event_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected output:**
- `meeting_link`: Contains Google Meet URL
- `google_event_id`: Contains Google Calendar event ID
- `calendar_invite_sent`: TRUE
- `calendar_invite_sent_at`: Timestamp of when event was created
- `approval_status`: 'approved'
- `status`: 'approved'

---

### Step 9: Test Joining the Meeting

**15 minutes before meeting time:**
1. Student clicks the Google Meet link from email
2. Browser opens Google Meet waiting room
3. Student joins meeting
4. Teacher joins from their calendar or email link
5. Both can see each other in the video call

**Expected behavior:**
- Meet link is valid and works
- No "Meeting not found" error
- Video/audio works properly
- Chat and screen sharing available

---

### Step 10: Test Fallback (If Google API Fails)

**Temporarily break Google config:**
1. In `backend/.env`, change `GOOGLE_SERVICE_ACCOUNT_JSON` to invalid path
2. Restart backend: `npm run dev`
3. Try generating a meeting

**Expected behavior:**
- Warning log: "⚠️ Google Calendar not configured or failed, falling back to pseudo link"
- Fallback link generated: `https://meet.google.com/abc-defg-hij` (random)
- Approval still succeeds
- Emails sent with fallback link
- No `google_event_id` saved (will be NULL)

**Note:** Fallback link won't be joinable. This is just for graceful degradation.

---

## 🐛 Troubleshooting

### Issue: "Failed to generate meeting link"

**Possible causes:**
1. **Google Calendar API not configured**
   - Check `backend/.env` has all Google variables
   - Verify service account JSON file exists
   - Check logs for detailed error message

2. **Invalid service account permissions**
   - Service account must have domain-wide delegation
   - Must be added to Google Calendar with write access
   - Check Google Cloud Console → IAM & Admin

3. **Invalid date/time format**
   - Ensure `date` is YYYY-MM-DD format
   - Ensure `startTime`/`endTime` are HH:MM:SS format
   - Check timezone matches environment variable

**Solution:**
```bash
# Check Google config in backend terminal
console.log(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); # Should show path or JSON
console.log(process.env.GOOGLE_IMPERSONATED_USER); # Should show email
console.log(process.env.GOOGLE_CALENDAR_ID); # Should show calendar ID
```

---

### Issue: Calendar invites not received

**Possible causes:**
1. **Email addresses incorrect**
   - Check database has valid student/teacher emails
   - Verify no typos in email fields

2. **Google Calendar settings**
   - Calendar must have "Automatically add invitations" enabled
   - Check spam/junk folders

3. **Service account not shared with calendar**
   - Add service account email to calendar sharing settings
   - Grant "Make changes to events" permission

**Solution:**
1. Go to Google Calendar
2. Click settings (⚙️) → Calendar settings
3. Select the calendar
4. Scroll to "Share with specific people"
5. Add: `calendar-service@littlemuslima.iam.gserviceaccount.com`
6. Permission: "Make changes to events"

---

### Issue: Backend 401 Unauthorized

**Cause:** Not signed in as admin

**Solution:**
1. Sign out and sign back in
2. Verify your account has `role = 'admin'` in database
3. Check Clerk metadata also shows admin role

---

### Issue: Frontend button doesn't appear

**Possible causes:**
1. **Box not eligible for approval**
   - Box must be FULL (capacity reached) OR
   - Box deadline must have passed OR
   - Override must be enabled

2. **Box already approved**
   - Button only shows for pending boxes

**Solution:**
- Check box status in UI
- Enable "Override" button if box is OPEN/PARTIAL
- Refresh page to update box status

---

## ✅ Success Criteria

Phase 2 is complete when ALL of the following work:

- ✅ Admin can click "Generate Google Meet & Approve" button
- ✅ Google Meet link is created via Calendar API
- ✅ Calendar invites sent to teacher + all students
- ✅ Meeting link saved in database
- ✅ `google_event_id` saved in database
- ✅ Email notifications sent with meeting link
- ✅ Students can join the meeting at scheduled time
- ✅ Google Calendar shows event with correct details
- ✅ Reminders work (30 min before meeting)
- ✅ Manual approval still works as fallback option
- ✅ Graceful fallback if Google API unavailable

---

## 🎉 What's Next?

Once Phase 2 testing is complete, we'll move to:

**Phase 3: Course System MVP** (5-7 days)
- Create course management system
- Support recorded videos + live sessions
- Student enrollment and progress tracking
- Course player with video watching

**Phase 4: Live Sessions & Recordings** (2-3 days)
- Schedule live sessions within courses
- Auto-generate Google Meet for live sessions
- Save recording URLs after session ends

---

## 📝 Notes

- Google Calendar API has rate limits: 1,000,000 requests/day
- Each meeting creation = 1 API call
- Calendar invites are sent instantly by Google
- Reminders are handled by Google Calendar (no custom code needed)
- Service account can create up to 500 events per calendar per day
- For 15,000 users, we'd need ~30 calendars (500 events × 30 = 15,000)

**Current setup:** Single calendar, suitable for up to 500 meetings/day

**For scale:** Can programmatically create multiple calendars and load-balance event creation

---

**Document Version:** 1.0  
**Last Updated:** December 1, 2025  
**Phase Status:** ✅ IMPLEMENTATION COMPLETE - TESTING IN PROGRESS
