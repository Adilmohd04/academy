# Topic & Description Fixes and Enhancements

## 🔴 CRITICAL ISSUES TO FIX

### 1. Topic/Description Not Saving in Teacher Availability
**Problem:** When teacher adds a slot with topic and description, clicks save, then reloads - the slot time/date is saved but topic and description are EMPTY.

**Root Cause:** Frontend is sending topic/description but backend may not be saving them, or form is not properly capturing the values.

**Fix Required:**
- [ ] Verify backend `saveSlotAvailability` is receiving topic/description in request
- [ ] Ensure database INSERT/UPSERT includes topic and description columns
- [ ] Check frontend form is properly binding input values to state
- [ ] Add console logs to track data flow from form → API → database
- [ ] Test: Add slot with topic "Quran Tafsir" → Save → Reload → Verify topic persists

---

## 📋 FEATURE REQUIREMENTS

### 2. Display Topic/Description in Student Slot Selection
**Location:** Student booking flow when selecting teacher slots

**Requirements:**
- Show topic (e.g., "Arabic Grammar")
- Show description (detailed explanation)
- Show time and date
- Show price
- Display for each available slot

**Implementation:**
- [ ] Update student slot selection API to include topic/description
- [ ] Modify frontend to display topic prominently in slot card
- [ ] Show description as expandable text or tooltip
- [ ] Format: "Teacher 1 - Arabic Grammar - Nov 23, 2:00 PM - ₹500"

---

### 3. Display Topic/Description in Payment Receipt
**Location:** Payment receipt page after successful booking

**Requirements:**
- Show complete booking details including:
  - Student name
  - Teacher name
  - Topic/heading
  - Description
  - Slot time and date
  - Payment amount
  - Transaction ID

**Implementation:**
- [ ] Update receipt generation to fetch topic from teacher_slot_availability
- [ ] Add topic and description fields to receipt template
- [ ] Ensure receipt shows: "You booked: Quran Recitation with Teacher Ahmad"
- [ ] Include full slot details in downloadable PDF receipt

---

### 4. Persist Topic/Description in Teacher Availability Form After Reload
**Location:** Teacher availability management page

**Requirements:**
- When teacher reloads the availability page
- Previously entered topics/descriptions should still be visible
- Should show in the slot configuration section
- Allow editing of existing topic/description

**Implementation:**
- [ ] Fetch existing slots with topic/description on page load
- [ ] Pre-populate form fields with saved data
- [ ] Update `getSlotAvailability` to return topic/description
- [ ] Map fetched data to slot state in frontend
- [ ] Show "Quran Tafsir" in topic field for slot that was previously configured

---

### 5. Teacher Dashboard - View Slot Details
**Location:** Teacher dashboard / main page

**Requirements:**
- Show "Current Week Availability" section
- Display list of slots teacher is available this week
- When teacher clicks a slot, show full details:
  - Topic
  - Description
  - Student capacity (e.g., "3/5 booked")
  - Time and date
  - Price
- Navigation buttons:
  - "Next Week" → Show next week's slots
  - "Previous Week" → Show last week's slots
- Each week displays selected slots with topic/description

**Implementation:**
- [ ] Create "Weekly Overview" component for teacher dashboard
- [ ] Fetch slots for current week with booking counts
- [ ] Add week navigation (prev/next buttons)
- [ ] Show slot cards with topic, capacity, time
- [ ] Click slot → Expand to show full details + edit button
- [ ] Query: `SELECT *, current_bookings, max_capacity FROM teacher_slot_availability WHERE teacher_id=X AND date BETWEEN week_start AND week_end`

---

### 6. Teacher Upload Resources - Display to ALL Students Who Booked
**Location:** Teacher meetings page, Student meetings page

**Current Issue:** Teacher uploads Google Drive link for a meeting, but needs to show to ALL students who booked that slot (not just one).

**Requirements:**
- One slot can be booked by multiple students
- Teacher uploads ONE notes_link for the slot
- ALL students who booked that slot should see the study materials
- Notes_link should be stored at slot level OR shared across bookings

**Implementation Options:**

**Option A: Store notes_link in teacher_slot_availability (RECOMMENDED)**
- [ ] Move notes_link from meeting_bookings to teacher_slot_availability
- [ ] One upload applies to entire slot → all students see it
- [ ] Migration: `ALTER TABLE teacher_slot_availability ADD COLUMN notes_link TEXT`
- [ ] Update teacher upload endpoint to save to slot table
- [ ] Student query joins with teacher_slot to fetch notes_link

**Option B: Copy notes_link to all bookings for that slot**
- [ ] Keep notes_link in meeting_bookings
- [ ] When teacher saves, update ALL bookings with same teacher_slot_id
- [ ] Query: `UPDATE meeting_bookings SET notes_link=X WHERE teacher_slot_id=Y`

**Preferred: Option A** - Single source of truth, easier to manage

---

### 7. Display Topic Instead of "One-on-One Meeting"
**Locations:**
- Student meetings page (`/student/meetings`)
- Admin pending bookings page (`/admin/meetings`)

