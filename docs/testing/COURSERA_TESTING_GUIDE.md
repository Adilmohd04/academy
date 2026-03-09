# Coursera-Style Features - Testing Guide

## Quick Start

### Step 1: Database Migration ⚠️ CRITICAL
**Run this SQL in Supabase SQL Editor:**
```sql
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS mentoring_text TEXT,
  ADD COLUMN IF NOT EXISTS mentoring_structured JSONB,
  ADD COLUMN IF NOT EXISTS schedule_frequency TEXT,
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS enrollment_deadline TIMESTAMP,
  ADD COLUMN IF NOT EXISTS course_format_description TEXT;
```

**Or use the migration file:**
Location: `backend/database/migrations/add_coursera_fields.sql`

### Step 2: Restart Servers
```bash
# Backend
cd backend
npm run dev

# Frontend  
cd frontend
npm run dev
```

### Step 3: Test New Features

## Test Scenarios

### Scenario 1: Pre-recorded Course
**Goal:** Test "How This Course Works" section for self-paced course

1. Login as teacher
2. Open course builder for existing course OR create new course
3. Set `course_type` = "pre-recorded"
4. Go to "About" tab
5. Scroll to **"📅 Course Format & Schedule"** section
6. Fill in:
   ```
   How This Course Works:
   "Master Islamic studies at your own pace with our comprehensive video library. Complete assignments to test your knowledge and earn your certificate."
   
   Mentoring & Support:
   "Access to instructor via Discord for questions, responses within 24 hours"
   ```
7. Save course
8. View as student (overview page)

**Expected Results:**
- ✅ "How This Course Works" shows 3 items:
  - Self-paced video lessons
  - Assignments & quizzes
  - Earn a certificate
- ✅ Mentoring section displays raw text
- ✅ NO Schedule section (pre-recorded doesn't show schedule)

### Scenario 2: Live Course with Full Schedule
**Goal:** Test complete scheduling system

1. Login as teacher
2. Create new course OR edit existing
3. Set `course_type` = "live"
4. Fill in basic details:
   ```
   Title: Advanced Quranic Tafseer
   Short Description: Weekly live sessions with Sheikh Muhammad
   Course Type: Live Sessions Only
   ```
5. In "📚 Professional Course Details":
   ```
   Estimated Hours: 40
   Course Type: live
   Start Date: 2026-02-15 10:00 AM
   ```
6. In **"📅 Course Format & Schedule"**:
   ```
   How This Course Works: 
   "Join weekly live classes every Saturday morning for 2 hours of in-depth Tafseer study with interactive discussions."
   
   Mentoring & Support:
   "Weekly Q&A after each session, WhatsApp group for peer support, office hours on Wednesdays"
   
   Class Frequency: Weekly
   Timezone: Asia/Kolkata (IST)
   Enrollment Deadline: 2026-02-10 23:59
   ```
7. Save and view overview

**Expected Results:**
- ✅ "How This Course Works" shows:
  - Live weekly classes
  - Interactive Q&A
  - Structured progression
  - Yellow note: "Schedule may evolve"
- ✅ Schedule section visible with:
  - Start Date: Saturday, February 15, 2026
  - Frequency: Weekly
  - Duration: X weeks
  - Timezone: Asia/Kolkata (IST)
  - Enrollment Deadline: Feb 10, 2026
- ✅ Mentoring section displays text

### Scenario 3: Hybrid Course (Best of Both)
**Goal:** Test hybrid format with both pre-recorded + live

1. Create/edit course with `course_type` = "hybrid"
2. Fill schedule fields:
   ```
   How This Course Works:
   "Combine self-paced video modules with weekly live discussion sessions. Best of both worlds!"
   
   Class Frequency: Twice-weekly
   Timezone: UTC
   Start Date: 2026-03-01 09:00 AM
   ```
3. View overview

**Expected Results:**
- ✅ "How This Course Works" shows:
  - Live weekly classes
  - Interactive Q&A
  - Structured progression
  - **Flexible learning** (hybrid-specific)
- ✅ Schedule section visible
- ✅ Both pre-recorded and live features mentioned

### Scenario 4: Custom Format Description
**Goal:** Test override of default "How it Works" text

1. Edit any course
2. In "How This Course Works" textarea, enter:
   ```
   This unique course combines traditional Islamic pedagogy with modern online learning. 
   
   You'll engage in:
   - Daily Quranic recitation practice
   - Weekly group discussions
   - Monthly one-on-one sessions with instructor
   - Continuous assessment through micro-quizzes
   ```
3. Save and view

**Expected Results:**
- ✅ Overview shows YOUR custom text instead of default bullets
- ✅ Text formatted properly with line breaks

### Scenario 5: Mentoring Structured Data (Manual Entry)
**Goal:** Test structured mentoring display

**Note:** AI normalization not yet implemented. For now, manually add via SQL:

```sql
UPDATE courses
SET mentoring_structured = '{
  "frequency": "weekly",
  "format": "Q&A",
  "flexibility": "on-demand"
}'::jsonb
WHERE id = 'YOUR_COURSE_ID';
```

**Expected Results:**
- ✅ Mentoring section shows:
  - Weekly doubt-clearing sessions
  - Q&A format
  - Additional sessions on-demand

### Scenario 6: Curriculum Tab (Modules Only)
**Goal:** Test simplified module view

1. View any course overview as student
2. Click **"Curriculum"** tab
3. View module list

**Expected Results:**
- ✅ Header shows: "X modules • Y lessons"
- ✅ Expandable module cards
- ✅ Each module shows description
- ✅ Lessons listed when expanded
- ✅ Clean, no over-promising
- ✅ NOT showing total lesson count prominently (Udemy style)

### Scenario 7: Timezone Display
**Goal:** Verify international timezone support

1. Create course with timezone = "America/New_York" (EST)
2. View overview

**Expected Results:**
- ✅ Schedule section shows: "Timezone: America/New_York"
- ✅ Enrollment deadline shows in correct timezone

## Visual Verification Checklist

### Hero Section:
- [ ] Gradient background (teal → emerald → cyan)
- [ ] Category + Level badges
- [ ] Large bold title
- [ ] Short description
- [ ] Rating stars + review count
- [ ] Student enrollment count
- [ ] Language indicator
- [ ] Tag pills

### Section 4: How This Course Works
- [ ] Gradient background (teal-50 to emerald-50)
- [ ] Sparkles icon in header
- [ ] Dynamic content based on course_type
- [ ] Icons for each feature
- [ ] Yellow note for live/hybrid about schedule changes

### Section 5: Curriculum
- [ ] Module count displayed
- [ ] Expandable cards with gray background
- [ ] Module description visible
- [ ] Lessons listed with icons
- [ ] Clean, professional layout

### Section 6: Schedule (Live/Hybrid Only)
- [ ] Only visible for live/hybrid courses
- [ ] Blue icon for each field
- [ ] 2-column grid layout
- [ ] Formatted dates
- [ ] Timezone displayed

### Section 7: Instructors
- [ ] Avatar or gradient circle with initial
- [ ] Name in large, bold font
- [ ] Title in teal color
- [ ] Bio paragraph
- [ ] Email link (if present)

### Section 8: Mentoring
- [ ] Purple icon
- [ ] Displays structured data if available
- [ ] Falls back to raw text
- [ ] Checkmark icons for each point

## API Endpoint Testing

### Test getCourseOverview Returns New Fields
```bash
curl -X GET \
  'http://localhost:5000/api/student/courses/COURSE_ID/overview' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Check Response Contains:**
```json
{
  "mentoring_text": "...",
  "mentoring_structured": {...},
  "schedule_frequency": "weekly",
  "schedule_timezone": "UTC",
  "enrollment_deadline": "2026-02-10T23:59:59Z",
  "course_format_description": "..."
}
```

### Test Course Update with New Fields
```bash
curl -X PUT \
  'http://localhost:5000/api/teacher/courses/COURSE_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "mentoring_text": "Weekly doubt solving",
    "schedule_frequency": "weekly",
    "schedule_timezone": "Asia/Kolkata"
  }'
