# Admin Meeting Configuration Guide

## 🎯 How Admin Can Configure Meeting System

### 1. **Manage Time Slots** (Add/Edit/Delete)

#### View All Time Slots:
```sql
SELECT * FROM time_slots ORDER BY display_order;
```

#### Add New Time Slot:
```sql
INSERT INTO time_slots (slot_name, start_time, end_time, duration_minutes, display_order)
VALUES ('Evening Slot', '17:00:00', '18:00:00', 60, 5);
```

#### Disable a Time Slot (Don't Delete - Keep History):
```sql
UPDATE time_slots 
SET is_active = false 
WHERE id = 'slot-id-here';
```

#### Enable a Time Slot:
```sql
UPDATE time_slots 
SET is_active = true 
WHERE id = 'slot-id-here';
```

---

### 2. **Block Entire Days**

#### Block All Sundays (Recurring):
```sql
INSERT INTO blocked_dates (blocked_date, reason, is_recurring, day_of_week)
VALUES (CURRENT_DATE, 'Sundays - Weekend', true, 0);
```

#### Block All Saturdays (Recurring):
```sql
INSERT INTO blocked_dates (blocked_date, reason, is_recurring, day_of_week)
VALUES (CURRENT_DATE, 'Saturdays - Weekend', true, 6);
```

**Day Numbers:**
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

#### Block Specific Date (Holiday):
```sql
INSERT INTO blocked_dates (blocked_date, reason)
VALUES ('2025-12-25', 'Christmas Holiday');
```

#### Unblock a Date:
```sql
DELETE FROM blocked_dates WHERE blocked_date = '2025-12-25';
```

#### Unblock Recurring Day (e.g., Allow Saturdays):
```sql
DELETE FROM blocked_dates WHERE is_recurring = true AND day_of_week = 6;
```

---

### 3. **Block Specific Time Slots on Specific Days**

#### Block "Morning Slot 1" on All Mondays:
```sql
INSERT INTO blocked_time_slots (time_slot_id, is_recurring, day_of_week, reason)
SELECT id, true, 1, 'Monday mornings reserved'
FROM time_slots 
WHERE slot_name = 'Morning Slot 1';
```

#### Block "Afternoon Slot 2" on a Specific Date:
```sql
INSERT INTO blocked_time_slots (time_slot_id, blocked_date, reason)
SELECT id, '2025-11-20'::DATE, 'Staff meeting'
FROM time_slots 
WHERE slot_name = 'Afternoon Slot 2';
```

#### Unblock a Time Slot:
```sql
DELETE FROM blocked_time_slots 
WHERE time_slot_id = 'slot-id' AND blocked_date = '2025-11-20';
```

---

### 4. **Check What's Available**

#### Check if Date is Available:
```sql
SELECT is_date_available('2025-11-15'::DATE);
```
Returns `true` if available, `false` if blocked.

#### Get Available Time Slots for a Date:
```sql
SELECT * FROM get_available_slots_for_date('2025-11-15'::DATE);
```
Returns all slots that are NOT blocked on that date.

#### View All Blocked Dates:
```sql
SELECT 
  blocked_date,
  reason,
  CASE 
    WHEN is_recurring THEN 'Every ' || 
      CASE day_of_week 
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END
    ELSE 'One-time'
  END as block_type
FROM blocked_dates
ORDER BY blocked_date;
```

---

### 5. **View Pending Meetings (Need Teacher Assignment)**

```sql
SELECT * FROM pending_meetings_admin;
```

This shows all paid meetings waiting for teacher assignment.

---

### 6. **Assign Teacher to Meeting**

```sql
UPDATE scheduled_meetings 
SET 
  teacher_id = 'teacher-clerk-id-here',
  status = 'assigned',
  assigned_by = 'admin-clerk-id-here',
  assigned_at = NOW()
WHERE id = 'meeting-id-here';
```

---

### 7. **Common Admin Tasks**

#### Get All Teachers (to assign meetings):
```sql
SELECT clerk_user_id, full_name, email 
FROM profiles 
WHERE role = 'teacher';
```

#### View Today's Meetings:
```sql
SELECT 
  sm.meeting_title,
  ts.slot_name,
  ts.start_time,
  s.full_name as student_name,
  t.full_name as teacher_name,
  sm.status
FROM scheduled_meetings sm
JOIN time_slots ts ON sm.time_slot_id = ts.id
LEFT JOIN profiles s ON sm.student_id = s.clerk_user_id
LEFT JOIN profiles t ON sm.teacher_id = t.clerk_user_id
WHERE sm.scheduled_date = CURRENT_DATE
ORDER BY ts.start_time;
```

#### Count Meetings by Status:
```sql
SELECT status, COUNT(*) as count 
FROM scheduled_meetings 
GROUP BY status;
```

