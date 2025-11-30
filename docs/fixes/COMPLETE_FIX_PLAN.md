# COMPLETE FIX PLAN - All Remaining Issues

## 🚨 CRITICAL FIXES NEEDED:

### 1. Run New SQL File ⚠️ PRIORITY 1
**File:** `FIX_SLOT_CAPACITY_DISPLAY.sql`

**This fixes:**
- ✅ Temporary slot reservation when student clicks
- ✅ Shows "3/4 available" capacity
- ✅ Hides full slots from student view
- ✅ Auto-releases reservations after 30 minutes if payment not completed
- ✅ Prevents double-booking race conditions

**How it works:**
1. Student clicks slot → `reserve_slot_temporarily()` → `temp_reservations++`
2. Other students see reduced availability
3. Student completes payment → `confirm_slot_reservation()` → `temp_reservations--`, `current_bookings++`
4. Student abandons → After 30 min, `cleanup_expired_reservations()` releases it

---

### 2. Backend Changes Needed

#### A. Update Meeting Request Creation
**File:** `backend/src/services/meetingService.ts`

Add before creating meeting_request:
```typescript
// Reserve slot temporarily
const { data, error } = await supabase.rpc('reserve_slot_temporarily', {
  p_slot_id: teacher_slot_id,
  p_meeting_request_id: requestId
});

if (error || !data) {
  throw new Error('Slot no longer available');
}
```

#### B. Update Payment Failure Handler
**File:** `backend/src/controllers/paymentController.ts`

When payment fails or times out:
```typescript
if (meeting_request.teacher_slot_id) {
  await supabase.rpc('release_slot_reservation', {
    p_slot_id: meeting_request.teacher_slot_id
  });
}
```

#### C. Add Cleanup Cron Job
**File:** `backend/src/server.ts`

```typescript
// Run every 10 minutes
setInterval(async () => {
  const { data } = await supabase.rpc('cleanup_expired_reservations');
  if (data > 0) {
    console.log(`🧹 Cleaned up ${data} expired reservations`);
  }
}, 10 * 60 * 1000);
```

---

### 3. Frontend Changes

#### A. Show Available Capacity
**File:** `frontend/app/student/meetings/select-teacher/page.tsx`

Update slot display:
```tsx
<div className="text-sm text-gray-600">
  {slot.is_unlimited ? (
    <span>Unlimited capacity</span>
  ) : (
    <span>
      {slot.available_spots} / {slot.max_capacity} spots available
    </span>
  )}
</div>
```

#### B. Add Back Buttons

**All pages that need back button:**
1. `/student/meetings/select-teacher/page.tsx`
2. `/student/meetings/schedule/page.tsx`
3. `/student/payment/page.tsx`
4. `/student/payment/success/page.tsx`
5. `/admin/**/page.tsx` (all admin pages)
6. `/teacher/**/page.tsx` (all teacher pages)

**Template code:**
```tsx
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  
  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      
      {/* Rest of page content */}
    </div>
  );
}
```

#### C. Use Admin-Configured Price Everywhere

**Query price from settings:**
```typescript
const { data: settings } = await fetch('/api/settings/meeting-price');
const price = settings.price; // Use this everywhere
```

**Update these files:**
1. `frontend/app/student/meetings/schedule/page.tsx` - Fetch price before showing form
2. `frontend/app/student/payment/page.tsx` - Use price from settings
3. `frontend/app/student/payment/success/page.tsx` - Display from payment record

---

### 4. Admin Portal - Box System

#### A. Update Pending Meetings View
**File:** `frontend/app/admin/meetings/pending-approval/page.tsx`

Show capacity info:
```tsx
<div className="border rounded-lg p-4">
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold">{meeting.teacher_name}</h3>
      <p className="text-sm text-gray-600">
        {meeting.student_name} • {meeting.preferred_date}
      </p>
      <p className="text-sm text-gray-600">
        {meeting.slot_name}
      </p>
    </div>
    
    <div className="text-right">
      <div className="text-sm font-medium">
        {meeting.current_bookings} / {meeting.max_capacity} booked
      </div>
      <div className="text-xs text-gray-500">
        {meeting.remaining_capacity} spots left
      </div>
      
      {meeting.is_box_full && (
        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
          ✓ Box Full - Ready to Schedule
        </span>
      )}
      
      {!meeting.is_box_full && meeting.is_unlimited && (
        <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
          ⏳ Waiting for deadline
        </span>
      )}
    </div>
  </div>
  
  <div className="mt-4 flex gap-2">
    <button 
      onClick={() => approveBox(meeting.teacher_slot_id)}
      className="px-4 py-2 bg-blue-600 text-white rounded"
      disabled={!meeting.is_box_full && !meeting.is_unlimited}
    >
      Approve & Schedule Meeting
    </button>
    
    {meeting.is_unlimited && (
      <button 
        onClick={() => forceCloseBox(meeting.teacher_slot_id)}
        className="px-4 py-2 bg-gray-600 text-white rounded"
      >
        Force Close Box Now
      </button>
    )}
  </div>
</div>
```

#### B. Add Box Approval Endpoint
**File:** `backend/src/controllers/adminController.ts`

