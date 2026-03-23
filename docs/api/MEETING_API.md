# Meeting API Documentation

Complete API documentation for the Meeting Scheduling System.

## Base URL

```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a valid Clerk authentication token in the `Authorization` header:

```
Authorization: Bearer <clerk_token>
```

---

## 📅 Meeting Endpoints

### 1. Create Meeting Request

**POST** `/meetings/requests`

Create a new meeting request (before payment).

**Auth Required:** Yes (Student)

**Request Body:**
```json
{
  "student_name": "John Doe",
  "student_email": "john@example.com",
  "student_phone": "+919876543210",
  "course_id": "uuid-here",
  "preferred_date": "2025-11-15",
  "time_slot_id": "uuid-here",
  "notes": "Need help with Spring Boot",
  "amount": 999.00
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "student_id": "clerk_user_id",
  "student_name": "John Doe",
  "status": "pending_payment",
  "created_at": "2025-11-03T10:00:00Z"
}
```

---

### 2. Get Meeting Requests

**GET** `/meetings/requests?status=pending_payment&date_from=2025-11-01`

Get all meeting requests (students see only their own, admins see all).

**Auth Required:** Yes

**Query Parameters:**
- `status` - Filter by status (optional)
- `date_from` - Filter from date (optional)
- `date_to` - Filter to date (optional)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "student_id": "clerk_user_id",
    "student_name": "John Doe",
    "status": "pending_payment",
    "preferred_date": "2025-11-15",
    "amount": 999.00
  }
]
```

---

### 3. Get Scheduled Meetings

**GET** `/meetings?role=student&status=assigned`

Get scheduled meetings filtered by role.

**Auth Required:** Yes

**Query Parameters:**
- `role` - Filter by role: student/teacher/admin (optional)
- `status` - Filter by status (optional)
- `date_from` - Filter from date (optional)
- `date_to` - Filter to date (optional)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "meeting_title": "Meeting - John Doe",
    "scheduled_date": "2025-11-15",
    "status": "assigned",
    "teacher_id": "clerk_teacher_id",
    "meeting_link": "https://meet.google.com/abc-defg-hij"
  }
]
```

---

### 4. Assign Teacher to Meeting

**POST** `/meetings/:id/assign-teacher`

Assign a teacher to a pending meeting (Admin only).

**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "teacher_id": "clerk_teacher_id",
  "meeting_link": "https://meet.google.com/abc-defg-hij",
  "meeting_platform": "google_meet",
  "admin_notes": "Assigned Prof. Smith"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "status": "assigned",
  "teacher_id": "clerk_teacher_id",
  "assigned_at": "2025-11-03T10:30:00Z"
}
```

---

### 5. Reschedule Meeting

**PUT** `/meetings/:id/reschedule`

Reschedule an existing meeting.

**Auth Required:** Yes

**Request Body:**
```json
{
  "new_date": "2025-11-20",
  "new_time_slot_id": "uuid-here",
  "reason": "Student requested different time"
}
```

**Response:** 200 OK

---

### 6. Cancel Meeting

**DELETE** `/meetings/:id`

Cancel a scheduled meeting.

**Auth Required:** Yes

**Request Body:**
```json
{
  "reason": "Student cancelled due to emergency"
}
```

**Response:** 200 OK

---

### 7. Get Student's Upcoming Meetings

**GET** `/meetings/student/upcoming`

Get student's upcoming meetings (uses optimized database view).

**Auth Required:** Yes (Student)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "meeting_title": "Meeting - John Doe",
    "scheduled_date": "2025-11-15",
    "slot_name": "Morning Slot 1",
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "teacher_name": "Prof. Smith",
    "teacher_email": "smith@example.com",
    "meeting_link": "https://meet.google.com/abc",
    "status": "confirmed"
  }
]
```

---

### 8. Get Teacher's Upcoming Meetings

**GET** `/meetings/teacher/upcoming`

Get teacher's upcoming meetings (uses optimized database view).

**Auth Required:** Yes (Teacher)

**Response:** 200 OK (similar structure as student's view)

---

### 9. Get Pending Meetings (Admin)

**GET** `/meetings/admin/pending`

Get all pending meetings awaiting teacher assignment.

**Auth Required:** Yes (Admin)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "meeting_title": "Meeting - John Doe",
    "scheduled_date": "2025-11-15",
    "student_name": "John Doe",
    "student_email": "john@example.com",
    "payment_amount": 999.00,
    "paid_at": "2025-11-03T10:00:00Z",
    "status": "pending_assignment"
  }
]
```