#### Revenue Report:
```sql
SELECT 
  DATE(paid_at) as date,
  COUNT(*) as payments,
  SUM(amount) as total_revenue
FROM payment_records
WHERE status = 'captured'
GROUP BY DATE(paid_at)
ORDER BY date DESC;
```

---

### 8. **Modify Meeting Schedule**

#### Reschedule a Meeting:
```sql
UPDATE scheduled_meetings 
SET 
  original_date = scheduled_date,
  original_time_slot_id = time_slot_id,
  scheduled_date = '2025-11-25'::DATE,
  time_slot_id = 'new-slot-id',
  reschedule_reason = 'Teacher unavailable',
  rescheduled_by = 'admin-clerk-id',
  rescheduled_at = NOW(),
  status = 'rescheduled'
WHERE id = 'meeting-id';
```

#### Cancel a Meeting:
```sql
UPDATE scheduled_meetings 
SET 
  status = 'cancelled',
  admin_notes = 'Cancelled due to...'
WHERE id = 'meeting-id';
```

---

## 📊 Admin Dashboard Queries

### Upcoming Meetings This Week:
```sql
SELECT 
  sm.scheduled_date,
  ts.slot_name,
  s.full_name as student,
  t.full_name as teacher,
  sm.status
FROM scheduled_meetings sm
JOIN time_slots ts ON sm.time_slot_id = ts.id
LEFT JOIN profiles s ON sm.student_id = s.clerk_user_id
LEFT JOIN profiles t ON sm.teacher_id = t.clerk_user_id
WHERE sm.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY sm.scheduled_date, ts.start_time;
```

### Teachers With Most Meetings:
```sql
SELECT 
  t.full_name,
  COUNT(*) as meeting_count
FROM scheduled_meetings sm
JOIN profiles t ON sm.teacher_id = t.clerk_user_id
WHERE sm.status IN ('assigned', 'confirmed', 'completed')
GROUP BY t.full_name
ORDER BY meeting_count DESC;
```

### Most Popular Time Slots:
```sql
SELECT 
  ts.slot_name,
  ts.start_time,
  COUNT(sm.id) as booking_count
FROM time_slots ts
LEFT JOIN scheduled_meetings sm ON ts.id = sm.time_slot_id
GROUP BY ts.id, ts.slot_name, ts.start_time
ORDER BY booking_count DESC;
```

---

## 🎯 Quick Setup for New Admin

### Step 1: Create Default Time Slots (Already Done)
The system comes with 4 default slots:
- Morning Slot 1: 9:00 AM - 10:00 AM
- Morning Slot 2: 10:30 AM - 11:30 AM
- Afternoon Slot 1: 2:00 PM - 3:00 PM
- Afternoon Slot 2: 3:30 PM - 4:30 PM

### Step 2: Block Weekends (If Needed)
```sql
-- Block Saturdays
INSERT INTO blocked_dates (blocked_date, reason, is_recurring, day_of_week)
VALUES (CURRENT_DATE, 'Saturdays - Weekend', true, 6);

-- Block Sundays
INSERT INTO blocked_dates (blocked_date, reason, is_recurring, day_of_week)
VALUES (CURRENT_DATE + 1, 'Sundays - Weekend', true, 0);
```

### Step 3: Block Holidays
```sql
INSERT INTO blocked_dates (blocked_date, reason) VALUES
('2025-01-26', 'Republic Day'),
('2025-08-15', 'Independence Day'),
('2025-10-02', 'Gandhi Jayanti'),
('2025-12-25', 'Christmas');
```

### Step 4: Done! Students Can Now Schedule Meetings

---

## 💡 Pro Tips

1. **Don't Delete Time Slots** - Set `is_active = false` instead to keep history
2. **Use Recurring Blocks** - For weekly patterns (every Monday, every Friday, etc.)
3. **Check Availability First** - Use `get_available_slots_for_date()` before manual scheduling
4. **Monitor Pending Meetings** - Check `pending_meetings_admin` view daily
5. **Track Changes** - All actions are logged in `meeting_logs` table

---

## 🔧 Troubleshooting

### Students can't select any dates?
```sql
-- Check if too many dates are blocked
SELECT COUNT(*) FROM blocked_dates WHERE is_recurring = true;

-- Check specific date
SELECT is_date_available('2025-11-15'::DATE);
```

### No time slots available?
```sql
-- Check if slots are active
SELECT * FROM time_slots WHERE is_active = false;

-- Check blocked time slots
SELECT * FROM blocked_time_slots;
```

### Meeting not showing for teacher?
```sql
-- Verify teacher assignment
SELECT 
  meeting_title,
  teacher_id,
  status
FROM scheduled_meetings
WHERE id = 'meeting-id';
```
