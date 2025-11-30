# Teacher Availability & Capacity Scheduling System 🎓

## 📋 Overview

This is a sophisticated scheduling system where:
- **Teachers** mark their weekly availability and set capacity per slot
- **Students** see real-time slot availability with capacity tracking
- **Admin** approves bookings before sending emails
- **System** automatically tracks capacity (3 → 2 → 1 → FULL)

---

## 🗄️ Database Schema

### 1. **teacher_weekly_availability**
Teachers mark which days they're available each week.

```sql
teacher_id: TEXT             -- Clerk user ID
week_start_date: DATE        -- Monday of the week
day_of_week: INTEGER         -- 1=Mon, 2=Tue, ..., 7=Sun
is_available: BOOLEAN        -- Available on this day?
notes: TEXT
```

**Example:**
- Teacher marks: Week Nov 4-10
  - Monday: ✅ Available
  - Tuesday: ❌ Not available
  - Thursday: ✅ Available
  - Friday: ✅ Available

---

### 2. **teacher_slot_availability**
Teachers set availability for specific time slots with capacity.

```sql
teacher_id: TEXT                 -- Clerk user ID
date: DATE                       -- Specific date (e.g., Nov 4, 2025)
time_slot_id: UUID               -- Reference to time_slots table
max_capacity: INTEGER            -- 1, 5, 10, 999 (unlimited)
current_bookings: INTEGER        -- Auto-tracked by system
is_unlimited: BOOLEAN            -- true if unlimited capacity
booking_deadline_date: DATE      -- Bookings close on this date
booking_deadline_time: TIME      -- Bookings close at this time
is_available: BOOLEAN
```

**Example:**
- Teacher sets for Monday Nov 4, 2025:
  - 10:00 AM slot: **5 students max**, deadline: Nov 2
  - 2:00 PM slot: **1 student max**, deadline: Nov 3
  - 4:00 PM slot: **Unlimited students**, no deadline

---

### 3. **meeting_bookings**
Students book slots (with payment and approval workflow).

```sql
student_id: TEXT
teacher_slot_id: UUID            -- Links to teacher_slot_availability
payment_status: TEXT             -- pending, paid, failed
approval_status: TEXT            -- pending, approved, rejected
approved_by: TEXT                -- Admin who approved
meeting_link: TEXT               -- Generated after approval
status: TEXT                     -- reserved, confirmed, cancelled
student_email_sent: BOOLEAN
teacher_email_sent: BOOLEAN
```

---

## 🔄 System Workflows

### **A. Teacher Dashboard - Set Availability**

#### Step 1: Weekly Availability
```
Teacher navigates to: /teacher/availability

UI shows:
┌─────────────────────────────────┐
│  Week: Nov 4 - Nov 10, 2025    │
│                                 │
│  ☑ Monday                       │
│  ☐ Tuesday                      │
│  ☐ Wednesday                    │
│  ☑ Thursday                     │
│  ☑ Friday                       │
│  ☐ Saturday                     │
│  ☐ Sunday                       │
│                                 │
│  [Previous Week] [Next Week]   │
└─────────────────────────────────┘
```

**API Endpoint:**
```typescript
POST /api/teacher/availability/weekly
Body: {
  week_start_date: "2025-11-04",
  availability: [
    { day: 1, available: true },   // Monday
    { day: 4, available: true },   // Thursday
    { day: 5, available: true }    // Friday
  ]
}
```

---

#### Step 2: Set Time Slots & Capacity
```
Teacher clicks on Monday Nov 4:

┌─────────────────────────────────┐
│  Monday, Nov 4, 2025            │
│                                 │
│  Available Time Slots:          │
│                                 │
│  ☑ 10:00 AM - 11:00 AM          │
│     Capacity: [5] students      │
│     Deadline: [Nov 2, 11:59 PM] │
│                                 │
│  ☑ 2:00 PM - 3:00 PM            │
│     Capacity: [1] student       │
│     Deadline: [Nov 3, 11:59 PM] │
│                                 │
│  ☑ 4:00 PM - 5:00 PM            │
│     Capacity: [Unlimited]       │
│     Deadline: [No deadline]     │
│                                 │
│  [Add Slot] [Save Changes]      │
└─────────────────────────────────┘
```