---

## ⏰ Time Slot Endpoints

### 10. Get All Time Slots

**GET** `/time-slots?active_only=true`

Get all time slots (public endpoint).

**Auth Required:** No

**Query Parameters:**
- `active_only` - Filter only active slots (optional, default: false)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "slot_name": "Morning Slot 1",
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "duration_minutes": 60,
    "is_active": true,
    "display_order": 1
  }
]
```

---

### 11. Get Available Slots for Date

**GET** `/time-slots/available/2025-11-15`

Get available (non-blocked) time slots for a specific date.

**Auth Required:** No

**Response:** 200 OK
```json
[
  {
    "slot_id": "uuid",
    "slot_name": "Morning Slot 1",
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "duration_minutes": 60
  }
]
```

---

### 12. Check Date Availability

**GET** `/time-slots/check-date/2025-11-15`

Check if a date is available (not blocked).

**Auth Required:** No

**Response:** 200 OK
```json
{
  "date": "2025-11-15",
  "available": true
}
```

---

### 13. Check Time Slot Availability

**GET** `/time-slots/check-availability?date=2025-11-15&time_slot_id=uuid`

Check if a specific time slot is available on a date.

**Auth Required:** No

**Response:** 200 OK
```json
{
  "date": "2025-11-15",
  "time_slot_id": "uuid",
  "available": true
}
```

---

### 14. Create Time Slot

**POST** `/time-slots`

Create a new time slot (Admin only).

**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "slot_name": "Evening Slot 1",
  "start_time": "18:00:00",
  "end_time": "19:00:00",
  "duration_minutes": 60,
  "display_order": 5
}
```

**Response:** 201 Created

---

### 15. Update Time Slot

**PUT** `/time-slots/:id`

Update an existing time slot (Admin only).

**Auth Required:** Yes (Admin)

**Request Body:** (any field can be updated)
```json
{
  "slot_name": "Evening Slot 1 - Updated",
  "start_time": "18:30:00"
}
```

**Response:** 200 OK

---

### 16. Toggle Time Slot Status

**PUT** `/time-slots/:id/toggle`

Enable or disable a time slot (Admin only).

**Auth Required:** Yes (Admin)

**Request Body:**
```json
{
  "is_active": false
}
```

**Response:** 200 OK

---

### 17. Delete Time Slot

**DELETE** `/time-slots/:id`

Delete a time slot (Admin only).

**Auth Required:** Yes (Admin)

**Response:** 200 OK

---

## 🚫 Blocked Dates Endpoints

### 18. Get Blocked Dates

**GET** `/blocked-dates?start_date=2025-11-01&end_date=2025-11-30`

Get all blocked dates (Admin only).

**Auth Required:** Yes (Admin)

