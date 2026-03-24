# 🎓 Student Course Enrollment System - Quick Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    STUDENT ENROLLMENT FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. Browse Courses
   ↓
2. View Course Details + Prerequisites
   ↓
3. Check Eligibility (Prerequisites + Capacity)
   ↓
4. Create Razorpay Order
   ↓
5. Complete Payment (Razorpay Checkout)
   ↓
6. Verify Signature
   ↓
7. Auto-Enroll Student
   ↓
8. Access Course Content
```

---

## API Endpoints

### Public Endpoints (No Auth Required)
```
GET /api/student/courses/published
→ Returns all approved courses with teacher info and enrollment count
```

### Authenticated Endpoints (Require Clerk Token)

#### Course Discovery
```
GET /api/student/courses/:courseId/details
→ Course info + prerequisites + weeks + enrollment status

GET /api/student/courses/:courseId/eligibility
→ Check if student can enroll (prerequisites + capacity)

GET /api/student/courses/enrolled
→ Student's enrolled courses with progress
```

#### Payment Flow (Razorpay)
```
POST /api/student/payment/create
Body: { "courseId": "uuid" }
→ Creates Razorpay order
Response: { order_id, amount, currency, key }

POST /api/student/payment/verify
Body: { 
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_hash"
}
→ Verifies payment and creates enrollment
```

#### Payment History
```
GET /api/student/payments
→ All student payments with course details

GET /api/student/payments/:paymentId/slip
→ Payment receipt data
```

---

## Database Tables

### `courses`
```sql
id UUID PRIMARY KEY
title VARCHAR(255)
description TEXT
category VARCHAR(100)
price DECIMAL(10,2)
max_students INTEGER
teacher_id VARCHAR(255)
approval_status VARCHAR(50)  -- draft/pending_approval/approved/rejected
```

### `course_prerequisites`
```sql
id UUID PRIMARY KEY
course_id UUID → courses(id)
prerequisite_course_id UUID → courses(id)
created_at TIMESTAMPTZ
```

### `student_payments`
```sql
id UUID PRIMARY KEY
student_id VARCHAR(255)
course_id UUID → courses(id)
amount DECIMAL(10,2)
currency VARCHAR(10)
status VARCHAR(50)                -- pending/completed/failed
razorpay_order_id VARCHAR(255)
razorpay_payment_id VARCHAR(255)
razorpay_signature VARCHAR(512)
payment_method VARCHAR(50)
created_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

### `enrollments`
```sql
id UUID PRIMARY KEY
student_id VARCHAR(255)
course_id UUID → courses(id)
status VARCHAR(50)    -- active/completed/dropped
progress INTEGER      -- 0-100
enrolled_at TIMESTAMPTZ
```

---

## Frontend Components

### Course Browsing
**Path**: `/student/courses/browse`
- Shows all approved courses
- Displays price, teacher, capacity
- Search and filter options

### Course Detail Page
**Path**: `/student/courses/browse/:courseId`

**Features**:
- Course information
- Teacher profile
- Prerequisites list with completion status
- Capacity check (X/Y enrolled)
- Eligibility check
- Enroll button (disabled if ineligible)

**Components Used**:
- `IslamicCard` - Course info container
- `IslamicButton` - Enroll button
- `IslamicPageLoader` - Loading states
- `CheckCircle2` / `XCircle` - Prerequisite status icons

---

## Eligibility Logic

### Service: `enrollmentService.checkEligibility()`

**Checks**:
1. ✅ **Not Already Enrolled**: No active enrollment exists
2. ✅ **Prerequisites Met**: All prerequisite courses completed
3. ✅ **Capacity Available**: Enrolled count < max_students

**Response**:
```typescript
{
  eligible: boolean,
  reason?: string,
  missingPrerequisites?: Course[],
  capacityFull?: boolean
}
```

**Example Responses**:
```json
// Eligible
{ "eligible": true }

// Missing Prerequisites
{
  "eligible": false,
  "reason": "Missing prerequisites",
  "missingPrerequisites": [
    { "id": "uuid", "title": "Arabic 101" }
  ]
}

// Capacity Full
{
  "eligible": false,
  "reason": "Course is full",
  "capacityFull": true
}

// Already Enrolled
{
  "eligible": false,
  "reason": "Already enrolled in this course"
}
```