**API Endpoint:**
```typescript
POST /api/teacher/availability/slots
Body: {
  date: "2025-11-04",
  slots: [
    {
      time_slot_id: "uuid-1",
      max_capacity: 5,
      is_unlimited: false,
      booking_deadline_date: "2025-11-02",
      booking_deadline_time: "23:59:00"
    },
    {
      time_slot_id: "uuid-2",
      max_capacity: 1,
      is_unlimited: false,
      booking_deadline_date: "2025-11-03"
    },
    {
      time_slot_id: "uuid-3",
      max_capacity: 999,
      is_unlimited: true,
      booking_deadline_date: null
    }
  ]
}
```

---

### **B. Student Dashboard - Book Meeting**

#### Step 1: Select Teacher
```
Student navigates to: /student/schedule-meeting

┌─────────────────────────────────┐
│  Select Teacher:                │
│                                 │
│  ○ John Smith (Math)            │
│  ● Sarah Johnson (Physics)      │
│  ○ Mike Brown (Chemistry)       │
│                                 │
│  [Next]                         │
└─────────────────────────────────┘
```

**API Call:**
```typescript
GET /api/teachers?has_availability=true
Response: [
  { id: "clerk-id-1", name: "John Smith", ... },
  { id: "clerk-id-2", name: "Sarah Johnson", ... }
]
```

---

#### Step 2: Select Date
```
After selecting teacher Sarah Johnson:

┌─────────────────────────────────┐
│  Available Dates for Sarah:     │
│                                 │
│  November 2025                  │
│  ─────────────────────────      │
│  Mon  Tue  Wed  Thu  Fri        │
│   4    -    -    7    8         │ <- Only these dates clickable
│  11    -    -   14   15         │
│                                 │
│  - = Not available              │
└─────────────────────────────────┘
```

**API Call:**
```typescript
GET /api/teacher/clerk-id-2/available-dates?month=2025-11
Response: {
  available_dates: [
    "2025-11-04", "2025-11-07", "2025-11-08",
    "2025-11-11", "2025-11-14", "2025-11-15"
  ]
}
```

---

#### Step 3: Select Time Slot (with Real-Time Capacity)
```
After selecting Monday Nov 4:

┌─────────────────────────────────┐
│  Monday, Nov 4, 2025            │
│                                 │
│  ✅ 10:00 AM - 11:00 AM          │
│     💺 3 spots remaining         │
│     ⏰ Booking closes: Nov 2     │
│     [Book This Slot]            │
│                                 │
│  ✅ 2:00 PM - 3:00 PM            │
│     💺 1 spot remaining          │
│     ⏰ Booking closes: Nov 3     │
│     [Book This Slot]            │
│                                 │
│  ✅ 4:00 PM - 5:00 PM            │
│     💺 Unlimited spots           │
│     [Book This Slot]            │
│                                 │
│  ❌ 6:00 PM - 7:00 PM            │
│     🚫 FULLY BOOKED              │
│                                 │
│  ⏱️ 8:00 PM - 9:00 PM           │
│     🔒 Booking closed (past     │
│        deadline: Nov 1)         │
└─────────────────────────────────┘
```

**API Call:**
```typescript
GET /api/teacher/clerk-id-2/available-slots?date=2025-11-04
Response: {
  slots: [
    {
      id: "slot-uuid-1",
      time: "10:00 AM - 11:00 AM",
      max_capacity: 5,
      current_bookings: 2,
      slots_remaining: 3,
      booking_open: true,
      deadline: "2025-11-02T23:59:59"
    },
    {
      id: "slot-uuid-2",
      time: "2:00 PM - 3:00 PM",
      max_capacity: 1,
      current_bookings: 0,
      slots_remaining: 1,
      booking_open: true
    },
    {
      id: "slot-uuid-3",
      time: "4:00 PM - 5:00 PM",
      is_unlimited: true,
      slots_remaining: 999,
      booking_open: true
    },
    {
      id: "slot-uuid-4",
      time: "6:00 PM - 7:00 PM",
      max_capacity: 3,
      current_bookings: 3,
      slots_remaining: 0,
      booking_open: false  // FULL
    },
    {
      id: "slot-uuid-5",
      time: "8:00 PM - 9:00 PM",
      booking_open: false,  // Past deadline
      deadline_passed: true
    }
  ]
}
```

---

#### Step 4: Fill Form & Payment
```
Student fills form:
- Course: Physics 101
- Phone: +91 1234567890
- Notes: "Need help with quantum mechanics"

Proceeds to payment:
Amount: ₹500 (from system_settings)

On successful payment:
1. Create record in meeting_bookings
2. payment_status = 'paid'
3. approval_status = 'pending'
4. Trigger increments current_bookings automatically
5. Show success message: "Booking reserved! Awaiting admin approval."
```

