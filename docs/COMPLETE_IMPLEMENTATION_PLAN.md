# 🎯 COMPLETE LMS ENHANCEMENT IMPLEMENTATION PLAN

**Document Version:** 1.0  
**Date Created:** January 12, 2026  
**Status:** Planning Phase  
**Estimated Duration:** 4-5 Weeks (30-35 hours)

---

## 📚 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [What's Already Built](#whats-already-built)
3. [New Features to Build](#new-features-to-build)
4. [Implementation Phases](#implementation-phases)
5. [Technical Specifications](#technical-specifications)
6. [Progress Tracking](#progress-tracking)
7. [Questions & Clarifications](#questions--clarifications)

---

## 🎓 PROJECT OVERVIEW

### **Goal**
Enhance the existing Islamic Learning Management System with:
- Secure access control
- Multi-language video support (Tamil, English, Arabic)
- Enhanced discussion forum with @mentions
- In-app toast notifications
- Final exam system
- Comprehensive grading system
- Resource management
- Certificate viewing
- Cascade delete with data retention

### **Technology Stack**
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** Next.js 14 + React + TypeScript + Tailwind CSS
- **Database:** PostgreSQL (Supabase)
- **Storage:** Supabase Storage
- **Auth:** Clerk
- **Email:** NodeMailer (Gmail SMTP)
- **Notifications:** React Hot Toast + Custom notification system

---

## ✅ WHAT'S ALREADY BUILT

### **Backend APIs (Complete)**
- ✅ Authentication (Clerk integration)
- ✅ Course Management (16 Teacher APIs)
- ✅ Quiz System (create, take, auto-grade)
- ✅ Assignment System (create, submit, grade)
- ✅ Enrollment System (enroll, track progress)
- ✅ Certificate Generation (PDF with QR code)
- ✅ Payment Integration (Razorpay)
- ✅ Email Service (class reminders)
- ✅ Live Session Management

### **Frontend Pages (Complete)**
- ✅ Teacher: Courses, Course Builder, Quizzes, Assignments, Live Classes
- ✅ Student: My Courses, Course Player, Quiz Taking, Assignment Submission
- ✅ Admin: User Management, Course Approval

### **Database Tables (Existing)**
- ✅ users, profiles, courses, enrollments
- ✅ course_weeks, course_lessons, live_sessions
- ✅ quizzes, quiz_questions, quiz_attempts
- ✅ assignments, assignment_submissions
- ✅ certificates, payments
- ✅ course_resources, course_announcements
- ✅ lesson_progress, student_notes

---

## 🚀 NEW FEATURES TO BUILD

### **Feature 1: Toast Notification System** 🔔
**What:** Replace localhost notifications with proper in-app toast notifications

**Implementation:**
- Use **React Hot Toast** library (already popular, well-maintained)
- Show success/error/info/warning toasts for all actions
- Examples:
  - ✅ "Video uploaded successfully"
  - ❌ "Failed to upload video"
  - ℹ️ "Quiz saved as draft"
  - ⚠️ "Internet connection lost"

**Locations:**
- All form submissions (create/update/delete)
- File uploads
- API calls
- User actions (enroll, submit, grade)

**Design:**
- Position: Top-right corner
- Duration: 3-5 seconds
- Animation: Slide-in from right
- Colors: Match Islamic theme (green/red/blue/yellow)
- Icon: Success ✅, Error ❌, Info ℹ️, Warning ⚠️

---

### **Feature 2: Multi-Language Video Support** 🌍
**What:** Videos can have multiple language versions (Tamil, English, Arabic)

**How It Works:**

**Teacher Side:**
1. Teacher adds a video lesson
2. System shows language options:
   - 🇬🇧 English
   - 🇮🇳 Tamil
   - 🇸🇦 Arabic
3. Teacher can add different YouTube/video links for each language:
   ```
   Week 1 - Lesson 1: Introduction to Tajweed
   ├── English Version: https://youtube.com/watch?v=abc123
   ├── Tamil Version: https://youtube.com/watch?v=def456
   └── Arabic Version: https://youtube.com/watch?v=ghi789
   ```

**Student Side:**
1. Student selects preferred language from dropdown (top-right)
2. System saves preference
3. When student plays video, shows version in their selected language
4. If video not available in preferred language, show fallback (English default)

**Database Changes:**
```sql
-- Add language columns to course_lessons table
ALTER TABLE course_lessons ADD COLUMN content_url_en TEXT;
ALTER TABLE course_lessons ADD COLUMN content_url_ta TEXT;  -- Tamil
ALTER TABLE course_lessons ADD COLUMN content_url_ar TEXT;  -- Arabic

-- Add user language preference
ALTER TABLE profiles ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';
  -- Values: 'en', 'ta', 'ar'
```

**Backend APIs:**
- `POST /api/teacher/lessons/:id/add-language` - Add language version
- `GET /api/student/lessons/:id` - Get lesson in preferred language
- `PATCH /api/user/language-preference` - Update language preference

**Frontend Components:**
- Language dropdown in navbar
- Multi-language video input in lesson form
- Video player that selects correct language URL

---

### **Feature 3: Enhanced Discussion Forum** 💬
**What:** Students/teachers discuss with @mentions, upvote/downvote, replies

**Features:**
1. **@Mention System**
   - Type `@teacher` or `@admin` or `@username`
   - Autocomplete dropdown appears
   - Mentioned user gets notification
   - Mention highlighted in message

2. **Upvote/Downvote**
   - Students can upvote helpful discussions
   - Downvote irrelevant/spam discussions
   - Sort by: Most upvoted, Recent, Unanswered

3. **Nested Replies**
   - Reply to specific discussion
   - Reply to reply (nested 2 levels)
   - Thread view

4. **Teacher/Admin Features**
   - Pin important discussions
   - Mark discussion as "Answered"
   - Delete inappropriate content
   - Get notified when @mentioned

**Database:**
```sql
-- Discussions table
CREATE TABLE course_discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES course_discussions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  user_name VARCHAR(255),
  user_role VARCHAR(20), -- student, teacher, admin
  title VARCHAR(500), -- Only for parent discussions
  content TEXT NOT NULL,
  mentions TEXT[], -- Array of mentioned user IDs
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_answered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discussion votes table
CREATE TABLE discussion_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(discussion_id, user_id)
);

-- Discussion notifications
CREATE TABLE discussion_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES course_discussions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Who should receive notification
  type VARCHAR(20), -- 'mention', 'reply', 'answer'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Backend APIs:**
- `POST /api/courses/:courseId/discussions` - Create discussion
- `GET /api/courses/:courseId/discussions` - List discussions (with filters)
- `POST /api/discussions/:id/replies` - Reply to discussion
- `POST /api/discussions/:id/vote` - Upvote/downvote
- `PATCH /api/discussions/:id/pin` - Pin discussion (teacher only)
- `PATCH /api/discussions/:id/mark-answered` - Mark as answered
- `DELETE /api/discussions/:id` - Delete discussion
- `GET /api/discussions/mentions` - Get discussions where user is mentioned

**Frontend Pages:**
- `/student/courses/[courseId]/discussions` - Student discussion view
- `/teacher/courses/[courseId]/discussions` - Teacher discussion view
- Component: Rich text editor with @mention support (use **TipTap** or **Draft.js**)

---

### **Feature 4: Access Control & Enrollment Verification** 🔐
**What:** Ensure only enrolled students can access course content

**Middleware:**
```typescript
// backend/src/middleware/enrollmentCheck.ts
export const requireEnrollment = async (req: any, res: Response, next: NextFunction) => {
  const userId = req.auth?.userId;
  const courseId = req.params.courseId;
  
  // Check if user is enrolled
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', userId)
    .eq('course_id', courseId)
    .single();
  
  if (!enrollment) {
    return res.status(403).json({ 
      error: 'You must be enrolled in this course to access this content' 
    });
  }
  
  next();
};
```

**Apply to Routes:**
- Quiz routes: `/api/student/quizzes/:quizId`
- Assignment routes: `/api/student/assignments/:assignmentId`
- Lesson routes: `/api/student/lessons/:lessonId`
- Discussion routes: `/api/courses/:courseId/discussions`
- Resource routes: `/api/courses/:courseId/resources`

---

### **Feature 5: Final Exam System** 📝
**What:** End-of-course comprehensive exam with multiple question types

**Question Types:**
1. **MCQ (Single Choice)** - Radio buttons, auto-graded
2. **Multiple Choice (Multiple Correct)** - Checkboxes, auto-graded
3. **True/False** - Boolean, auto-graded
4. **Short Answer** - Text input, teacher graded
5. **Essay** - Rich text, teacher graded
6. **File Upload** - PDF/audio/video, teacher graded

**Features:**
- Timer countdown
- One attempt only (configurable)
- Auto-save answers (every 30 seconds)
- Submit confirmation
- Review after submission (if allowed)
- Teacher manual grading for subjective questions

**Database:**
```sql
CREATE TABLE course_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  passing_score INTEGER DEFAULT 50,
  total_marks INTEGER NOT NULL,
  exam_date TIMESTAMP,
  is_published BOOLEAN DEFAULT FALSE,
  allow_review BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES course_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) CHECK (question_type IN 
    ('mcq', 'multiple_choice', 'true_false', 'short_answer', 'essay', 'file_upload')
  ),
  options JSONB, -- For MCQ: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer JSONB, -- For MCQ: ["A"] or ["A", "B"] for multiple
  marks INTEGER NOT NULL,
  order_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exam_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES course_exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  auto_graded_score INTEGER DEFAULT 0,
  manual_graded_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN 
    ('in_progress', 'submitted', 'graded')
  ),
  graded_at TIMESTAMP,
  graded_by TEXT,
  teacher_feedback TEXT
);

CREATE TABLE exam_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_options JSONB, -- For MCQ
  uploaded_file_url TEXT, -- For file upload questions
  marks_obtained INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  teacher_comment TEXT,
  graded_at TIMESTAMP
);
```

**Backend APIs - Teacher:**
- `POST /api/teacher/courses/:courseId/exams` - Create exam
- `GET /api/teacher/courses/:courseId/exams` - List exams
- `POST /api/teacher/exams/:examId/questions` - Add question
- `PUT /api/teacher/exam-questions/:questionId` - Update question
- `DELETE /api/teacher/exam-questions/:questionId` - Delete question
- `PATCH /api/teacher/exams/:examId/publish` - Publish exam
- `GET /api/teacher/exams/:examId/submissions` - View submissions
- `POST /api/teacher/exam-submissions/:submissionId/grade` - Grade submission

**Backend APIs - Student:**
- `GET /api/student/courses/:courseId/exam` - Get exam
- `POST /api/student/exams/:examId/start` - Start exam
- `POST /api/student/exam-submissions/:submissionId/save` - Auto-save answer
- `POST /api/student/exam-submissions/:submissionId/submit` - Submit exam
- `GET /api/student/exam-submissions/:submissionId/result` - View result

**Frontend - Teacher:**
- `/teacher/courses/[courseId]/exams/create`
- `/teacher/courses/[courseId]/exams/[examId]/questions`
- `/teacher/courses/[courseId]/exams/[examId]/submissions`
- `/teacher/exam-submissions/[submissionId]/grade`

**Frontend - Student:**
- `/student/courses/[courseId]/exam`
- `/student/courses/[courseId]/exam/[examId]/take`
- `/student/courses/[courseId]/exam/[examId]/result`

---

### **Feature 6: Resource Management** 📁
**What:** Teachers upload/add resources, students download

**Resource Types:**
1. **File Upload** - Upload to Supabase Storage
   - Supported: PDF, PPT, DOCX, ZIP
   - Max size: 50MB per file
2. **Google Drive Link** - External link
3. **YouTube Video** - Embedded player
4. **External Link** - Any URL

**Database:** (Already exists)
```sql
-- course_resources table
-- Columns: file_url, resource_type, file_size, title, description
```

**Backend APIs:**
- `POST /api/teacher/courses/:courseId/resources` - Upload/add resource
- `GET /api/teacher/courses/:courseId/resources` - List resources
- `DELETE /api/teacher/resources/:resourceId` - Delete resource (and file)
- `GET /api/student/courses/:courseId/resources` - List resources (student)
- `POST /api/student/resources/:resourceId/download` - Track download

**Frontend - Teacher:**
- `/teacher/courses/[courseId]/resources/manage`
  - Upload button (drag-and-drop)
  - Add link button
  - Resource list with edit/delete
  - Preview for PDFs/images

**Frontend - Student:**
- `/student/courses/[courseId]/resources`
  - Grid/list view of resources
  - Download button
  - Filter by type
  - Search

---

### **Feature 7: Grading Dashboard** 🎓
**What:** Unified grading interface for all submissions

**What Teacher Can Grade:**
1. Assignments (PDF/video/audio/text)
2. Quiz essay questions
3. Final exam subjective questions
4. Discussion participation (optional)

**Features:**
- View submission inline (PDF viewer, video player, audio player)
- Add marks + feedback
- Rubric support (optional)
- Bulk grading
- Filter by: Pending, Graded, All
- Sort by: Submission date, Student name

**Frontend - Teacher:**
- `/teacher/courses/[courseId]/grading`
  - Tabs: Assignments | Quizzes | Exams | All
  - Pending count badge
  - Quick grade interface
  - Full-screen grading mode

---

### **Feature 8: Cascade Delete System** 🗑️
**What:** When course deleted, remove all related data except certificates

**Delete:**
- ✅ All weeks, lessons
- ✅ All quizzes + questions + attempts
- ✅ All assignments + submissions + files
- ✅ All exams + questions + submissions + files
- ✅ All live sessions
- ✅ All resources (files from storage)
- ✅ All announcements
- ✅ All discussions
- ✅ All progress records
- ✅ All student notes

**Keep:**
- ✅ Certificates (with course info cached)
- ✅ Enrollment history (for records)
- ✅ Payment records

**Implementation:**
- SQL CASCADE DELETE on foreign keys
- Pre-deletion hook to delete files from storage
- Update certificates: Set `course_deleted = true`, cache course name/details

**Backend API:**
- `DELETE /api/admin/courses/:courseId` (enhanced)

---

### **Feature 9: Student Certificate Page** 🏆
**What:** Students view/download all their certificates

**Features:**
- Grid view of certificates
- Download PDF
- Share button (generate share link)
- Show course name (even if deleted)
- Verification code
- Filter: Active courses | Deleted courses | All

**Frontend:**
- `/student/certificates`

---

### **Feature 10: In-App Notification Center** 🔔
**What:** Notification bell with dropdown, notification page

**Database:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type VARCHAR(50), -- 'success', 'error', 'info', 'activity'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to related page
  icon VARCHAR(50), -- Icon name
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
```

**Notification Triggers:**
- Enrollment success
- New content added (week/lesson)
- Resource uploaded
- Live session scheduled
- Recording uploaded
- Quiz published
- Assignment published
- Assignment graded
- Quiz result available
- Certificate issued
- Announcement posted
- Discussion reply
- @mention in discussion
- Payment success

**Backend APIs:**
- `POST /api/notifications` - Create notification
- `GET /api/notifications/my` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

**Frontend Component:**
- Notification bell icon (navbar)
- Badge with unread count
- Dropdown: Recent 5 notifications
- Link to `/notifications` page
- Design: Consistent across all pages

**Frontend Page:**
- `/notifications` - All notifications
  - Filter: All | Unread | Read
  - Group by: Today | Yesterday | This Week | Older
  - Mark all as read button
  - Clear all button

---

## 📋 IMPLEMENTATION PHASES

### **PHASE 1: Foundation & Security** (Week 1)
**Duration:** 5-7 hours

#### **Day 1: Access Control** (2 hours)
- [ ] Create enrollment verification middleware
- [ ] Add to quiz routes
- [ ] Add to assignment routes
- [ ] Add to lesson routes
- [ ] Add to discussion routes
- [ ] Test with enrolled/non-enrolled users

#### **Day 2: Toast Notification System** (1 hour)
- [ ] Install react-hot-toast
- [ ] Create toast utility functions
- [ ] Add to all forms (teacher/student/admin)
- [ ] Add to API calls
- [ ] Test success/error scenarios

#### **Day 3: Quiz Verification** (2 hours)
- [ ] Verify all question types work (MCQ, multiple choice, true/false, essay)
- [ ] Test auto-grading logic
- [ ] Test manual grading for essay questions
- [ ] Fix any bugs

---

### **PHASE 2: Multi-Language Support** (Week 1)
**Duration:** 6-8 hours

#### **Day 4: Database & Backend** (3 hours)
- [ ] Add language columns to `course_lessons` table
- [ ] Add `preferred_language` to `profiles` table
- [ ] Create API: Add language version to lesson
- [ ] Create API: Get lesson in preferred language
- [ ] Create API: Update user language preference
- [ ] Test APIs

#### **Day 5: Frontend - Teacher** (2 hours)
- [ ] Update lesson form: Add language tabs (EN, TA, AR)
- [ ] Add video URL inputs for each language
- [ ] Update lesson list: Show language availability badges
- [ ] Test lesson creation with multiple languages

#### **Day 6: Frontend - Student** (2 hours)
- [ ] Add language dropdown to navbar
- [ ] Save language preference on change
- [ ] Update video player: Load video in selected language
- [ ] Show fallback message if language not available
- [ ] Test language switching

---

### **PHASE 3: Discussion Forum** (Week 2)
**Duration:** 8-10 hours

#### **Day 1: Database & Backend** (4 hours)
- [ ] Create `course_discussions` table
- [ ] Create `discussion_votes` table
- [ ] Create `discussion_notifications` table
- [ ] Create API: Create discussion
- [ ] Create API: List discussions (with filters/sorting)
- [ ] Create API: Reply to discussion
- [ ] Create API: Upvote/downvote
- [ ] Create API: Pin discussion (teacher)
- [ ] Create API: Mark as answered
- [ ] Create API: Delete discussion
- [ ] Test APIs

#### **Day 2: Frontend - Discussion List** (3 hours)
- [ ] Create discussion list page (student/teacher)
- [ ] Implement filters (All, Unanswered, Pinned)
- [ ] Implement sorting (Recent, Most Upvoted)
- [ ] Show discussion cards (title, author, votes, replies)
- [ ] Add "New Discussion" button
- [ ] Test pagination

#### **Day 3: Frontend - Discussion Details & @Mentions** (3 hours)
- [ ] Create discussion detail view
- [ ] Implement rich text editor (TipTap)
- [ ] Add @mention autocomplete
  - Type `@` → Show dropdown of users
  - Select user → Insert mention
  - Highlight mentions in text
- [ ] Implement reply functionality
- [ ] Implement upvote/downvote buttons
- [ ] Teacher: Pin/unpin button
- [ ] Teacher: Mark as answered button
- [ ] Send notifications when @mentioned
- [ ] Test mentions and replies

---

### **PHASE 4: Final Exam System** (Week 2-3)
**Duration:** 10-12 hours

#### **Day 1: Database & Backend - Exam Creation** (4 hours)
- [ ] Create `course_exams` table
- [ ] Create `exam_questions` table
- [ ] Create `exam_submissions` table
- [ ] Create `exam_answers` table
- [ ] Create API: Create exam (teacher)
- [ ] Create API: Add question (teacher)
- [ ] Create API: Update question (teacher)
- [ ] Create API: Delete question (teacher)
- [ ] Create API: Publish exam (teacher)
- [ ] Test APIs

#### **Day 2: Frontend - Exam Creation** (3 hours)
- [ ] Create exam creation form (teacher)
- [ ] Add questions interface:
  - MCQ question builder
  - Multiple choice builder
  - True/False builder
  - Essay question builder
  - File upload question builder
- [ ] Question preview
- [ ] Drag-and-drop to reorder questions
- [ ] Publish button
- [ ] Test exam creation

#### **Day 3: Backend - Exam Taking** (2 hours)
- [ ] Create API: Start exam (student)
- [ ] Create API: Auto-save answer
- [ ] Create API: Submit exam
- [ ] Implement auto-grading logic (MCQ, multiple choice, true/false)
- [ ] Create API: Get result
- [ ] Test exam submission

#### **Day 4: Frontend - Exam Taking** (3 hours)
- [ ] Create exam taking page (student)
- [ ] Implement timer countdown
- [ ] Question navigation sidebar
- [ ] Auto-save every 30 seconds
- [ ] File upload for file-type questions
- [ ] Audio recording for audio questions (optional)
- [ ] Submit confirmation modal
- [ ] Prevent page refresh warning
- [ ] Show result page after submission
- [ ] Test exam flow

---

### **PHASE 5: Grading System** (Week 3)
**Duration:** 6-8 hours

#### **Day 1: Backend - Grading APIs** (2 hours)
- [ ] Create API: Get pending submissions (teacher)
- [ ] Create API: Grade assignment submission
- [ ] Create API: Grade quiz essay question
- [ ] Create API: Grade exam subjective question
- [ ] Test APIs

#### **Day 2: Frontend - Grading Dashboard** (4 hours)
- [ ] Create grading dashboard page (teacher)
- [ ] Tabs: Assignments | Quizzes | Exams | All
- [ ] Pending count badges
- [ ] Submission list (filterable)
- [ ] Grading modal:
  - View submission (PDF viewer, video player, audio player)
  - Marks input
  - Feedback textarea
  - Save button
- [ ] Bulk grading interface (optional)
- [ ] Test grading flow

---

### **PHASE 6: Resource Management** (Week 3)
**Duration:** 5-6 hours

#### **Day 1: Backend** (2 hours)
- [ ] Create API: Upload resource (Supabase Storage)
- [ ] Create API: Add resource link
- [ ] Create API: List resources (teacher/student)
- [ ] Create API: Delete resource (and file)
- [ ] Test APIs

#### **Day 2: Frontend - Teacher** (2 hours)
- [ ] Create resource management page (teacher)
- [ ] Upload button (drag-and-drop)
- [ ] Add link button
- [ ] Resource list with edit/delete
- [ ] Test upload/delete

#### **Day 3: Frontend - Student** (1 hour)
- [ ] Create resource page (student)
- [ ] Grid/list view
- [ ] Download button
- [ ] Filter by type
- [ ] Test download

---

### **PHASE 7: Notification Center** (Week 4)
**Duration:** 4-5 hours

#### **Day 1: Database & Backend** (2 hours)
- [ ] Create `notifications` table
- [ ] Create API: Create notification
- [ ] Create API: Get user notifications
- [ ] Create API: Get unread count
- [ ] Create API: Mark as read
- [ ] Create API: Mark all as read
- [ ] Create API: Delete notification
- [ ] Add notification triggers to existing APIs
- [ ] Test APIs

#### **Day 2: Frontend** (2-3 hours)
- [ ] Create notification bell component (navbar)
- [ ] Badge with unread count
- [ ] Dropdown with recent 5 notifications
- [ ] Create notifications page
- [ ] Filter: All | Unread | Read
- [ ] Group by date
- [ ] Mark all as read button
- [ ] Test notifications

---

### **PHASE 8: Cascade Delete & Polish** (Week 4)
**Duration:** 3-4 hours

#### **Day 1: Cascade Delete** (2 hours)
- [ ] Update course delete API
- [ ] Add pre-deletion hook:
  - Delete files from Supabase Storage
  - Update certificates (cache course info)
  - Delete all child records
- [ ] Test course deletion

#### **Day 2: Certificate Page** (1 hour)
- [ ] Create student certificates page
- [ ] Grid view of certificates
- [ ] Download PDF button
- [ ] Filter: Active | Deleted | All
- [ ] Test certificate viewing

#### **Day 3: UI/UX Polish** (1 hour)
- [ ] Review all new pages for design consistency
- [ ] Ensure Islamic theme throughout
- [ ] Fix responsive design issues
- [ ] Add loading states
- [ ] Add empty states
- [ ] Test on mobile

---

### **PHASE 9: Testing & Bug Fixes** (Week 4)
**Duration:** 4-5 hours

#### **Day 1: Integration Testing** (2 hours)
- [ ] Test full enrollment flow
- [ ] Test multi-language video switching
- [ ] Test discussion mentions
- [ ] Test exam taking and grading
- [ ] Test resource upload and download

#### **Day 2: Bug Fixes** (2 hours)
- [ ] Fix identified bugs
- [ ] Performance optimization
- [ ] Security review

#### **Day 3: Documentation** (1 hour)
- [ ] Update API documentation
- [ ] Update user guides
- [ ] Update deployment docs

---

## 🔧 TECHNICAL SPECIFICATIONS

### **Database Migrations**

#### **Migration 1: Multi-Language Support**
```sql
-- Add language support to lessons
ALTER TABLE course_lessons 
ADD COLUMN content_url_en TEXT,
ADD COLUMN content_url_ta TEXT,
ADD COLUMN content_url_ar TEXT;

-- Migrate existing content_url to content_url_en
UPDATE course_lessons SET content_url_en = content_url WHERE content_url IS NOT NULL;

-- Add language preference to profiles
ALTER TABLE profiles 
ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'en';
```

#### **Migration 2: Discussion Forum**
```sql
-- See detailed schema in Feature 3 above
CREATE TABLE course_discussions (...);
CREATE TABLE discussion_votes (...);
CREATE TABLE discussion_notifications (...);
```

#### **Migration 3: Final Exam System**
```sql
-- See detailed schema in Feature 5 above
CREATE TABLE course_exams (...);
CREATE TABLE exam_questions (...);
CREATE TABLE exam_submissions (...);
CREATE TABLE exam_answers (...);
```

#### **Migration 4: Notification System**
```sql
-- See detailed schema in Feature 10 above
CREATE TABLE notifications (...);
```

#### **Migration 5: Certificate Enhancement**
```sql
ALTER TABLE certificates 
ADD COLUMN course_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN course_name_cached VARCHAR(500),
ADD COLUMN course_description_cached TEXT;
```

---

### **API Endpoints Summary**

#### **Multi-Language APIs**
- `POST /api/teacher/lessons/:id/add-language` - Add language version
- `GET /api/student/lessons/:id` - Get lesson (language-aware)
- `PATCH /api/user/language-preference` - Update preference

#### **Discussion APIs**
- `POST /api/courses/:courseId/discussions` - Create discussion
- `GET /api/courses/:courseId/discussions` - List discussions
- `POST /api/discussions/:id/replies` - Reply
- `POST /api/discussions/:id/vote` - Upvote/downvote
- `PATCH /api/discussions/:id/pin` - Pin (teacher)
- `PATCH /api/discussions/:id/mark-answered` - Mark answered
- `DELETE /api/discussions/:id` - Delete
- `GET /api/discussions/mentions` - Get mentions

#### **Exam APIs - Teacher**
- `POST /api/teacher/courses/:courseId/exams` - Create exam
- `POST /api/teacher/exams/:examId/questions` - Add question
- `PATCH /api/teacher/exams/:examId/publish` - Publish
- `GET /api/teacher/exams/:examId/submissions` - View submissions
- `POST /api/teacher/exam-submissions/:id/grade` - Grade

#### **Exam APIs - Student**
- `GET /api/student/courses/:courseId/exam` - Get exam
- `POST /api/student/exams/:examId/start` - Start exam
- `POST /api/student/exam-submissions/:id/save` - Auto-save
- `POST /api/student/exam-submissions/:id/submit` - Submit
- `GET /api/student/exam-submissions/:id/result` - View result

#### **Resource APIs**
- `POST /api/teacher/courses/:courseId/resources` - Upload/add
- `GET /api/teacher/courses/:courseId/resources` - List (teacher)
- `DELETE /api/teacher/resources/:id` - Delete
- `GET /api/student/courses/:courseId/resources` - List (student)

#### **Notification APIs**
- `POST /api/notifications` - Create
- `GET /api/notifications/my` - Get user notifications
- `GET /api/notifications/unread-count` - Unread count
- `PATCH /api/notifications/:id/read` - Mark read
- `PATCH /api/notifications/mark-all-read` - Mark all
- `DELETE /api/notifications/:id` - Delete

#### **Grading APIs**
- `GET /api/teacher/grading/pending` - Pending submissions
- `POST /api/teacher/grading/assignments/:id` - Grade assignment
- `POST /api/teacher/grading/quiz-essays/:id` - Grade quiz
- `POST /api/teacher/grading/exam-answers/:id` - Grade exam

---

## 📊 PROGRESS TRACKING

### **Week 1 Checklist**
- [ ] Phase 1: Access Control (Day 1)
- [ ] Phase 1: Toast Notifications (Day 2)
- [ ] Phase 1: Quiz Verification (Day 3)
- [ ] Phase 2: Multi-Language Database (Day 4)
- [ ] Phase 2: Multi-Language Teacher UI (Day 5)
- [ ] Phase 2: Multi-Language Student UI (Day 6)

### **Week 2 Checklist**
- [ ] Phase 3: Discussion Backend (Day 1)
- [ ] Phase 3: Discussion List UI (Day 2)
- [ ] Phase 3: Discussion Details & Mentions (Day 3)
- [ ] Phase 4: Exam Backend (Day 4)
- [ ] Phase 4: Exam Creation UI (Day 5)

### **Week 3 Checklist**
- [ ] Phase 4: Exam Taking Backend (Day 1)
- [ ] Phase 4: Exam Taking UI (Day 2)
- [ ] Phase 5: Grading Backend (Day 3)
- [ ] Phase 5: Grading Dashboard (Day 4-5)
- [ ] Phase 6: Resource Backend (Day 6)

### **Week 4 Checklist**
- [ ] Phase 6: Resource Teacher UI (Day 1)
- [ ] Phase 6: Resource Student UI (Day 2)
- [ ] Phase 7: Notification Backend (Day 3)
- [ ] Phase 7: Notification UI (Day 4)
- [ ] Phase 8: Cascade Delete (Day 5)
- [ ] Phase 8: Certificate Page (Day 6)
- [ ] Phase 8: UI Polish (Day 7)

### **Week 5 Checklist**
- [ ] Phase 9: Integration Testing (Day 1-2)
- [ ] Phase 9: Bug Fixes (Day 3-4)
- [ ] Phase 9: Documentation (Day 5)
- [ ] Final Review & Deployment

---

## ❓ QUESTIONS & CLARIFICATIONS

### **Question 1: Email Notification Frequency**
**Options:**
1. **Immediate** - Send email right away when action happens
2. **Daily Digest** - One email per day with all activities
3. **Weekly Digest** - One email per week with summary
4. **Hybrid** - Immediate for critical actions, daily for minor updates

**Which do you prefer?**
- [ ] Option 1: Immediate
- [ ] Option 2: Daily Digest
- [ ] Option 3: Weekly Digest
- [ ] Option 4: Hybrid (Recommended)

---

### **Question 2: Language Support**
**Confirmed Languages:**
- English (en)
- Tamil (ta)
- Arabic (ar)

**Questions:**
1. Should UI text (buttons, labels) also translate? Or just video content?
2. Should we use i18n library for full UI translation?
3. For now, focus only on video language versions?

**Answer:** _[Please clarify]_

---

### **Question 3: Discussion Forum**
**Questions:**
1. Should students be able to create discussions in any course, or only enrolled courses?
   - [ ] Any course (public discussions)
   - [ ] Only enrolled courses (private)

2. Maximum @mentions per post?
   - [ ] Unlimited
   - [ ] Limited to 5-10

3. Can students delete their own discussions?
   - [ ] Yes, anytime
   - [ ] Yes, within 1 hour of posting
   - [ ] No, only teacher/admin can delete

**Answer:** _[Please clarify]_

---

### **Question 4: Final Exam**
**Questions:**
1. Maximum file upload size for exam answers?
   - [ ] 10 MB
   - [ ] 50 MB
   - [ ] 100 MB

2. Allowed file types for upload questions?
   - [ ] PDF only
   - [ ] PDF + Audio (MP3)
   - [ ] PDF + Audio + Video (MP4)

3. Should students be able to review exam after submission?
   - [ ] Yes, immediately
   - [ ] Yes, after teacher grades
   - [ ] No, never

**Answer:** _[Please clarify]_

---

### **Question 5: Resource Management**
**Questions:**
1. Maximum file upload size for resources?
   - [ ] 50 MB
   - [ ] 100 MB
   - [ ] 500 MB

2. Should students be able to upload resources (peer-to-peer sharing)?
   - [ ] Yes
   - [ ] No, only teacher can upload

3. Resource categories/tags for filtering?
   - [ ] Yes (Books, Notes, Practice, etc.)
   - [ ] No, just simple list

**Answer:** _[Please clarify]_

---

### **Question 6: Grading**
**Questions:**
1. Should teacher be able to grade partially (save as draft)?
   - [ ] Yes
   - [ ] No, must complete grading before saving

2. Should teacher be able to re-grade (change marks after submission)?
   - [ ] Yes, anytime
   - [ ] Yes, but notify student
   - [ ] No, final grade is locked

3. Rubric system for grading?
   - [ ] Yes, implement rubrics
   - [ ] No, just marks + feedback

**Answer:** _[Please clarify]_

---

### **Question 7: Notifications**
**Questions:**
1. Notification retention period?
   - [ ] Keep forever
   - [ ] Delete after 30 days
   - [ ] Delete after 90 days

2. Push notifications (browser push)?
   - [ ] Yes, implement
   - [ ] No, just in-app

3. Email notifications for every in-app notification?
   - [ ] Yes, always
   - [ ] No, only critical
   - [ ] Let user choose in settings

**Answer:** _[Please clarify]_

---

### **Question 8: Cascade Delete**
**Questions:**
1. Should admin confirm before deleting course?
   - [ ] Yes, show summary of what will be deleted
   - [ ] Yes, type course name to confirm
   - [ ] No, just delete

2. Should we archive instead of delete?
   - [ ] Yes, soft delete (archive)
   - [ ] No, hard delete

3. Notify enrolled students when course is deleted?
   - [ ] Yes, send email
   - [ ] Yes, in-app notification
   - [ ] No

**Answer:** _[Please clarify]_

---

## 📝 NOTES & DECISIONS

### **Decided:**
1. ✅ Use React Hot Toast for toast notifications
2. ✅ Use TipTap for rich text editor (@mentions)
3. ✅ Store files in Supabase Storage
4. ✅ Keep Islamic theme consistent across all pages
5. ✅ Implement enrollment verification for all content
6. ✅ Multi-language support for video content (EN, TA, AR)

### **To Decide:**
1. ⏳ Email notification frequency
2. ⏳ UI translation (buttons, labels)
3. ⏳ Discussion forum privacy settings
4. ⏳ Exam file upload limits
5. ⏳ Resource upload limits
6. ⏳ Grading rubric system
7. ⏳ Notification retention
8. ⏳ Cascade delete vs archive

---

## 🎯 SUCCESS CRITERIA

### **Phase Completion Criteria**
- [ ] All APIs tested with Postman/API client
- [ ] All frontend pages tested in Chrome, Firefox, Safari
- [ ] Mobile responsive design verified
- [ ] No TypeScript compilation errors
- [ ] No console errors
- [ ] All toast notifications working
- [ ] All database migrations applied successfully
- [ ] Code reviewed and documented

### **Final Acceptance Criteria**
- [ ] Student can enroll and access course content
- [ ] Student cannot access content without enrollment
- [ ] Student can select language and see videos in that language
- [ ] Student can participate in discussions with @mentions
- [ ] Student can take final exam and submit
- [ ] Teacher can grade all submission types
- [ ] Teacher can upload resources
- [ ] Teacher can view pending gradings
- [ ] Admin can delete course with cascade
- [ ] Student can view certificates even after course deleted
- [ ] All users receive toast notifications
- [ ] All users receive in-app notifications
- [ ] UI design consistent across all pages
- [ ] No security vulnerabilities

---

## 📚 REFERENCE LINKS

### **Libraries to Install**
```bash
# Backend
npm install --save react-hot-toast

# Frontend
npm install --save @tiptap/react @tiptap/starter-kit @tiptap/extension-mention
npm install --save react-dropzone  # For file uploads
npm install --save react-pdf       # For PDF preview
```

### **Documentation**
- React Hot Toast: https://react-hot-toast.com/
- TipTap Editor: https://tiptap.dev/
- Supabase Storage: https://supabase.com/docs/guides/storage
- Clerk Auth: https://clerk.com/docs

---

## 📌 IMPLEMENTATION TRACKER

**Current Phase:** Planning  
**Current Task:** Awaiting user clarifications  
**Next Task:** Phase 1 - Access Control  
**Blockers:** Need answers to Questions 1-8  
**Last Updated:** January 12, 2026

---

**END OF DOCUMENT**

_This document will be updated as implementation progresses._