**Current:** Shows generic "One-on-One Meeting"

**Required:** Show actual topic like "Quran Tafsir - Surah Al-Baqarah"

**Implementation:**
- [ ] Update `getStudentUpcomingMeetings` to join with teacher_slot_availability and fetch topic
- [ ] Update `getPendingMeetingsForAdmin` to include topic (already done ✅)
- [ ] Frontend: Display `meeting.topic || 'One-on-One Meeting'` as fallback
- [ ] Show description as subtitle or expandable section

---

### 8. Teacher Can Edit Topic/Description of Existing Slots
**Location:** Teacher availability page - when viewing existing slots

**Requirements:**
- Teacher clicks on a previously created slot
- Can edit topic and description
- Can also edit capacity, deadline, etc.
- Save updates to database

**Implementation:**
- [ ] Add "Edit Slot" mode to availability form
- [ ] Load slot data into form when clicked
- [ ] Update API endpoint to handle slot updates (UPSERT already exists)
- [ ] Show "Update Slot" button instead of "Add Slot" when editing
- [ ] Validate: Topic can be changed from "Arabic Grammar" to "Arabic Advanced"

---

### 9. Admin Can Delete Users
**Location:** Admin users list page (`/admin/users`)

**Requirements:**
- Admin sees list of all users (students, teachers)
- Each user has a "Delete" button
- Confirmation dialog: "Are you sure you want to delete [User Name]?"
- Deletes user from profiles table
- Handles cascade deletion (bookings, slots, etc.)

**Implementation:**
- [ ] Create DELETE endpoint: `DELETE /api/admin/users/:userId`
- [ ] Check for associated data (meetings, bookings)
- [ ] Option 1: Soft delete (set deleted=true, keep data)
- [ ] Option 2: Hard delete (remove from database with CASCADE)
- [ ] Frontend: Add delete button with confirmation modal
- [ ] Show toast: "User [name] deleted successfully"

**Database Considerations:**
```sql
-- Soft delete approach (recommended)
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP;
UPDATE profiles SET deleted_at = NOW() WHERE clerk_user_id = X;

-- Or cascade delete
DELETE FROM profiles WHERE clerk_user_id = X;
-- This will cascade delete: bookings, slots, etc. if FK constraints are set
```

---

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: CRITICAL FIXES (Do First)
1. ✅ Fix topic/description not saving in teacher availability
2. ✅ Display topic in student slot selection
3. ✅ Show topic in payment receipt
4. ✅ Persist topic/description in teacher form after reload

### Phase 2: TEACHER FEATURES
5. ✅ Teacher dashboard weekly slot overview with details
6. ✅ Teacher can edit existing slot topic/description
7. ✅ Move notes_link to slot level (shared across all students)

### Phase 3: DISPLAY IMPROVEMENTS
8. ✅ Replace "One-on-One Meeting" with actual topic everywhere
9. ✅ Show topic in admin pending bookings

### Phase 4: ADMIN FEATURES
10. ✅ Admin can delete users with confirmation

---

## 🔍 TESTING CHECKLIST

After implementation, verify:

- [ ] Teacher adds slot with topic "Quran Tafsir" → Saves → Reloads → Topic still shows ✅
- [ ] Student selects teacher → Sees topic "Arabic Grammar" with description
- [ ] Student pays → Receipt shows topic and full details
- [ ] Teacher uploads notes → ALL students in that slot see the link
- [ ] Teacher dashboard shows weekly slots with capacity "2/5 booked"
- [ ] Teacher clicks slot → Can edit topic from "Basic Arabic" to "Advanced Arabic"
- [ ] Student meetings page shows "Quran Tafsir" not "One-on-One Meeting"
- [ ] Admin can delete user → Confirmation dialog → User removed
- [ ] Week navigation works: Previous Week ← | → Next Week

---

## 📁 FILES TO MODIFY

### Backend
- `backend/src/services/teacherAvailabilityService.ts` - Save/fetch topic properly
- `backend/src/services/meetingService.ts` - Include topic in all meeting queries
- `backend/src/controllers/meetingController.ts` - Add updateSlot endpoint
- `backend/src/controllers/adminController.ts` - Add deleteUser endpoint
- `backend/src/routes/admin.ts` - Add DELETE /users/:id route
- Database migration: Move notes_link to teacher_slot_availability

### Frontend
- `frontend/app/teacher/availability/page.tsx` - Fix form binding, add edit mode
- `frontend/app/teacher/dashboard/page.tsx` - Add weekly slot overview
- `frontend/app/student/meetings/schedule/page.tsx` - Display topic in slot cards
- `frontend/app/student/meetings/page.tsx` - Show topic instead of generic title
- `frontend/app/admin/meetings/page.tsx` - Display topic in pending bookings (done ✅)
- `frontend/app/admin/users/page.tsx` - Add delete user functionality
- Receipt component - Include topic and description

---

## 🚀 READY TO START IMPLEMENTATION

Shall I proceed with Phase 1 (Critical Fixes) first?
