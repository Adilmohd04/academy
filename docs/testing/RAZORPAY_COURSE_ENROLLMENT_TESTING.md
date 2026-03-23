# Razorpay Course Enrollment Testing Guide

## Prerequisites
✅ Backend server running on port 5000
✅ Frontend server running on port 3000/3001
✅ Razorpay credentials configured in `.env`:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
✅ Database migrations applied

## Migration Steps

### 1. Apply Database Migration
```powershell
cd backend
node run-migration-direct.mjs
```

When prompted, paste the content from:
`backend/database/migrations/COMPLETE_ENROLLMENT_SYSTEM.sql`

### 2. Verify Backend Setup

Check Razorpay is installed:
```powershell
cd backend
npm list razorpay
# Should show: razorpay@2.9.6 or similar
```

### 3. Test API Endpoints

**A. Browse Published Courses**
```bash
GET http://localhost:5000/api/student/courses/published
```

**B. Get Course Details**
```bash
GET http://localhost:5000/api/student/courses/{courseId}/details
Authorization: Bearer {token}
```

**C. Check Eligibility**
```bash
GET http://localhost:5000/api/student/courses/{courseId}/eligibility
Authorization: Bearer {token}
```

**D. Create Payment Order (NEW Razorpay)**
```bash
POST http://localhost:5000/api/student/payment/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "courseId": "uuid-of-course"
}

Response:
{
  "success": true,
  "order_id": "order_xxxxx",
  "payment_id": "uuid-of-payment-record",
  "amount": 299.99,
  "currency": "INR",
  "key": "rzp_test_xxxxx"
}
```

**E. Verify Payment (After Razorpay Success)**
```bash
POST http://localhost:5000/api/student/payment/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "razorpay_order_id": "order_xxxxx",
  "razorpay_payment_id": "pay_xxxxx",
  "razorpay_signature": "signature_hash"
}

Response:
{
  "success": true,
  "payment": {
    "id": "uuid",
    "status": "completed",
    "razorpay_payment_id": "pay_xxxxx",
    ...
  }
}
```

## Frontend Integration Flow

### 1. Student Browses Courses
```
/student/courses/browse → Shows all approved courses
```

### 2. Student Views Course Details
```
/student/courses/browse/{courseId} → Shows:
- Course info
- Prerequisites (with completion status)
- Capacity check
- Enroll button
```

### 3. Payment Flow (Razorpay)

**Step 1: Create Order**
```typescript
const { getToken } = useAuth();
const token = await getToken();

const response = await api.student.createPaymentOrder(courseId, token);
const { order_id, amount, currency, key } = response.data;
```

**Step 2: Open Razorpay Checkout**
```typescript
const options = {
  key: key, // Razorpay key from backend
  amount: amount * 100, // in paise
  currency: currency,
  name: "Islamic Academy",
  description: "Course Enrollment",
  order_id: order_id,
  handler: async function (response) {
    // Step 3: Verify payment
    await api.student.verifyPayment(
      response.razorpay_order_id,
      response.razorpay_payment_id,
      response.razorpay_signature,
      token
    );
    // Redirect to enrolled courses or show success
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
```

### 4. Success Handling
After successful verification:
- Payment status updated to "completed"
- Enrollment record created automatically
- Student redirected to course content

## Database Verification

### Check Payment Records
```sql
SELECT 
  id,
  student_id,
  course_id,
  amount,
  currency,
  status,
  razorpay_order_id,
  razorpay_payment_id,
  payment_method,
  created_at,
  completed_at
FROM student_payments
ORDER BY created_at DESC;
```

### Check Enrollments Created
```sql
SELECT 
  e.id,
  e.student_id,
  c.title as course_title,
  e.status,
  e.created_at
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.student_id = 'clerk-user-id'
ORDER BY e.created_at DESC;
```

## Common Issues & Fixes

### Issue 1: "Payment verification failed"
**Cause**: Invalid signature
**Fix**: Ensure `RAZORPAY_KEY_SECRET` is correct in `.env`

### Issue 2: "Cannot find module 'razorpay'"
**Cause**: Package not installed
**Fix**: `cd backend && npm install razorpay`

### Issue 3: "Not eligible for enrollment"
**Cause**: Prerequisites not met or course full
**Fix**: Check eligibility endpoint response for details

### Issue 4: Frontend shows "Property 'student' does not exist"
**Cause**: API client not exporting properly
**Fix**: Already fixed - api object exported with student namespace

## Environment Variables Required

### Backend `.env`
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
CLERK_SECRET_KEY=...
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Testing Checklist

- [ ] Migrations applied successfully
- [ ] Razorpay package installed
- [ ] Environment variables set
- [ ] Backend server running without errors
- [ ] Frontend server running without errors
- [ ] Can browse published courses
- [ ] Can view course details with prerequisites
- [ ] Can check eligibility (shows missing prerequisites)
- [ ] Can create payment order (returns Razorpay order_id)
- [ ] Razorpay checkout opens (requires test key)
- [ ] Can verify payment signature
- [ ] Payment status updates to "completed"
- [ ] Enrollment created automatically after payment
- [ ] Can view payment history
- [ ] Can download payment slip

## Next Steps

1. **Add Razorpay Script to Frontend**
   Add to `frontend/app/layout.tsx`:
   ```tsx
   <Script src="https://checkout.razorpay.com/v1/checkout.js" />
   ```

2. **Create Enrollment Service**
   Auto-enroll student after successful payment verification

3. **Add Webhook Handler** (Optional)
   Handle Razorpay webhooks for payment status updates

4. **Testing in Production**
   - Use production Razorpay keys
   - Test with real payment amounts
   - Verify RLS policies work correctly