**API Call:**
```typescript
POST /api/bookings
Body: {
  teacher_slot_id: "slot-uuid-1",
  course_id: "course-uuid",
  phone: "+91 1234567890",
  notes: "Need help with quantum mechanics",
  payment_id: "razorpay_order_123",
  payment_amount: 500
}

Response: {
  booking_id: "booking-uuid-123",
  status: "reserved",
  approval_status: "pending",
  message: "Booking reserved! Awaiting admin approval."
}
```

---

### **C. Admin Dashboard - Approve Bookings**

```
Admin navigates to: /admin/meetings/pending-approval

┌─────────────────────────────────────────────────────┐
│  Pending Bookings (3)                               │
│                                                     │
│  📅 Nov 4, 10:00 AM - Student: John Doe            │
│     Teacher: Sarah Johnson | Course: Physics 101   │
│     Payment: ✅ ₹500 paid                           │
│     Notes: "Need help with quantum mechanics"      │
│     [✅ Approve] [❌ Reject]                        │
│                                                     │
│  📅 Nov 4, 2:00 PM - Student: Jane Smith           │
│     Teacher: Sarah Johnson | Course: Physics 101   │
│     Payment: ✅ ₹500 paid                           │
│     [✅ Approve] [❌ Reject]                        │
│                                                     │
│  📅 Nov 7, 4:00 PM - Student: Bob Wilson           │
│     Teacher: John Smith | Course: Math 101         │
│     Payment: ✅ ₹500 paid                           │
│     [✅ Approve] [❌ Reject]                        │
└─────────────────────────────────────────────────────┘
```

**When Admin Clicks "Approve":**

```typescript
POST /api/admin/bookings/booking-uuid-123/approve
Body: {
  meeting_link: "https://meet.google.com/abc-defg-hij"  // Generated
}

Backend Actions:
1. Update booking:
   - approval_status = 'approved'
   - status = 'confirmed'
   - approved_by = admin_clerk_id
   - meeting_link = generated_link
   - approval_date = NOW()

2. Send Email to Student:
   Subject: "✅ Your Meeting is Confirmed!"
   Body:
   "Hi John Doe,
   
   Your meeting has been approved!
   
   📅 Date: Monday, Nov 4, 2025
   ⏰ Time: 10:00 AM - 11:00 AM
   👩‍🏫 Teacher: Sarah Johnson
   📚 Course: Physics 101
   
   🔗 Meeting Link: https://meet.google.com/abc-defg-hij
   
   ⏰ Reminder: You'll receive another email 1 hour before the meeting.
   
   See you there!
   "
   
3. Send Email to Teacher:
   Subject: "📚 New Meeting Scheduled"
   Body:
   "Hi Sarah Johnson,
   
   A new meeting has been scheduled with you!
   
   📅 Date: Monday, Nov 4, 2025
   ⏰ Time: 10:00 AM - 11:00 AM
   👨‍🎓 Student: John Doe
   📧 Email: john@example.com
   📱 Phone: +91 1234567890
   📚 Course: Physics 101
   
   📝 Student Notes: Need help with quantum mechanics
   
   🔗 Meeting Link: https://meet.google.com/abc-defg-hij
   
   Please join 5 minutes early.
   "

4. Update email flags:
   - student_email_sent = true
   - teacher_email_sent = true
```

---

## 📊 Real-Time Capacity Tracking

### Database Triggers (Automatic)

```sql
-- When booking is created with payment_status='paid':
current_bookings = current_bookings + 1

-- When booking status changes to 'cancelled':
current_bookings = current_bookings - 1
```

### Example Flow:

**Initial State:**
- Slot: Monday 10 AM, max_capacity: 5, current_bookings: 0

**Student 1 books & pays:**
- current_bookings: 0 → 1
- slots_remaining: 5 - 1 = **4**

**Student 2 books & pays:**
- current_bookings: 1 → 2
- slots_remaining: 5 - 2 = **3**

**Student 3 books & pays:**
- current_bookings: 2 → 3
- slots_remaining: 5 - 3 = **2**

**Student 4 books & pays:**
- current_bookings: 3 → 4
- slots_remaining: 5 - 4 = **1**

**Student 5 books & pays:**
- current_bookings: 4 → 5
- slots_remaining: 5 - 5 = **0** ❌ **FULL**

**Student 6 tries to book:**
- Booking form shows: "🚫 FULLY BOOKED"
- Cannot proceed

---

