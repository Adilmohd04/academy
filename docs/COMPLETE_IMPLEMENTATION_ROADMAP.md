# 🚀 Complete Feature Implementation Roadmap

## 📋 Overview
This document outlines the complete implementation plan for all requested features in a structured, phase-by-phase approach.

---

## Phase 1: Razorpay Payment Integration ⭐ (Week 1-2)

### Database Schema
```sql
-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  razorpay_order_id VARCHAR(255),
  razorpay_payment_id VARCHAR(255),
  razorpay_signature VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update enrollments table
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);
```

### Backend Files to Create
```
backend/
├── src/
│   ├── config/
│   │   └── razorpay.ts (NEW)
│   ├── modules/
│   │   └── payments/
│   │       ├── controllers/
│   │       │   └── paymentController.ts (NEW)
│   │       └── services/
│   │           └── paymentService.ts (NEW)
│   └── routes/
│       └── payments.ts (NEW)
```

### API Endpoints
- `POST /api/payments/create-order` - Create Razorpay order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/user/:userId` - Payment history
- `POST /api/payments/refund/:paymentId` - Process refund

### Frontend Files to Create
```
frontend/
├── app/
│   ├── student/
│   │   ├── courses/[courseId]/enroll/page.tsx (NEW)
│   │   └── payments/page.tsx (NEW)
│   └── api/
│       └── payments/
│           ├── create-order/route.ts (NEW)
│           └── verify/route.ts (NEW)
└── components/
    └── payment/
        └── RazorpayButton.tsx (NEW)
```

### Installation
```bash
cd backend && npm install razorpay
cd frontend && # Add Razorpay script to layout
```

---

## Phase 2: Live Classes & Video Meetings ⭐ (Week 2-3)

### Database Schema
```sql
-- Enhance meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recording_url VARCHAR(500);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';

-- Meeting attendance
CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  joined_at TIMESTAMP,
  left_at TIMESTAMP,
  duration_minutes INTEGER
);
```

### API Endpoints
- `POST /api/meetings/create` - Schedule meeting
- `GET /api/meetings/:id/join-link` - Get join URL
- `POST /api/meetings/:id/attendance` - Mark attendance
- `PUT /api/meetings/:id/recording` - Add recording

### Frontend Pages
```
frontend/app/
├── teacher/
│   └── meetings/
│       ├── schedule/page.tsx (NEW)
│       └── [meetingId]/attendees/page.tsx (NEW)
└── student/
    └── meetings/
        └── page.tsx (ENHANCE)
```

---

## Phase 3: Complete Quiz System ⭐ (Week 3-4)

### Database Schema
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_id UUID REFERENCES course_weeks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  time_limit INTEGER,
  passing_score INTEGER DEFAULT 70,
  max_attempts INTEGER DEFAULT 3,
  is_published BOOLEAN DEFAULT false
);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50), -- multiple_choice, true_false, short_answer
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  student_id UUID REFERENCES profiles(id),
  answers JSONB,
  score DECIMAL(5,2),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### API Endpoints
- `POST /api/quizzes` - Create quiz
- `POST /api/quizzes/:id/questions` - Add question
- `GET /api/quizzes/:id/attempt` - Start attempt
- `POST /api/quizzes/:id/submit` - Submit answers
- `GET /api/quizzes/:id/results/:attemptId` - Get results

### Frontend Components
```
frontend/
├── app/
│   ├── teacher/courses/[courseId]/builder/
│   │   └── (Add quiz section)
│   └── student/courses/[courseId]/quizzes/
│       ├── [quizId]/page.tsx (NEW)
│       └── [quizId]/results/page.tsx (NEW)
└── components/quiz/
    ├── QuizBuilder.tsx (NEW)
    ├── QuestionBuilder.tsx (NEW)
    └── QuizTaker.tsx (NEW)
```

---

## Phase 4: Assignment System ⭐ (Week 4-5)

### Database Schema
```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_id UUID REFERENCES course_weeks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  max_points INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT false,
  file_types_allowed VARCHAR(255)
);

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  submission_text TEXT,
  file_urls JSONB,
  submitted_at TIMESTAMP DEFAULT NOW(),
  is_late BOOLEAN DEFAULT false,
  grade DECIMAL(5,2),
  feedback TEXT,
  graded_at TIMESTAMP
);
```

### API Endpoints
- `POST /api/assignments` - Create assignment
- `POST /api/assignments/:id/submit` - Submit assignment
- `GET /api/assignments/:id/submissions` - Get all submissions
- `PUT /api/assignments/submissions/:id/grade` - Grade submission

### Frontend Pages
```
frontend/app/
├── teacher/courses/[courseId]/assignments/
│   ├── create/page.tsx (NEW)
│   └── [assignmentId]/grade/page.tsx (NEW)
└── student/courses/[courseId]/assignments/
    ├── page.tsx (NEW)
    └── [assignmentId]/submit/page.tsx (NEW)
```

---

## Phase 5: Discussion Forum ⭐ (Week 5-6)

### Database Schema
```sql
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0
);