---

## Razorpay Integration

### Environment Variables
```env
# Backend
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret_key

# Frontend
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

### Payment Flow Code

#### 1. Create Order (Backend)
```typescript
// Service: paymentService.createPaymentOrder()
const order = await razorpay.orders.create({
  amount: Math.round(coursePrice * 100), // paise
  currency: 'INR',
  receipt: `course_${courseId.substring(0, 8)}_${Date.now()}`,
  notes: {
    course_id: courseId,
    student_clerk_id: studentId,
    payment_type: 'course_enrollment'
  }
});

await supabase.from('student_payments').insert({
  student_id: studentId,
  course_id: courseId,
  amount: coursePrice,
  razorpay_order_id: order.id,
  status: 'pending'
});
```

#### 2. Open Checkout (Frontend)
```typescript
const handleEnroll = async () => {
  const token = await getToken();
  const { data } = await api.student.createPaymentOrder(courseId, token);
  
  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: data.amount * 100,
    currency: 'INR',
    order_id: data.order_id,
    name: "Islamic Academy",
    description: `Enrollment for ${courseName}`,
    handler: async (response) => {
      await verifyAndEnroll(response);
    },
    prefill: {
      name: user.fullName,
      email: user.email
    },
    theme: {
      color: "#10b981" // islamic-emerald
    }
  };
  
  const rzp = new window.Razorpay(options);
  rzp.open();
};
```

#### 3. Verify Payment (Backend)
```typescript
// Service: paymentService.confirmPayment()
const generatedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');

if (generatedSignature !== razorpay_signature) {
  throw new Error('Invalid signature');
}

await supabase.from('student_payments').update({
  status: 'completed',
  razorpay_payment_id: razorpay_payment_id,
  razorpay_signature: razorpay_signature,
  completed_at: new Date().toISOString()
}).eq('razorpay_order_id', razorpay_order_id);

// Auto-enroll student
await enrollmentService.enrollStudent({
  course_id: courseId,
  student_id: studentId
});
```

---

## Security Policies (RLS)

### `course_prerequisites`
```sql
-- Everyone can view
FOR SELECT USING (true)

-- Teachers can manage their courses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM courses 
    WHERE id = course_prerequisites.course_id 
    AND teacher_id = auth.uid()
  )
)

-- Admins can manage all
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE clerk_user_id = auth.uid() 
    AND role = 'admin'
  )
)
```

### `student_payments`
```sql
-- Students view own payments
FOR SELECT USING (student_id = auth.uid())

-- Students create own payments
FOR INSERT WITH CHECK (student_id = auth.uid())

-- Admins view all payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE clerk_user_id = auth.uid() 
    AND role = 'admin'
  )
)
```

---

## Common Queries

### Check Course Prerequisites
```sql
SELECT 
  c.id,
  c.title,
  array_agg(
    json_build_object(
      'id', pc.id,
      'title', pc.title
    )
  ) as prerequisites
FROM courses c
LEFT JOIN course_prerequisites cp ON c.id = cp.course_id
LEFT JOIN courses pc ON cp.prerequisite_course_id = pc.id
WHERE c.id = 'course-uuid'
GROUP BY c.id, c.title;
```

### Check Student Completion
```sql
SELECT 
  e.course_id,
  c.title,
  e.status,
  e.progress
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.student_id = 'clerk-user-id'
  AND e.status = 'completed';