**Query Parameters:**
- `start_date` - Filter from date (optional)
- `end_date` - Filter to date (optional)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "blocked_date": "2025-11-25",
    "reason": "Public Holiday",
    "is_recurring": false,
    "created_by": "admin_clerk_id"
  }
]
```

---

### 19. Block Date

**POST** `/blocked-dates`

Block a specific date or recurring day (Admin only).

**Auth Required:** Yes (Admin)

**Request Body (specific date):**
```json
{
  "blocked_date": "2025-11-25",
  "reason": "Public Holiday",
  "is_recurring": false
}
```

**Request Body (recurring - block all Sundays):**
```json
{
  "reason": "Weekly Holiday",
  "is_recurring": true,
  "day_of_week": 0
}
```

**Day of Week:** 0 = Sunday, 1 = Monday, ..., 6 = Saturday

**Response:** 201 Created

---

### 20. Unblock Date

**DELETE** `/blocked-dates/:id`

Remove a blocked date (Admin only).

**Auth Required:** Yes (Admin)

**Response:** 200 OK

---

## 🚫 Blocked Time Slots Endpoints

### 21. Get Blocked Time Slots

**GET** `/blocked-time-slots`

Get all blocked time slots (Admin only).

**Auth Required:** Yes (Admin)

**Response:** 200 OK

---

### 22. Block Time Slot

**POST** `/blocked-time-slots`

Block a specific time slot on a date or day (Admin only).

**Auth Required:** Yes (Admin)

**Request Body (specific date):**
```json
{
  "time_slot_id": "uuid",
  "blocked_date": "2025-11-15",
  "reason": "Teacher unavailable",
  "is_recurring": false
}
```

**Request Body (recurring - block slot every Monday):**
```json
{
  "time_slot_id": "uuid",
  "reason": "Weekly meeting",
  "is_recurring": true,
  "day_of_week": 1
}
```

**Response:** 201 Created

---

### 23. Unblock Time Slot

**DELETE** `/blocked-time-slots/:id`

Remove a blocked time slot (Admin only).

**Auth Required:** Yes (Admin)

**Response:** 200 OK

---

## 💳 Payment Endpoints

### 24. Create Razorpay Order

**POST** `/payments/create-order`

Create a Razorpay order for payment.

**Auth Required:** Yes (Student)

**Request Body:**
```json
{
  "meeting_request_id": "uuid",
  "amount": 999.00
}
```

**Response:** 201 Created
```json
{
  "order_id": "order_abc123",
  "amount": 999.00,
  "currency": "INR",
  "payment_record_id": "uuid"
}
```

---

### 25. Verify Razorpay Payment

**POST** `/payments/verify`

Verify payment signature and create scheduled meeting.

**Auth Required:** Yes (Student)

**Request Body:**
```json
{
  "razorpay_order_id": "order_abc123",
  "razorpay_payment_id": "pay_xyz789",
  "razorpay_signature": "signature_here",
  "payment_method": "card",
  "payment_email": "john@example.com",
  "payment_contact": "+919876543210"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Payment verified successfully. Your meeting has been scheduled!",
  "payment": { },
  "meeting": { }
}
```

---

### 26. Get Payment History (Student)

**GET** `/payments/student/history`

Get student's payment history.

**Auth Required:** Yes (Student)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "amount": 999.00,
    "status": "captured",
    "paid_at": "2025-11-03T10:00:00Z",
    "meeting_requests": {
      "student_name": "John Doe",
      "preferred_date": "2025-11-15"
    }
  }
]
```

---

### 27. Get Payment Statistics (Admin)

**GET** `/payments/stats`

Get payment statistics and revenue data.

**Auth Required:** Yes (Admin)

**Response:** 200 OK
```json
{
  "totalRevenue": 25000.00,
  "totalPayments": 25,
  "todayRevenue": 2000.00,
  "pendingPayments": 3
}
```

---

## Status Values

### Meeting Request Status
- `pending_payment` - Awaiting payment
- `paid` - Payment completed
- `expired` - Request expired

### Scheduled Meeting Status
- `pending_assignment` - Awaiting teacher assignment
- `assigned` - Teacher assigned
- `confirmed` - Meeting confirmed
- `rescheduled` - Meeting rescheduled
- `completed` - Meeting completed
- `cancelled` - Meeting cancelled

### Payment Status
- `created` - Order created
- `authorized` - Payment authorized
- `captured` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request data"
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Testing with Postman

1. Set base URL: `http://localhost:5000/api`
2. Add auth header: `Authorization: Bearer <clerk_token>`
3. Set `Content-Type: application/json`

### Quick Test Flow:

1. **GET** `/time-slots/available` - Check available slots
2. **GET** `/time-slots/available/2025-11-15` - Check slots for specific date
3. **POST** `/meetings/requests` - Create meeting request
4. **POST** `/payments/create-order` - Create payment order
5. **POST** `/payments/verify` - Verify payment (creates scheduled meeting)
6. **GET** `/meetings/admin/pending` - Admin sees pending meetings
7. **POST** `/meetings/:id/assign-teacher` - Admin assigns teacher
8. **GET** `/meetings/student/upcoming` - Student sees upcoming meetings
9. **GET** `/meetings/teacher/upcoming` - Teacher sees assigned meetings

---

## Database Functions Used

The API uses these PostgreSQL functions:

- `get_available_slots_for_date(date)` - Returns non-blocked slots
- `is_date_available(date)` - Checks if date is blocked

## Database Views Used

- `student_upcoming_meetings` - Student dashboard
- `teacher_upcoming_meetings` - Teacher dashboard
- `pending_meetings_admin` - Admin pending view
- `available_time_slots` - Active slots only

---

**API Version:** 1.0.0  
**Last Updated:** November 3, 2025