CREATE TABLE discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES discussion_replies(id),
  is_solution BOOLEAN DEFAULT false
);

CREATE TABLE discussion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID,
  reply_id UUID,
  user_id UUID REFERENCES profiles(id),
  vote_type VARCHAR(10),
  UNIQUE(user_id, discussion_id, reply_id)
);
```

### API Endpoints
- `POST /api/discussions` - Create thread
- `GET /api/courses/:courseId/discussions` - List threads
- `POST /api/discussions/:id/reply` - Add reply
- `POST /api/discussions/:discussionId/vote` - Vote
- `PUT /api/discussions/:id/pin` - Pin thread

### Frontend Pages
```
frontend/app/student/courses/[courseId]/discussions/
├── page.tsx (NEW)
├── new/page.tsx (NEW)
└── [discussionId]/page.tsx (NEW)
```

### Install Rich Text Editor
```bash
cd frontend && npm install react-quill
```

---

## Phase 6: Weekly Leaderboards ⭐ (Week 6)

### Database Schema
```sql
CREATE TABLE student_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  week_number INTEGER,
  quiz_points INTEGER DEFAULT 0,
  assignment_points INTEGER DEFAULT 0,
  participation_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  UNIQUE(student_id, course_id, week_number)
);

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  points_required INTEGER,
  badge_type VARCHAR(50)
);

CREATE TABLE student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);
```

### API Endpoints
- `GET /api/leaderboard/courses/:courseId/week/:weekNumber` - Weekly leaderboard
- `GET /api/leaderboard/courses/:courseId/overall` - Overall leaderboard
- `GET /api/leaderboard/student/:studentId/rank` - Student rank
- `POST /api/leaderboard/update-points` - Update points
- `GET /api/achievements` - All achievements
- `GET /api/students/:studentId/achievements` - Student achievements

### Frontend Pages
```
frontend/app/student/
├── courses/[courseId]/leaderboard/page.tsx (NEW)
└── profile/achievements/page.tsx (NEW)
```

---

## Phase 7: Email Notifications ⭐ (Week 7)

### Database Schema
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables JSONB
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  course_updates BOOLEAN DEFAULT true,
  assignment_reminders BOOLEAN DEFAULT true,
  quiz_reminders BOOLEAN DEFAULT true,
  meeting_reminders BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true
);

CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMP
);
```

### Email Templates to Create
```
backend/src/modules/notifications/templates/
├── welcome.html
├── course-enrollment.html
├── assignment-due.html
├── quiz-available.html
├── meeting-reminder.html
├── grade-published.html
├── payment-success.html
└── weekly-digest.html
```

### Install Email Service
```bash
cd backend && npm install @sendgrid/mail
# OR
cd backend && npm install resend
```

### Frontend Pages
```
frontend/app/student/settings/notifications/page.tsx (NEW)
```

---

## Phase 8: Teacher Payment System ⭐ (Week 7-8)

### Database Schema
```sql
CREATE TABLE teacher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  course_id UUID REFERENCES courses(id),
  payment_id UUID REFERENCES payments(id),
  amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending'
);

CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  account_details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

### API Endpoints
- `GET /api/teachers/:teacherId/earnings` - Earnings summary
- `POST /api/teachers/payouts/request` - Request payout
- `GET /api/teachers/payouts/history` - Payout history
- `GET /api/admin/payouts/pending` - Admin: pending payouts
- `PUT /api/admin/payouts/:id/approve` - Approve payout

### Frontend Pages
```
frontend/app/
├── teacher/
│   ├── earnings/page.tsx (NEW)
│   └── earnings/payout/page.tsx (NEW)
└── admin/
    └── payouts/page.tsx (NEW)
```

---

## Phase 9: Analytics Dashboard ⭐ (Week 8-9)

### Database Schema
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  event_type VARCHAR(100),
  event_data JSONB,
  course_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE course_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) UNIQUE,
  total_enrollments INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0
);
```

### API Endpoints
- `GET /api/analytics/admin/overview` - Admin dashboard
- `GET /api/analytics/teacher/:teacherId/overview` - Teacher dashboard
- `GET /api/analytics/courses/:courseId/students` - Student progress
- `GET /api/analytics/revenue/monthly` - Revenue charts
- `POST /api/analytics/track` - Track event

### Install Chart Libraries
```bash
cd frontend && npm install recharts
```

### Frontend Pages
```
frontend/app/
├── admin/analytics/page.tsx (NEW)
└── teacher/analytics/page.tsx (NEW)
```

---

## Phase 10: Student Dashboard Enhancement ⭐ (Week 9)

### Features to Add
```
frontend/app/student/dashboard/page.tsx (ENHANCE)

Dashboard Sections:
1. Welcome banner with streak counter
2. Quick stats (Courses, Hours, Certificates)
3. Continue learning cards with progress bars
4. Upcoming meetings & deadlines widget
5. Recent announcements feed
6. Leaderboard highlights (Top 5)
7. Achievement badges showcase
8. Weekly goals tracker
```

