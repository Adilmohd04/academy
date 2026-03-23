# Meeting Scheduling System - Database Schema

## 📋 Overview

Complete database schema for the meeting scheduling system with Razorpay payment integration.

## 🗃️ Database Tables

### 1. **blocked_dates**
Stores dates that cannot be selected for meetings (admin-configurable).

**Columns:**
- `id` (UUID) - Primary key
- `blocked_date` (DATE) - The blocked date (unique)
- `reason` (VARCHAR) - Why this date is blocked
- `is_recurring` (BOOLEAN) - True for weekly recurring blocks (e.g., every Saturday)
- `day_of_week` (INTEGER) - 0=Sunday, 1=Monday, ..., 6=Saturday
- `created_by` (UUID) - Admin who created the block
- `created_at`, `updated_at` (TIMESTAMP)

**Default Data:**
- All Saturdays (day_of_week = 6)
- All Sundays (day_of_week = 0)

---

### 2. **meeting_requests**
Initial meeting requests before payment.

**Columns:**
- `id` (UUID) - Primary key
- `student_id` (UUID) - Reference to profiles
- `student_name`, `student_email`, `student_phone` - Student details
- `course_id` (UUID) - Optional course reference
- `preferred_date` (DATE) - Requested meeting date
- `preferred_time` (TIME) - Requested meeting time
- `duration_minutes` (INTEGER) - Default 60 minutes
- `notes` (TEXT) - Additional notes from student
- `status` (VARCHAR) - pending_payment, payment_failed, paid, cancelled
- `amount` (DECIMAL) - Meeting fee
- `created_at`, `updated_at` (TIMESTAMP)

**Status Flow:**
1. `pending_payment` → Student created request
2. `paid` → Payment successful
3. `payment_failed` → Payment failed
4. `cancelled` → Request cancelled

---

### 3. **payment_records**
Razorpay payment transaction records.

**Columns:**
- `id` (UUID) - Primary key
- `meeting_request_id` (UUID) - Reference to meeting_requests
- `razorpay_order_id` (VARCHAR) - Razorpay order ID (unique)
- `razorpay_payment_id` (VARCHAR) - Razorpay payment ID (unique)
- `razorpay_signature` (VARCHAR) - Payment verification signature
- `amount` (DECIMAL) - Payment amount
- `currency` (VARCHAR) - Default 'INR'
- `status` (VARCHAR) - created, authorized, captured, failed, refunded
- `payment_method` (VARCHAR) - card, netbanking, upi, wallet
- `payment_email`, `payment_contact` (VARCHAR) - Customer details
- `payment_data` (JSONB) - Complete Razorpay response
- `paid_at` (TIMESTAMP) - Payment completion time
- `created_at`, `updated_at` (TIMESTAMP)

**Razorpay Integration:**
- Create order with `razorpay_order_id`
- Verify payment with `razorpay_signature`
- Store complete response in `payment_data` (JSONB)

---

### 4. **scheduled_meetings**
Confirmed meetings after payment and teacher assignment.

**Columns:**

**IDs & References:**
- `id` (UUID) - Primary key
- `meeting_request_id` (UUID) - Original request
- `payment_record_id` (UUID) - Payment reference
- `student_id`, `teacher_id` (UUID) - Participants
- `course_id` (UUID) - Related course

**Meeting Details:**
- `meeting_title` (VARCHAR) - Meeting title
- `meeting_description` (TEXT) - Description
- `scheduled_date` (DATE) - Final meeting date
- `scheduled_time` (TIME) - Final meeting time
- `duration_minutes` (INTEGER) - Duration
- `timezone` (VARCHAR) - Default 'Asia/Kolkata'

**Meeting Link:**
- `meeting_platform` (VARCHAR) - google_meet, zoom, teams
- `meeting_link` (TEXT) - Join URL
- `meeting_id` (VARCHAR) - Platform meeting ID
- `meeting_password` (VARCHAR) - Meeting password

**Status:**
- `status` (VARCHAR) - pending_assignment, assigned, confirmed, completed, cancelled, rescheduled

**Notifications:**
- `student_notified` (BOOLEAN) - Email sent to student
- `teacher_notified` (BOOLEAN) - Email sent to teacher
- `reminder_sent` (BOOLEAN) - Reminder sent

**Rescheduling:**
- `original_date`, `original_time` - Original schedule
- `reschedule_reason` (TEXT) - Why rescheduled
- `rescheduled_by` (UUID) - Who rescheduled
- `rescheduled_at` (TIMESTAMP) - When rescheduled

**Admin:**
- `admin_notes` (TEXT) - Internal notes
- `assigned_by` (UUID) - Admin who assigned teacher
- `assigned_at` (TIMESTAMP) - Assignment time

**Status Flow:**
1. `pending_assignment` → Payment done, waiting for teacher
2. `assigned` → Teacher assigned by admin
3. `confirmed` → Both parties confirmed
4. `completed` → Meeting finished
5. `cancelled` → Meeting cancelled
6. `rescheduled` → Date/time changed

---

### 5. **meeting_logs**
Audit trail for all meeting changes.