## 🔍 Database Queries

### Get Available Slots for Student
```sql
SELECT * FROM available_slots_view
WHERE teacher_id = 'clerk-teacher-id'
  AND date = '2025-11-04'
  AND has_capacity = true
  AND booking_open = true;
```

### Get Teacher's Bookings
```sql
SELECT 
  mb.*,
  ts.slot_name,
  ts.start_time,
  ts.end_time
FROM meeting_bookings mb
JOIN teacher_slot_availability tsa ON mb.teacher_slot_id = tsa.id
JOIN time_slots ts ON tsa.time_slot_id = ts.id
WHERE mb.teacher_id = 'clerk-teacher-id'
  AND mb.meeting_date >= CURRENT_DATE
ORDER BY mb.meeting_date, ts.start_time;
```

### Get Admin Pending Approvals
```sql
SELECT 
  mb.*,
  p.full_name as teacher_name,
  ts.slot_name,
  ts.start_time,
  ts.end_time
FROM meeting_bookings mb
JOIN profiles p ON mb.teacher_id = p.clerk_user_id
JOIN teacher_slot_availability tsa ON mb.teacher_slot_id = tsa.id
JOIN time_slots ts ON tsa.time_slot_id = ts.id
WHERE mb.approval_status = 'pending'
  AND mb.payment_status = 'paid'
ORDER BY mb.created_at ASC;
```

---

## 🎯 Implementation Steps

### Phase 1: Database Setup
- [ ] Run `add-system-settings.sql` in Supabase
- [ ] Verify tables created successfully
- [ ] Test triggers work correctly

### Phase 2: Teacher Availability UI
- [ ] Create `/teacher/availability` page
- [ ] Weekly calendar with checkboxes
- [ ] Slot selection with capacity input
- [ ] Deadline picker
- [ ] Save functionality

### Phase 3: Student Booking UI
- [ ] Update `/student/schedule-meeting`
- [ ] Teacher selection dropdown
- [ ] Dynamic date availability
- [ ] Real-time slot capacity display
- [ ] Booking deadline warnings

### Phase 4: Backend APIs
- [ ] `POST /api/teacher/availability/weekly`
- [ ] `POST /api/teacher/availability/slots`
- [ ] `GET /api/teacher/:id/available-dates`
- [ ] `GET /api/teacher/:id/available-slots`
- [ ] `POST /api/bookings`
- [ ] `GET /api/admin/bookings/pending`
- [ ] `POST /api/admin/bookings/:id/approve`

### Phase 5: Admin Approval System
- [ ] Create `/admin/meetings/pending-approval`
- [ ] List pending bookings
- [ ] Approve/Reject buttons
- [ ] Meeting link generation (Google Meet API)
- [ ] Email sending on approval

### Phase 6: Email Notifications
- [ ] Student confirmation email template
- [ ] Teacher notification email template
- [ ] 1-hour reminder email (scheduled job)
- [ ] Integrate with emailService

---

## 🚨 Edge Cases to Handle

1. **Deadline Passed:**
   - Show "Booking closed" for slots past deadline
   - Prevent API calls for closed slots

2. **Capacity Full:**
   - Show "FULLY BOOKED" when current_bookings >= max_capacity
   - Disable booking button

3. **Payment Pending:**
   - If student pays but admin rejects: Issue refund
   - If payment pending for 24 hours: Auto-cancel & release slot

4. **Teacher Cancels Slot:**
   - If teacher removes availability after bookings exist
   - Admin must manually reassign or refund students

5. **Multiple Students Book Simultaneously:**
   - Use database transactions to prevent overbooking
   - Lock row when checking/updating current_bookings

---

## 📝 TODO List Updates

Update your main TODO list:

```markdown
- [ ] Teacher Availability System
  - Create teacher dashboard for marking weekly availability
  - Time slot selection with capacity management (1, 5, unlimited students)
  - Booking deadline configuration (e.g., close 2 days before)
  - Real-time capacity tracking

- [ ] Student Booking with Real-Time Capacity
  - Show only available teachers
  - Display available dates dynamically
  - Show time slots with capacity info ("3 spots remaining", "FULL")
  - Prevent booking past deadline or full slots

- [ ] Admin Approval Workflow
  - List pending bookings (payment_status='paid', approval_status='pending')
  - Approve/Reject with one click
  - Generate meeting links on approval
  - Send emails to student and teacher automatically
```

---

**Ready to implement?** This is the complete system architecture! 🚀

Let me know which phase you want to start with!