### Components to Create
```
frontend/components/dashboard/
├── ContinueLearningCard.tsx (NEW)
├── UpcomingDeadlinesWidget.tsx (NEW)
├── AnnouncementFeed.tsx (NEW)
├── StreakCounter.tsx (NEW)
├── CertificateShowcase.tsx (NEW)
└── WeeklyGoalsWidget.tsx (NEW)
```

---

## Phase 11: Mobile Responsiveness ⭐ (Week 10)

### Pages to Optimize
```
✅ All dashboards (Admin, Teacher, Student)
✅ Course builder interface
✅ Quiz taking interface
✅ Assignment submission
✅ Discussion forum
✅ Payment checkout
✅ Meeting/calendar views
✅ Resource browser
✅ Leaderboards
✅ Analytics dashboards
```

### Responsive Patterns
- Collapsible sidebar (hamburger menu)
- Stack cards vertically on mobile
- Touch-friendly buttons (min 44px)
- Horizontal scroll for tables
- Bottom sheet modals
- Sticky headers
- Pull-to-refresh
- Infinite scroll

### Testing Checklist
```
□ iPhone SE (375px)
□ iPhone 12 Pro (390px)
□ Pixel 5 (393px)
□ Samsung Galaxy S20 (360px)
□ iPad (768px)
□ iPad Pro (1024px)
```

---

## 📊 Implementation Timeline

| Phase | Feature | Duration | Priority |
|-------|---------|----------|----------|
| 1 | Razorpay Payment | 2 weeks | ⭐⭐⭐⭐⭐ |
| 2 | Live Classes | 1 week | ⭐⭐⭐⭐⭐ |
| 3 | Quiz System | 1 week | ⭐⭐⭐⭐⭐ |
| 4 | Assignment System | 1 week | ⭐⭐⭐⭐ |
| 5 | Discussion Forum | 1 week | ⭐⭐⭐⭐ |
| 6 | Leaderboards | 1 week | ⭐⭐⭐ |
| 7 | Email Notifications | 1 week | ⭐⭐⭐⭐ |
| 8 | Teacher Payments | 1 week | ⭐⭐⭐⭐ |
| 9 | Analytics | 1 week | ⭐⭐⭐ |
| 10 | Student Dashboard | 1 week | ⭐⭐⭐ |
| 11 | Mobile Responsive | 1 week | ⭐⭐⭐⭐ |

**Total Estimated Time: 10-12 weeks**

---

## 🔐 Environment Variables to Add

```bash
# backend/.env

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Email Service (Choose one)
SENDGRID_API_KEY=your_sendgrid_key
# OR
RESEND_API_KEY=your_resend_key

# Video Conferencing (Optional)
ZOOM_API_KEY=your_zoom_key
ZOOM_API_SECRET=your_zoom_secret

# Analytics (Optional)
GOOGLE_ANALYTICS_ID=your_ga_id
```

---

## 🧪 Testing Strategy

### Unit Tests
- Payment verification logic
- Quiz auto-grading
- Points calculation
- Email template rendering

### Integration Tests
- End-to-end payment flow
- Quiz submission flow
- Assignment grading workflow
- Discussion thread creation

### Manual Testing
- Payment on staging environment
- Email delivery
- Mobile responsiveness
- Cross-browser compatibility

---

## 🚨 Critical Security Checklist

```
□ Razorpay signature verification
□ File upload validation (type, size)
□ XSS prevention in rich text editor
□ SQL injection prevention (parameterized queries)
□ Rate limiting on payment endpoints
□ Encrypt sensitive payment data
□ HTTPS only for payment pages
□ CORS configuration
□ Input sanitization for all forms
□ Authentication on all protected routes
```

---

## 📈 Performance Optimization

```
□ Database indexing on foreign keys
□ Query optimization for analytics
□ Image compression and lazy loading
□ CDN for static assets
□ Caching for leaderboards
□ Pagination for large lists
□ Background jobs for emails
□ Code splitting in frontend
```

---

## 🎯 Success Metrics to Track

- Payment success rate (>95%)
- Course completion rate
- Student engagement (forum posts, quiz attempts)
- Email delivery rate (>98%)
- Page load time (<3s)
- Mobile usage percentage
- Teacher payout efficiency
- Average session duration

---

## 🔄 Deployment Checklist

```
□ Run database migrations
□ Update environment variables
□ Test payment in sandbox mode
□ Verify email templates
□ Check mobile responsiveness
□ Run security audit
□ Performance testing
□ Backup database
□ Monitor error logs
□ Set up alerts for payment failures
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Payment Issues:**
- Verify Razorpay keys
- Check signature verification
- Test with Razorpay sandbox

**Email Issues:**
- Verify API keys
- Check email queue status
- Test SMTP connection

**Performance Issues:**
- Check database indexes
- Review slow query logs
- Monitor server resources

---

**Start with Phase 1 and work sequentially. Each phase builds on the previous one.**