```

### Get Available Courses for Student
```sql
-- Courses with no prerequisites or all prerequisites met
SELECT c.*
FROM courses c
WHERE c.approval_status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM course_prerequisites cp
  WHERE cp.course_id = c.id
  AND cp.prerequisite_course_id NOT IN (
    SELECT course_id FROM enrollments
    WHERE student_id = 'clerk-user-id'
    AND status = 'completed'
  )
);
```

---

## Error Handling

### Common Errors

**1. Payment Verification Failed**
```json
{
  "success": false,
  "message": "Invalid payment signature"
}
```
**Cause**: Razorpay secret key mismatch
**Fix**: Verify `RAZORPAY_KEY_SECRET` in `.env`

**2. Not Eligible for Enrollment**
```json
{
  "success": false,
  "message": "Missing prerequisites",
  "missingPrerequisites": [...]
}
```
**Action**: Show prerequisites to student

**3. Course Full**
```json
{
  "success": false,
  "message": "Course is full",
  "capacityFull": true
}
```
**Action**: Suggest waitlist or alternative courses

**4. Already Enrolled**
```json
{
  "success": false,
  "message": "Already enrolled in this course"
}
```
**Action**: Redirect to enrolled courses

---

## Testing Scenarios

### Scenario 1: Successful Enrollment
```
1. Browse approved courses
2. Click course without prerequisites
3. Check eligibility → eligible: true
4. Click Enroll
5. Razorpay checkout opens
6. Complete payment (test mode)
7. Payment verified
8. Enrollment created
9. Redirected to course content
```

### Scenario 2: Missing Prerequisites
```
1. Browse advanced course (has prerequisites)
2. Click course
3. Prerequisites shown (some incomplete)
4. Check eligibility → eligible: false
5. Enroll button disabled
6. Show "Complete Prerequisites First" message
```

### Scenario 3: Course Full
```
1. Browse course with max_students=10
2. Check enrollment count → 10/10
3. Check eligibility → capacityFull: true
4. Enroll button disabled
5. Show "Course is Full" message
```

---

## Performance Optimizations

### Indexes Created
```sql
-- Faster prerequisite lookups
idx_course_prerequisites_course
idx_course_prerequisites_prereq

-- Faster payment queries
idx_student_payments_student
idx_student_payments_course
idx_student_payments_razorpay_order

-- Faster enrollment checks
idx_enrollments_student
idx_enrollments_course
```

### Caching Strategy (Future)
- Cache approved courses list (5 min)
- Cache course prerequisites (10 min)
- Cache enrollment counts (1 min)

---

## Monitoring & Analytics

### Key Metrics to Track
- **Conversion Rate**: Course views → Enrollments
- **Drop-off Point**: Where students abandon enrollment
- **Payment Success Rate**: Orders created → Payments completed
- **Average Time to Enroll**: Browse → Payment completion
- **Popular Courses**: Most viewed/enrolled

### Database Queries for Analytics
```sql
-- Enrollment funnel
SELECT 
  COUNT(DISTINCT course_id) as courses_viewed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as payments_initiated,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as payments_completed
FROM student_payments;

-- Popular courses
SELECT 
  c.title,
  COUNT(e.id) as enrollment_count,
  c.max_students,
  (COUNT(e.id)::float / c.max_students * 100) as capacity_percentage
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.max_students
ORDER BY enrollment_count DESC;
```

---

## Future Enhancements

1. **Waitlist System**: Add students to waitlist when course full
2. **Course Bundles**: Enroll in multiple courses at once
3. **Installment Payments**: Split payment into multiple installments
4. **Scholarships**: Apply discount codes or financial aid
5. **Prerequisites Auto-Suggest**: Recommend prerequisite courses
6. **Email Notifications**: Send enrollment confirmation emails
7. **Progress Tracking**: Show prerequisite completion progress
8. **Certificate Generation**: Auto-issue certificate on course completion

---

## Support & Troubleshooting

### Debug Checklist
- [ ] Check Razorpay keys in `.env`
- [ ] Verify migrations applied to Supabase
- [ ] Check RLS policies enabled
- [ ] Verify Clerk token in Authorization header
- [ ] Check course `approval_status = 'approved'`
- [ ] Verify student has necessary prerequisites
- [ ] Check course capacity not exceeded
- [ ] Verify Razorpay package installed

### Useful Debug Queries
```sql
-- Check payment status
SELECT * FROM student_payments 
WHERE student_id = 'clerk-user-id' 
ORDER BY created_at DESC;

-- Check enrollment status
SELECT * FROM enrollments 
WHERE student_id = 'clerk-user-id';

-- Check prerequisites
SELECT * FROM course_prerequisites 
WHERE course_id = 'course-uuid';
```

---

## Documentation Links

- **Testing Guide**: `docs/testing/RAZORPAY_COURSE_ENROLLMENT_TESTING.md`
- **Implementation Summary**: `docs/fixes/RAZORPAY_IMPLEMENTATION_SUMMARY.md`
- **Migration SQL**: `backend/database/migrations/COMPLETE_ENROLLMENT_SYSTEM.sql`
- **Razorpay Docs**: https://razorpay.com/docs/