```typescript
export const approveAndScheduleBox = async (req: Request, res: Response) => {
  const { teacher_slot_id } = req.body;
  
  // 1. Get all paid meeting requests for this slot
  const { data: meetings } = await supabase
    .from('meeting_requests')
    .select('*')
    .eq('teacher_slot_id', teacher_slot_id)
    .eq('status', 'paid');
  
  if (!meetings || meetings.length === 0) {
    return res.status(400).json({ error: 'No bookings found for this slot' });
  }
  
  // 2. Get slot details to get teacher_id
  const { data: slot } = await supabase
    .from('teacher_slot_availability')
    .select('*, profiles(*)')
    .eq('id', teacher_slot_id)
    .single();
  
  // 3. Generate meeting link (Google Meet / Zoom)
  const meetingLink = await generateMeetingLink();
  
  // 4. Update all scheduled_meetings for these requests
  for (const meeting of meetings) {
    await supabase
      .from('scheduled_meetings')
      .update({
        teacher_id: slot.teacher_id,
        meeting_link: meetingLink,
        status: 'confirmed',
        teacher_notified: false,
        student_notified: false
      })
      .eq('meeting_request_id', meeting.id);
  }
  
  // 5. Mark slot as closed
  await supabase
    .from('teacher_slot_availability')
    .update({ is_active: false })
    .eq('id', teacher_slot_id);
  
  // 6. Send batch email to all students + teacher
  await sendBatchMeetingEmails(meetings, slot, meetingLink);
  
  res.json({ 
    success: true, 
    message: `Meeting scheduled for ${meetings.length} students` 
  });
};
```

---

### 5. Email Notifications

#### A. Send Batch Email
**File:** `backend/src/services/emailService.ts`

```typescript
export async function sendBatchMeetingEmails(
  meetings: MeetingRequest[],
  slot: TeacherSlot,
  meetingLink: string
) {
  const emailPromises = [];
  
  // Email to each student
  for (const meeting of meetings) {
    emailPromises.push(
      sendEmail({
        to: meeting.student_email,
        subject: 'Meeting Confirmed - Your Slot is Ready!',
        html: `
          <h2>Your meeting has been confirmed!</h2>
          <p>Date: ${meeting.preferred_date}</p>
          <p>Time: ${slot.time_slots.start_time} - ${slot.time_slots.end_time}</p>
          <p>Teacher: ${slot.profiles.full_name}</p>
          <p><a href="${meetingLink}">Join Meeting</a></p>
        `
      })
    );
  }
  
  // Email to teacher
  emailPromises.push(
    sendEmail({
      to: slot.profiles.email,
      subject: `Meeting Scheduled - ${meetings.length} Students`,
      html: `
        <h2>New meeting scheduled!</h2>
        <p>You have ${meetings.length} students for this session:</p>
        <ul>
          ${meetings.map(m => `<li>${m.student_name} (${m.student_email})</li>`).join('')}
        </ul>
        <p>Date: ${meetings[0].preferred_date}</p>
        <p>Time: ${slot.time_slots.start_time} - ${slot.time_slots.end_time}</p>
        <p><a href="${meetingLink}">Join Meeting</a></p>
      `
    })
  );
  
  await Promise.all(emailPromises);
}
```

---

## 📋 STEP-BY-STEP EXECUTION PLAN:

### Step 1: Database (10 minutes)
1. Run `FIX_SLOT_CAPACITY_DISPLAY.sql` in Supabase
2. Verify functions created
3. Test with: `SELECT * FROM available_teacher_slots_with_capacity;`

### Step 2: Backend Updates (30 minutes)
1. Update meeting request creation to reserve slot
2. Add payment failure handler to release slot
3. Add cleanup cron job
4. Add box approval endpoint
5. Restart backend

### Step 3: Frontend Updates (45 minutes)
1. Add back buttons to all pages
2. Show capacity on slot selection
3. Fix payment redirect to use internal ID
4. Update admin pending view to show box status
5. Add box approval UI

### Step 4: Email Setup (20 minutes)
1. Verify `.env` has email credentials
2. Implement batch email function
3. Test email sending

### Step 5: Testing (30 minutes)
1. Book slot as student → Check temp reservation
2. Complete payment → Check confirmation
3. Abandon booking → Wait 30 min, check cleanup
4. Fill capacity → Check slot disappears
5. Admin approves → Check emails sent

---

## ✅ TESTING CHECKLIST:

- [ ] Run FIX_SLOT_CAPACITY_DISPLAY.sql
- [ ] Slot shows "X/Y available"
- [ ] Clicking slot reserves it temporarily
- [ ] Other students see reduced count
- [ ] Payment completes → Reservation confirmed
- [ ] Payment abandoned → Slot released after 30 min
- [ ] Full slots hidden from list
- [ ] Admin sees box status with capacity
- [ ] Box approval assigns teacher and sends emails
- [ ] Student sees meeting link after approval
- [ ] Back buttons work on all pages
- [ ] Price consistent everywhere (from admin settings)

---

## 🎯 ESTIMATED TIME:
- **Database:** 10 minutes
- **Backend:** 30 minutes
- **Frontend:** 45 minutes
- **Email:** 20 minutes
- **Testing:** 30 minutes

**Total:** ~2.5 hours

---

## 🚀 START HERE:

1. **RUN SQL FILE NOW:** `FIX_SLOT_CAPACITY_DISPLAY.sql`
2. **Test booking flow** to see capacity tracking
3. **Then implement backend changes**
4. **Then frontend UI updates**
5. **Finally email notifications**

This will complete the entire booking system with all requested features!