```

**Expected:** 200 OK with updated course

## Browser Console Checks

### No Errors:
Open browser console (F12) while viewing overview page.

**Expected:**
- ✅ No errors related to missing fields
- ✅ No "Cannot read property of undefined"
- ✅ React renders without warnings

### Network Tab:
Check `/overview` API call response:

**Expected:**
- ✅ Status: 200 OK
- ✅ Response includes all new Coursera fields
- ✅ No 500 errors

## Edge Cases to Test

### Edge Case 1: Course with No Mentoring
- Don't fill mentoring fields
- Expected: Mentoring section doesn't appear

### Edge Case 2: Pre-recorded with Schedule Fields
- Set course_type = "pre-recorded"
- Fill schedule fields anyway
- Expected: Schedule fields saved but NOT displayed in overview

### Edge Case 3: Missing Timezone
- Create live course without setting timezone
- Expected: Defaults to "UTC"

### Edge Case 4: Past Enrollment Deadline
- Set enrollment deadline to yesterday
- Expected: Still displays, may want to add logic to show "Enrollment closed"

### Edge Case 5: Very Long Mentoring Text
- Enter 500+ words in mentoring text
- Expected: Displays fully without breaking layout

## Mobile Responsiveness

Test on mobile viewport (Chrome DevTools):

### Checklist:
- [ ] Hero section stacks properly
- [ ] Enrollment card moves below content
- [ ] Schedule grid becomes single column
- [ ] Curriculum modules expand correctly
- [ ] Text remains readable (no overflow)

## Performance Testing

### Page Load Speed:
- Overview page should load < 2 seconds
- No layout shift after data loads
- Images lazy-load properly

### Expandable Sections:
- Module expansion smooth (no lag)
- Icons transition properly
- No flickering

## Success Criteria ✅

### Must Have:
- [x] All 8 Coursera-style sections implemented
- [x] Dynamic "How it Works" based on course_type
- [x] Schedule section conditional on live/hybrid
- [x] Mentoring display (with fallback)
- [x] Module-only curriculum
- [x] Professional instructor cards
- [x] All fields save to database
- [x] All fields fetch in overview API

### Should Have:
- [ ] Database migration run successfully
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All timezones work
- [ ] Custom format descriptions override defaults

### Nice to Have:
- [ ] AI normalization of mentoring text
- [ ] Automatic timezone conversion
- [ ] Enrollment deadline warning
- [ ] Progress indicators in curriculum

## Troubleshooting

### Issue: Schedule section not showing
**Solution:** Check course_type = 'live' or 'hybrid'

### Issue: Mentoring section not showing
**Solution:** Add mentoring_text or mentoring_structured

### Issue: "Column does not exist" error
**Solution:** Run database migration SQL

### Issue: Undefined fields in console
**Solution:** Update backend getCourseOverview to include new fields in SELECT

### Issue: Builder fields not saving
**Solution:** Verify CreateCourseInput interface updated

## Next Steps After Testing

1. ✅ Verify all test scenarios pass
2. Run database migration in production
3. Test with real course data
4. Optional: Implement AI normalization for mentoring
5. Optional: Add timezone conversion logic
6. Deploy to production

---

**Testing Status:** Ready for comprehensive testing
**Migration Status:** SQL ready, awaiting execution
**Implementation Status:** Complete for frontend & backend
**AI Integration:** Pending (structure ready)