**Columns:**
- `id` (UUID) - Primary key
- `meeting_id` (UUID) - Reference to scheduled_meetings
- `action` (VARCHAR) - created, assigned, confirmed, rescheduled, cancelled, completed
- `performed_by` (UUID) - User who performed action
- `old_values` (JSONB) - Previous state
- `new_values` (JSONB) - New state
- `notes` (TEXT) - Additional notes
- `created_at` (TIMESTAMP)

**Tracked Actions:**
- Meeting creation
- Teacher assignment
- Date/time changes
- Status changes
- Cancellations

---

## 📊 Database Views

### student_upcoming_meetings
Shows upcoming meetings for students with teacher and course details.

### teacher_upcoming_meetings
Shows upcoming meetings for teachers with student details.

### pending_meetings_admin
Shows meetings pending teacher assignment for admin.

---

## 🔒 Security

**Row Level Security (RLS):**
- Enabled on all tables
- Service role has full access (for backend API)
- Additional policies can be added for authenticated users

---

## 🔄 Complete Meeting Flow

### 1. **Student Requests Meeting**
```sql
INSERT INTO meeting_requests (
  student_id, student_name, student_email, 
  preferred_date, preferred_time, amount, status
) VALUES (...);
```

### 2. **Payment Processing**
```sql
-- Create Razorpay order
INSERT INTO payment_records (
  meeting_request_id, razorpay_order_id, 
  amount, status
) VALUES (...);

-- After successful payment
UPDATE payment_records SET 
  razorpay_payment_id = ?, 
  razorpay_signature = ?,
  status = 'captured',
  paid_at = NOW()
WHERE razorpay_order_id = ?;

UPDATE meeting_requests SET 
  status = 'paid' 
WHERE id = ?;
```

### 3. **Create Scheduled Meeting**
```sql
INSERT INTO scheduled_meetings (
  meeting_request_id, payment_record_id,
  student_id, scheduled_date, scheduled_time,
  meeting_title, status
) VALUES (...);
-- status = 'pending_assignment'
```

### 4. **Admin Assigns Teacher**
```sql
UPDATE scheduled_meetings SET 
  teacher_id = ?,
  status = 'assigned',
  assigned_by = ?,
  assigned_at = NOW()
WHERE id = ?;
```

### 5. **Send Email Notifications**
```sql
-- Generate meeting link (Google Meet/Zoom)
UPDATE scheduled_meetings SET 
  meeting_link = ?,
  meeting_platform = 'google_meet',
  student_notified = true,
  teacher_notified = true
WHERE id = ?;

-- Log the action
INSERT INTO meeting_logs (
  meeting_id, action, performed_by
) VALUES (?, 'assigned', ?);
```

### 6. **Student/Teacher Views Meeting**
```sql
-- Student dashboard
SELECT * FROM student_upcoming_meetings 
WHERE student_id = ?;

-- Teacher dashboard
SELECT * FROM teacher_upcoming_meetings 
WHERE teacher_id = ?;
```

---

## 📅 Blocked Dates Logic

### Check if date is available:
```sql
SELECT EXISTS (
  SELECT 1 FROM blocked_dates
  WHERE blocked_date = ?
     OR (is_recurring = true AND day_of_week = EXTRACT(DOW FROM ?::date))
) AS is_blocked;
```

### Get available dates for next 30 days:
```sql
SELECT generate_series(
  CURRENT_DATE, 
  CURRENT_DATE + INTERVAL '30 days', 
  '1 day'::interval
)::date AS available_date
WHERE NOT EXISTS (
  SELECT 1 FROM blocked_dates
  WHERE blocked_date = available_date
     OR (is_recurring = true AND day_of_week = EXTRACT(DOW FROM available_date))
);
```

---

## 🎯 Indexes for Performance

All important columns are indexed:
- Date lookups (scheduled_date, preferred_date, blocked_date)
- User lookups (student_id, teacher_id)
- Status filtering
- Foreign keys

**Composite Indexes:**
- `(teacher_id, scheduled_date)` - Teacher's upcoming meetings
- `(student_id, scheduled_date)` - Student's upcoming meetings

---

## 🚀 Next Steps

1. ✅ Run `create-meeting-tables.sql` in Supabase
2. 🔄 Build Backend API endpoints
3. 💳 Integrate Razorpay payment
4. 📧 Setup email notifications
5. 🎨 Build frontend UI components

---

## 📝 Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- JSONB columns allow flexible data storage (payment_data, old_values, new_values)
- Triggers automatically update `updated_at` timestamps
- Views simplify complex queries for dashboards
- Default blocked dates include weekends (Saturdays & Sundays)

---

## 🔧 Maintenance Queries

### View all blocked dates:
```sql
SELECT * FROM blocked_dates ORDER BY blocked_date;
```

### View payment statistics:
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM payment_records
GROUP BY status;
```

### View meeting statistics:
```sql
SELECT 
  status,
  COUNT(*) as count
FROM scheduled_meetings
GROUP BY status;
```

### Upcoming meetings this week:
```sql
SELECT * FROM student_upcoming_meetings
WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY scheduled_date, scheduled_time;
```
