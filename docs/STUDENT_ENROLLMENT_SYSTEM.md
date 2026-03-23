# Student Course Enrollment System - Implementation Plan

## Current Status ✅
- Browse courses page exists at `/student/courses/browse`
- Teacher sidebar updated to show "بوابة المعلم"
- Certificates removed from student sidebar
- Islamic loader implemented throughout app

## Required Implementation 🚧

### 1. Course Detail/Overview Page
**File:** `frontend/app/student/courses/browse/[courseId]/page.tsx` (CREATE)

**Features Needed:**
- Display full course details (title, description, syllabus)
- Show teacher information
- Display prerequisites list
- Check if student has completed prerequisites
  - If NOT completed → Show "Not Eligible" message with required courses
  - If completed → Allow enrollment
- Display course capacity (enrolled/max_students)
  - If FULL → Show "Course Full" message
  - Teacher can update max_students to accept more
- Display price
- "Enroll Now" button → Redirects to payment

**API Calls Needed:**
```typescript
// Get course details with prerequisites
GET /api/student/courses/{courseId}/details

// Check student eligibility
GET /api/student/courses/{courseId}/eligibility
// Returns: { eligible: boolean, missing_prerequisites: [], has_capacity: boolean }
```

### 2. Payment Flow
**File:** `frontend/app/student/courses/[courseId]/payment/page.tsx` (CREATE)

**Features:**
- Show course summary (title, price, teacher)
- Stripe payment integration
- On successful payment:
  - Create enrollment record
  - Generate payment slip
  - Redirect to "My Courses"

**API Calls:**
```typescript
// Create payment intent
POST /api/payments/create-intent
Body: { course_id, amount }

// Confirm enrollment after payment
POST /api/enrollments/create
Body: { course_id, payment_id }
```

### 3. Payment Slip Download
**File:** Update `frontend/app/student/profile/page.tsx`

**Features:**
- "Payment History" section
- List all payments with:
  - Course name
  - Amount paid
  - Date
  - Status
  - "Download Slip" button (PDF generation)

**API Calls:**
```typescript
// Get all student payments
GET /api/student/payments

// Generate payment slip PDF
GET /api/student/payments/{payment_id}/slip
// Returns: PDF file
```

### 4. My Courses (Enrolled)
**File:** `frontend/app/student/courses/page.tsx` (UPDATE)

**Features:**
- List only ENROLLED courses
- Show progress percentage
- "Start Learning" / "Continue Learning" button
- Protected - only show courses student is enrolled in

**API Calls:**
```typescript
// Get enrolled courses
GET /api/student/courses/enrolled
```

### 5. Course Learning Page (Protected)
**File:** `frontend/app/student/courses/[courseId]/learn/page.tsx` (CREATE)

**Similar to:** `/teacher/courses/[courseId]/builder` but for students

**Features:**
- Protected route (middleware check: enrolled students + teacher + admin only)
- Show course weeks and lessons
- Video player for lesson content
- Assignment submission
- Quiz taking
- Discussion forum access
- Progress tracking

**Middleware Protection:**
```typescript
// Check if user has access to course
// - Is teacher of course
// - Is admin  
// - Is enrolled student
```

### 6. Backend Routes Needed

#### Student Course Routes
**File:** `backend/src/modules/student/routes/courseRoutes.ts` (CREATE or UPDATE)

```javascript
GET    /api/student/courses/published         // List all approved courses
GET    /api/student/courses/:id/details       // Full course details
GET    /api/student/courses/:id/eligibility   // Check prerequisites & capacity
GET    /api/student/courses/enrolled          // Student's enrolled courses
POST   /api/student/courses/:id/enroll        // Enroll after payment
```

#### Payment Routes
**File:** `backend/src/modules/student/routes/paymentRoutes.ts` (CREATE)

```javascript
POST   /api/student/payments/create-intent    // Stripe payment intent
POST   /api/student/payments/confirm          // Confirm payment
GET    /api/student/payments                  // Student's payment history
GET    /api/student/payments/:id/slip         // Download PDF slip
```

#### Enrollment Service
**File:** `backend/src/modules/student/services/enrollmentService.ts` (CREATE)

```javascript
checkEligibility(studentId, courseId)
  → Check prerequisites completion
  → Check course capacity
  → Return { eligible, missing_prerequisites, has_capacity }

createEnrollment(studentId, courseId, paymentId)
  → Verify payment successful
  → Check capacity again
  → Create enrollment record
  → Send confirmation email
```

#### Payment Service
**File:** `backend/src/modules/student/services/paymentService.ts` (CREATE)

```javascript
createPaymentIntent(studentId, courseId)
  → Get course price
  → Create Stripe payment intent
  → Return client_secret

confirmPayment(paymentIntentId)
  → Verify payment with Stripe
  → Create payment record in DB
  → Generate payment slip

generatePaymentSlip(paymentId)
  → Get payment details
  → Generate PDF (use pdfkit or puppeteer)
  → Return PDF buffer
```

### 7. Database Schema Updates

#### Payments Table
```sql
CREATE TABLE IF NOT EXISTS student_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES profiles(clerk_user_id),
  course_id UUID NOT NULL REFERENCES courses(id),
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_payments_student ON student_payments(student_id);
CREATE INDEX idx_student_payments_course ON student_payments(course_id);
```

#### Course Prerequisites Table
```sql
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, prerequisite_course_id)
);
```

#### Update Courses Table
```sql
-- Add capacity field if not exists
ALTER TABLE courses ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 30;
```

### 8. Middleware Protection Update
**File:** `frontend/middleware.ts` (UPDATE)

Add route protection for course learning pages:

```typescript
if (pathname.startsWith('/student/courses/') && pathname.includes('/learn/')) {
  const courseId = pathname.split('/')[3];
  
  // Check if student is enrolled or is teacher/admin
  const hasAccess = await checkCourseAccess(userId, courseId, role);
  
  if (!hasAccess) {
    return NextResponse.redirect(new URL('/student/courses', request.url));
  }
}
```

## Implementation Priority

1. **HIGH PRIORITY** ✅ (DONE)
   - Fix sidebar labels
   - Remove certificates from student

2. **MEDIUM PRIORITY** (DO NEXT)
   - Create course detail/overview page
   - Implement eligibility checking
   - Add prerequisites table and API

3. **MEDIUM-HIGH PRIORITY**
   - Payment integration (Stripe)
   - Payment slip generation
   - Payment history page

4. **LOW-MEDIUM PRIORITY**
   - Course learning page for students
   - Route protection for enrolled-only access
   - Progress tracking

## Notes

- **Capacity Management**: Teachers can update `max_students` field in course settings
- **Prerequisites**: Check via `course_prerequisites` table join with `enrollments`
- **Payment Slips**: Store in S3 or generate on-demand as PDF
- **Route Protection**: Use middleware + API checks for double security
- **Email Notifications**: Send on successful enrollment

## Quick Commands

```bash
# Create migrations
cd backend
touch database/migrations/20260130_course_prerequisites.sql
touch database/migrations/20260130_student_payments.sql

# Create necessary files
touch frontend/app/student/courses/browse/[courseId]/page.tsx
touch frontend/app/student/courses/[courseId]/payment/page.tsx
touch frontend/app/student/courses/[courseId]/learn/page.tsx
touch backend/src/modules/student/services/enrollmentService.ts
touch backend/src/modules/student/services/paymentService.ts
touch backend/src/modules/student/routes/courseRoutes.ts
touch backend/src/modules/student/routes/paymentRoutes.ts
```
