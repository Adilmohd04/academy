# 🎓 Islamic Academy - Complete LMS Implementation Plan

**Project:** Learning Management System with Auto Google Meet Integration  
**Timeline:** 3-4 weeks  
**Goal:** Build a scalable course platform for 15,000+ concurrent users

---

## 📋 Table of Contents
1. [Phase 1: Fix Current Issues](#phase-1-fix-current-issues)
2. [Phase 2: Auto Google Meet Integration](#phase-2-auto-google-meet-integration)
3. [Phase 3: Course System MVP](#phase-3-course-system-mvp)
4. [Phase 4: Live Sessions & Recordings](#phase-4-live-sessions--recordings)
5. [Phase 5: Quiz & Assessment System](#phase-5-quiz--assessment-system)
6. [Phase 6: Certificate Generation](#phase-6-certificate-generation)
7. [Phase 7: Chat & Discussion System](#phase-7-chat--discussion-system)
8. [Phase 8: Performance & Scalability](#phase-8-performance--scalability)
9. [Testing & Deployment Strategy](#testing--deployment-strategy)

---

## PHASE 1: Fix Current Issues
**Duration:** 1-2 days  
**Status:** ✅ COMPLETED

### Objectives
- Fix infinite redirect loop for users with role changes
- Fix payment receipt generation (500 error)
- Sync Clerk metadata with database roles

### What Was Done
1. ✅ Added auto-sync role from database to Clerk metadata (`useRoleSync` hook)
2. ✅ Updated backend to sync Clerk when admin changes user role
3. ✅ Fixed deprecated Clerk redirect props (`afterSignInUrl` → `fallbackRedirectUrl`)
4. ✅ Added `pdfkit` dependency for PDF receipt generation
5. ✅ Pushed all fixes to GitHub (commits: 8de1cf7, 8654a0e, de0188b, 1aae79a)

### Next Steps
- Redeploy frontend and backend on Vercel
- Test with all three user roles (student, teacher, admin)
- Verify receipt download works

---

## PHASE 2: Auto Google Meet Integration
**Duration:** 2-3 days  
**Status:** 🔄 READY TO START

### Objectives
- Admin clicks "Generate Meet Link" button
- System auto-creates Google Meet via Calendar API
- Invites all participants (teacher + students)
- Google automatically sends 30-minute reminders
- Stores meet link in database

### Current Status
- ✅ Google Calendar API integration exists (`backend/src/services/calendarService.ts`)
- ✅ `createMeetEvent()` function ready to use
- ⚠️ Feature is disabled in admin UI (needs activation)

### Implementation Steps

#### 2.1 Backend Changes

**File:** `backend/src/controllers/boxApprovalController.ts`
```typescript
// Add new endpoint: Generate Meet Link & Approve Box
export const generateMeetingAndApprove = async (req, res) => {
  const { boxId } = req.params;
  const { teacherName, teacherEmail, studentEmails } = req.body;
  
  // Get box details
  const box = await getBoxById(boxId);
  
  // Create Google Meet event
  const meetDetails = await createMeetEvent({
    summary: `${box.topic} - ${teacherName}`,
    description: box.description,
    startDateTimeISO: box.start_time,
    endDateTimeISO: box.end_time,
    attendeesEmails: [teacherEmail, ...studentEmails],
    timeZone: 'Asia/Kolkata'
  });
  
  // Update box with meet link
  await updateBox(boxId, {
    meet_link: meetDetails.hangoutLink,
    google_event_id: meetDetails.eventId,
    status: 'approved'
  });
  
  // Send emails to all participants
  await sendMeetingNotifications(boxId, meetDetails.hangoutLink);
  
  res.json({ success: true, meetLink: meetDetails.hangoutLink });
};
```

**File:** `backend/src/routes/boxes.ts`
```typescript
router.post('/:boxId/generate-meeting', 
  requireAuth, 
  requireRole(['admin']),
  boxApprovalController.generateMeetingAndApprove
);
```

#### 2.2 Frontend Changes

**File:** `frontend/app/admin/meetings/approval/page.tsx`

Add "Generate Meet Link" button:
```tsx
<button 
  onClick={() => handleGenerateMeetLink(box.id)}
  className="btn-primary"
>
  🎥 Generate Google Meet Link
</button>

const handleGenerateMeetLink = async (boxId) => {
  const response = await fetch(`${API_URL}/api/boxes/${boxId}/generate-meeting`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      teacherName: box.teacher_name,
      teacherEmail: box.teacher_email,
      studentEmails: box.students.map(s => s.email)
    })
  });
  
  const data = await response.json();
  alert(`✅ Meet link generated: ${data.meetLink}`);
};
```

#### 2.3 Database Changes

**File:** `backend/database/migrations/add-google-meet-fields.sql`
```sql
-- Add Google Meet tracking fields
ALTER TABLE meeting_bookings 
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_invite_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS calendar_invite_sent_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_google_event 
ON meeting_bookings(google_event_id);
```

#### 2.4 Environment Variables Needed

**Backend `.env`:**
```bash
# Google Calendar API
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_IMPERSONATED_USER=admin@islamicacademy.com
GOOGLE_CALENDAR_ID=primary
TIMEZONE=Asia/Kolkata
```

### Testing Checklist
- [ ] Admin can click "Generate Meet Link" button
- [ ] Google Meet link is created successfully
- [ ] Link is saved in database
- [ ] Teacher receives calendar invite email
- [ ] Students receive calendar invite email
- [ ] Calendar event shows correct date/time
- [ ] Google sends 30-minute reminder automatically
- [ ] Clicking calendar event opens Google Meet

### Success Criteria
- ✅ No manual Google Meet creation needed
- ✅ All participants receive calendar invites
- ✅ Reminders sent automatically by Google
- ✅ Meet link stored in database for reference

---

## PHASE 3: Course System MVP
**Duration:** 5-7 days  
**Status:** 📝 PLANNED

### Objectives
- Create complete course management system
- Support both live sessions and recorded videos
- Enable student enrollment (paid/free)
- Track student progress
- Display course materials by week

### Database Schema

**File:** `backend/database/migrations/create-course-system.sql`

```sql
-- 1. Enhanced courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 8;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(50); -- beginner, intermediate, advanced

-- 2. Course weeks/modules
CREATE TABLE IF NOT EXISTS course_weeks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  unlock_date TIMESTAMP,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_id, week_number)
);

-- 3. Course content (videos, live sessions, resources)
CREATE TABLE IF NOT EXISTS course_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id UUID REFERENCES course_weeks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'video', 'live_session', 'document', 'link'
  title VARCHAR(255) NOT NULL,
  content_url TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMP, -- For live sessions
  meet_link TEXT,
  google_event_id TEXT,
  order_index INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Live session recordings
CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES course_content(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  duration_minutes INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- 5. Course chat/discussion
CREATE TABLE IF NOT EXISTS course_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_id UUID REFERENCES course_weeks(id),
  user_id TEXT NOT NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  message TEXT NOT NULL,
  parent_id UUID REFERENCES course_messages(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Progress tracking
CREATE TABLE IF NOT EXISTS content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  content_id UUID REFERENCES course_content(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  watched_duration INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  UNIQUE(student_id, content_id)
);

-- 7. Enhanced enrollments
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

-- Indexes for performance
CREATE INDEX idx_course_weeks ON course_weeks(course_id, week_number);
CREATE INDEX idx_course_content ON course_content(week_id, order_index);
CREATE INDEX idx_content_progress ON content_progress(student_id, content_id);
CREATE INDEX idx_course_messages ON course_messages(course_id, created_at);
```

### Backend API Endpoints

**File:** `backend/src/services/courseService.ts`

Key functions to implement:
```typescript
// Course CRUD
- createCourse(courseData)
- updateCourse(courseId, updates)
- deleteCourse(courseId)
- getCourseById(courseId)
- getAllCourses(filters)
- publishCourse(courseId)

// Week management
- addWeek(courseId, weekData)
- updateWeek(weekId, updates)
- deleteWeek(weekId)

// Content management
- addContent(weekId, contentData)
- updateContent(contentId, updates)
- deleteContent(contentId)
- scheduleContent(contentId, dateTime)

// Enrollment
- enrollStudent(studentId, courseId)
- unenrollStudent(studentId, courseId)
- getStudentCourses(studentId)
- getCourseStudents(courseId)

// Progress tracking
- markContentComplete(studentId, contentId)
- updateProgress(studentId, courseId)
- getStudentProgress(studentId, courseId)
```

**File:** `backend/src/routes/courses.ts`

```typescript
// Courses
GET    /api/courses                    - List all published courses
GET    /api/courses/:id                - Get course details
POST   /api/courses                    - Create course (teacher/admin)
PUT    /api/courses/:id                - Update course (teacher/admin)
DELETE /api/courses/:id                - Delete course (admin)
POST   /api/courses/:id/publish        - Publish course (admin)

// Enrollment
POST   /api/courses/:id/enroll         - Enroll student
DELETE /api/courses/:id/unenroll       - Unenroll student
GET    /api/courses/:id/students       - Get enrolled students

// Content
POST   /api/courses/:id/weeks          - Add week
POST   /api/weeks/:id/content          - Add content to week
PUT    /api/content/:id                - Update content
DELETE /api/content/:id                - Delete content

// Progress
GET    /api/courses/:id/progress       - Get student progress
POST   /api/content/:id/complete       - Mark content as complete
```

### Frontend Pages

#### 3.1 Browse Courses (Student)
**File:** `frontend/app/student/courses/page.tsx`

```tsx
Features:
- Grid layout of course cards
- Filter by category, level, price
- Search by title
- Show: thumbnail, title, teacher, price, rating
- "Enroll Now" button
```

#### 3.2 Course Details
**File:** `frontend/app/student/courses/[id]/page.tsx`

```tsx
Features:
- Course overview (description, duration, outcomes)
- Curriculum (list of weeks and content)
- Teacher bio
- Student reviews
- "Enroll Now" or "Start Learning" button
```

#### 3.3 Course Player
**File:** `frontend/app/student/courses/[id]/learn/page.tsx`

```tsx
Features:
- Sidebar: List of weeks and content
- Main area: Video player or content viewer
- Progress bar showing % completed
- "Mark as Complete" button
- Navigation: Previous/Next content
- Resources download section
```

#### 3.4 Teacher Dashboard - Create Course
**File:** `frontend/app/teacher/courses/create/page.tsx`

```tsx
Features:
- Course basic info form
- Add weeks (dynamic list)
- Add content to each week:
  - YouTube video (paste link)
  - Upload document (PDF)
  - Schedule live session
  - Add external link
- Publish button
```

### Testing Checklist
- [ ] Teacher can create course with multiple weeks
- [ ] Teacher can add video/live session/document to week
- [ ] Student can browse and see all published courses
- [ ] Student can enroll in course (free/paid)
- [ ] Student can access course player
- [ ] Video player shows YouTube embeds correctly
- [ ] Progress is tracked as student completes content
- [ ] Live session shows "Join Meeting" button when time comes

### Success Criteria
- ✅ Complete CRUD operations for courses
- ✅ Students can browse and enroll
- ✅ Course player functional with progress tracking
- ✅ Both recorded and live content supported

---

## PHASE 4: Live Sessions & Recordings
**Duration:** 2-3 days  
**Status:** 📝 PLANNED

### Objectives
- Schedule live sessions within courses
- Auto-generate Google Meet links for live sessions
- Send calendar invites to enrolled students
- Save recording URLs after session ends
- Display recordings in course content

### Implementation Steps

#### 4.1 Schedule Live Session

**Backend:** When teacher adds live session to course week
```typescript
// backend/src/services/courseService.ts
export const scheduleLiveSession = async (weekId, sessionData) => {
  // 1. Create content entry
  const content = await addContent(weekId, {
    type: 'live_session',
    title: sessionData.title,
    scheduled_at: sessionData.dateTime,
    duration_minutes: sessionData.duration
  });
  
  // 2. Get all enrolled students
  const students = await getCourseStudents(courseId);
  
  // 3. Create Google Meet event
  const meetDetails = await createMeetEvent({
    summary: sessionData.title,
    description: sessionData.description,
    startDateTimeISO: sessionData.dateTime,
    endDateTimeISO: addMinutes(sessionData.dateTime, sessionData.duration),
    attendeesEmails: [teacherEmail, ...students.map(s => s.email)]
  });
  
  // 4. Update content with meet link
  await updateContent(content.id, {
    meet_link: meetDetails.hangoutLink,
    google_event_id: meetDetails.eventId
  });
  
  // 5. Send notifications
  await notifyStudentsAboutSession(courseId, content.id);
  
  return content;
};
```

#### 4.2 Join Live Session (Student View)

**Frontend:** `frontend/app/student/courses/[id]/learn/page.tsx`

```tsx
{content.type === 'live_session' && (
  <div className="live-session-card">
    <h3>{content.title}</h3>
    <p>Scheduled: {formatDate(content.scheduled_at)}</p>
    
    {/* Before session starts */}
    {isPending && (
      <button disabled>
        ⏰ Session starts in {timeUntil}
      </button>
    )}
    
    {/* During session (15 min before to 30 min after) */}
    {isLive && (
      <a href={content.meet_link} target="_blank">
        <button className="btn-primary">
          🎥 Join Live Session
        </button>
      </a>
    )}
    
    {/* After session ends */}
    {isCompleted && recording && (
      <div>
        <p>✅ Session completed</p>
        <button onClick={() => watchRecording(recording.url)}>
          📹 Watch Recording
        </button>
      </div>
    )}
  </div>
)}
```

#### 4.3 Save Recording After Session

**Manual Process (for now):**
1. Teacher records Google Meet session
2. Recording saved to Google Drive automatically
3. Teacher copies recording URL
4. Teacher adds recording URL in admin panel

**Future Enhancement:** Auto-fetch recordings via Google Drive API

**Backend:**
```typescript
// POST /api/content/:id/recording
export const addRecording = async (contentId, recordingUrl) => {
  const recording = await createRecording({
    content_id: contentId,
    recording_url: recordingUrl,
    duration_minutes: await getVideoDuration(recordingUrl)
  });
  
  // Notify students that recording is available
  await notifyStudentsAboutRecording(contentId);
  
  return recording;
};
```

### Testing Checklist
- [ ] Teacher can schedule live session in course
- [ ] Google Meet link generated automatically
- [ ] All enrolled students receive calendar invite
- [ ] "Join Session" button appears 15 min before session
- [ ] Button links to correct Google Meet room
- [ ] Teacher can add recording URL after session
- [ ] Recording appears in course content
- [ ] Students can watch recording

### Success Criteria
- ✅ Live sessions auto-scheduled with Google Meet
- ✅ Calendar invites sent to all enrolled students
- ✅ Recordings accessible after session ends
- ✅ No manual Google Meet creation needed

---

## PHASE 5: Quiz & Assessment System
**Duration:** 3-4 days  
**Status:** 📝 PLANNED

### Objectives
- Create quizzes (weekly + final exam)
- Multiple choice questions with auto-grading
- Time limits and deadlines
- Pass/fail based on score threshold (60%)
- Show results and review answers

### Database Schema

```sql
-- 1. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  week_id UUID REFERENCES course_weeks(id),
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'weekly', -- 'weekly', 'final'
  description TEXT,
  passing_score INTEGER DEFAULT 60,
  time_limit_minutes INTEGER DEFAULT 60,
  scheduled_at TIMESTAMP,
  deadline_at TIMESTAMP,
  instructions TEXT,
  total_marks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Quiz questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'mcq', -- 'mcq', 'true_false'
  options JSONB NOT NULL, -- ["Option A", "Option B", "Option C", "Option D"]
  correct_answer INTEGER NOT NULL, -- Index of correct option (0-3)
  marks INTEGER DEFAULT 1,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

-- 3. Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  answers JSONB NOT NULL, -- {"question_id": selected_option_index}
  score INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  passed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  time_taken_minutes INTEGER
);

-- Indexes
CREATE INDEX idx_quiz_attempts ON quiz_attempts(student_id, quiz_id);
CREATE INDEX idx_quiz_questions ON quiz_questions(quiz_id, order_index);
```

### Backend API

```typescript
// Quiz Management
POST   /api/courses/:id/quizzes          - Create quiz
GET    /api/quizzes/:id                  - Get quiz details
PUT    /api/quizzes/:id                  - Update quiz
DELETE /api/quizzes/:id                  - Delete quiz

// Questions
POST   /api/quizzes/:id/questions        - Add question
PUT    /api/questions/:id                - Update question
DELETE /api/questions/:id                - Delete question

// Taking Quiz
POST   /api/quizzes/:id/start            - Start quiz attempt
POST   /api/quizzes/:id/submit           - Submit quiz
GET    /api/quizzes/:id/result           - Get result
GET    /api/quizzes/:id/review           - Review answers
```

### Frontend Components

#### 5.1 Create Quiz (Teacher)
**File:** `frontend/app/teacher/courses/[id]/quiz/create/page.tsx`

```tsx
<QuizBuilder>
  <QuizInfo>
    - Title
    - Type (weekly/final)
    - Time limit
    - Passing score
    - Deadline
  </QuizInfo>
  
  <QuestionList>
    {questions.map(q => (
      <QuestionItem>
        - Question text
        - Options (A, B, C, D)
        - Correct answer
        - Marks
        - Explanation
      </QuestionItem>
    ))}
    <AddQuestionButton />
  </QuestionList>
  
  <SaveQuizButton />
</QuizBuilder>
```

#### 5.2 Take Quiz (Student)
**File:** `frontend/app/student/courses/[id]/quiz/[quizId]/page.tsx`

```tsx
<QuizInterface>
  <Timer countdown={timeRemaining} />
  
  <QuestionDisplay>
    <h3>Question {currentQuestion + 1} / {totalQuestions}</h3>
    <p>{question.text}</p>
    
    <OptionsGrid>
      {question.options.map((option, index) => (
        <OptionCard
          selected={selectedAnswer === index}
          onClick={() => selectAnswer(index)}
        >
          {option}
        </OptionCard>
      ))}
    </OptionsGrid>
  </QuestionDisplay>
  
  <Navigation>
    <PrevButton />
    <QuestionNav /> {/* Jump to any question */}
    <NextButton />
  </Navigation>
  
  <SubmitButton />
</QuizInterface>
```

#### 5.3 Quiz Results
**File:** `frontend/app/student/courses/[id]/quiz/[quizId]/result/page.tsx`

```tsx
<ResultsPage>
  <ScoreCard>
    <h2>Your Score: {score}/{totalMarks}</h2>
    <Percentage>{percentage}%</Percentage>
    <PassStatus passed={percentage >= 60}>
      {passed ? '✅ Passed' : '❌ Failed'}
    </PassStatus>
  </ScoreCard>
  
  <ReviewSection>
    {questions.map((q, index) => (
      <QuestionReview>
        <Question>{q.text}</Question>
        <YourAnswer correct={isCorrect}>
          {q.options[yourAnswer]}
        </YourAnswer>
        <CorrectAnswer>
          {q.options[q.correct_answer]}
        </CorrectAnswer>
        <Explanation>{q.explanation}</Explanation>
      </QuestionReview>
    ))}
  </ReviewSection>
</ResultsPage>
```

### Auto-Grading Logic

```typescript
export const gradeQuiz = (quizId, answers) => {
  // 1. Get all questions with correct answers
  const questions = await getQuizQuestions(quizId);
  
  // 2. Calculate score
  let score = 0;
  let totalMarks = 0;
  
  questions.forEach(q => {
    totalMarks += q.marks;
    if (answers[q.id] === q.correct_answer) {
      score += q.marks;
    }
  });
  
  // 3. Calculate percentage
  const percentage = (score / totalMarks) * 100;
  const passed = percentage >= quiz.passing_score;
  
  // 4. Save attempt
  const attempt = await createQuizAttempt({
    quiz_id: quizId,
    student_id: studentId,
    answers: answers,
    score: score,
    total_marks: totalMarks,
    percentage: percentage,
    passed: passed,
    submitted_at: new Date()
  });
  
  return { score, totalMarks, percentage, passed, attempt };
};
```

### Testing Checklist
- [ ] Teacher can create quiz with multiple questions
- [ ] Student can start quiz
- [ ] Timer counts down correctly
- [ ] Student can select answers
- [ ] Student can navigate between questions
- [ ] Submit button confirms submission
- [ ] Auto-grading calculates correct score
- [ ] Results show pass/fail status
- [ ] Review shows correct answers and explanations

### Success Criteria
- ✅ Quiz creation and management complete
- ✅ Auto-grading works accurately
- ✅ Pass/fail threshold enforced (60%)
- ✅ Students can review answers after submission

---

## PHASE 6: Certificate Generation
**Duration:** 2 days  
**Status:** 📝 PLANNED

### Objectives
- Auto-generate PDF certificate when eligible
- Requirements: 100% course completion + final exam passed (≥60%)
- Islamic design with student name, course, date
- Unique certificate number
- Email + download link

### Database Schema

```sql
-- Certificates table (enhance existing)
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS quiz_score DECIMAL(5,2);
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS final_exam_passed BOOLEAN;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100) UNIQUE;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP DEFAULT NOW();
```

### Backend Service

**File:** `backend/src/services/certificateService.ts`

```typescript
import PDFDocument from 'pdfkit';

export const generateCertificate = async (studentId, courseId) => {
  // 1. Check eligibility
  const enrollment = await getEnrollment(studentId, courseId);
  if (enrollment.progress < 100) {
    throw new Error('Course not 100% completed');
  }
  
  const finalExam = await getFinalExamAttempt(studentId, courseId);
  if (!finalExam || finalExam.percentage < 60) {
    throw new Error('Final exam not passed (need ≥60%)');
  }
  
  // 2. Get data
  const student = await getUserProfile(studentId);
  const course = await getCourseById(courseId);
  
  // 3. Generate certificate number
  const certNumber = generateCertificateNumber(); // e.g., "IA-2025-00123"
  
  // 4. Create PDF
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  
  // Add Islamic design border
  doc.rect(20, 20, 792, 552).stroke('#1e7d32');
  doc.rect(30, 30, 772, 532).stroke('#1e7d32');
  
  // Add mosque icon or Islamic pattern
  // ... add decorative elements
  
  // Certificate text
  doc.fontSize(32)
     .font('Helvetica-Bold')
     .fillColor('#1e7d32')
     .text('Certificate of Completion', 50, 100, { align: 'center' });
  
  doc.fontSize(16)
     .font('Helvetica')
     .fillColor('#000')
     .text('This is to certify that', 50, 180, { align: 'center' });
  
  doc.fontSize(28)
     .font('Helvetica-Bold')
     .text(student.full_name, 50, 220, { align: 'center' });
  
  doc.fontSize(16)
     .font('Helvetica')
     .text('has successfully completed the course', 50, 270, { align: 'center' });
  
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .fillColor('#1e7d32')
     .text(course.title, 50, 310, { align: 'center' });
  
  doc.fontSize(14)
     .font('Helvetica')
     .fillColor('#000')
     .text(`with a final score of ${finalExam.percentage}%`, 50, 360, { align: 'center' });
  
  // Date and certificate number
  doc.fontSize(12)
     .text(`Issued on: ${formatDate(new Date())}`, 50, 450, { align: 'center' })
     .text(`Certificate No: ${certNumber}`, 50, 470, { align: 'center' });
  
  // Signature
  doc.text('_____________________', 100, 520)
     .text('Islamic Academy', 100, 540, { width: 200 });
  
  doc.end();
  
  const pdfBuffer = Buffer.concat(buffers);
  
  // 5. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('certificates')
    .upload(`${certNumber}.pdf`, pdfBuffer, {
      contentType: 'application/pdf'
    });
  
  const certificateUrl = supabase.storage
    .from('certificates')
    .getPublicUrl(data.path).data.publicUrl;
  
  // 6. Save to database
  await supabase.from('certificates').insert({
    student_id: studentId,
    course_id: courseId,
    certificate_url: certificateUrl,
    certificate_number: certNumber,
    quiz_score: finalExam.percentage,
    final_exam_passed: true,
    issued_at: new Date()
  });
  
  // 7. Send email
  await emailService.sendCertificate(student.email, {
    studentName: student.full_name,
    courseName: course.title,
    certificateUrl: certificateUrl
  });
  
  return certificateUrl;
};

// Generate unique certificate number
const generateCertificateNumber = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `IA-${year}-${random}`;
};
```

### Frontend Display

**File:** `frontend/app/student/courses/[id]/certificate/page.tsx`

```tsx
<CertificatePage>
  {!eligible ? (
    <NotEligible>
      <h2>Certificate Not Available</h2>
      <p>Complete all requirements:</p>
      <ul>
        <li>✅ Complete 100% of course content</li>
        <li>❌ Pass final exam (≥60%)</li>
      </ul>
    </NotEligible>
  ) : certificate ? (
    <CertificateCard>
      <h2>🎓 Your Certificate</h2>
      <img src={certificate.url} alt="Certificate" />
      <DownloadButton href={certificate.url} download>
        📥 Download Certificate
      </DownloadButton>
      <ShareButton>
        🔗 Share on LinkedIn
      </ShareButton>
    </CertificateCard>
  ) : (
    <GenerateCertificate>
      <h2>You're Eligible!</h2>
      <button onClick={handleGenerate}>
        🎓 Generate Certificate
      </button>
    </GenerateCertificate>
  )}
</CertificatePage>
```

### Testing Checklist
- [ ] Certificate generates only when eligible
- [ ] PDF has Islamic design and correct info
- [ ] Certificate number is unique
- [ ] PDF uploads to Supabase Storage
- [ ] Download link works
- [ ] Email sent with certificate attachment
- [ ] Certificate saved in database

### Success Criteria
- ✅ Auto-generates when requirements met
- ✅ Professional Islamic design
- ✅ Unique certificate number
- ✅ Downloadable PDF
- ✅ Email notification sent

---

## PHASE 7: Chat & Discussion System
**Duration:** 2 days  
**Status:** 📝 PLANNED

### Objectives
- Enable communication between teacher and students within course
- Thread-based discussions (like comments)
- Weekly discussion sections
- Announcements from teacher

### Implementation

**Frontend:** `frontend/app/student/courses/[id]/learn/page.tsx`

```tsx
<CoursePage>
  <Sidebar>
    <WeekList />
  </Sidebar>
  
  <MainContent>
    <ContentPlayer />
    
    {/* Discussion Tab */}
    <Tabs>
      <Tab name="Content" />
      <Tab name="Discussion" active />
    </Tabs>
    
    <DiscussionSection>
      <MessageList>
        {messages.map(msg => (
          <MessageCard>
            <Avatar src={msg.user.avatar} />
            <MessageContent>
              <Author>{msg.user.name}</Author>
              <Role>{msg.user.role}</Role>
              <Text>{msg.message}</Text>
              <Timestamp>{formatDate(msg.created_at)}</Timestamp>
              
              {/* Replies */}
              {msg.replies && (
                <Replies>
                  {msg.replies.map(reply => (
                    <ReplyCard>...</ReplyCard>
                  ))}
                </Replies>
              )}
              
              <ReplyButton onClick={() => replyTo(msg.id)}>
                Reply
              </ReplyButton>
            </MessageContent>
          </MessageCard>
        ))}
      </MessageList>
      
      <MessageInput>
        <textarea placeholder="Ask a question..." />
        <SendButton>Send</SendButton>
      </MessageInput>
    </DiscussionSection>
  </MainContent>
</CoursePage>
```

### Backend API

```typescript
// GET /api/courses/:id/messages
export const getCourseMessages = async (courseId, weekId) => {
  const query = supabase
    .from('course_messages')
    .select('*')
    .eq('course_id', courseId);
  
  if (weekId) {
    query.eq('week_id', weekId);
  }
  
  return query.order('created_at', { ascending: false });
};

// POST /api/courses/:id/messages
export const postMessage = async (courseId, messageData) => {
  return supabase.from('course_messages').insert({
    course_id: courseId,
    week_id: messageData.week_id,
    user_id: messageData.user_id,
    user_name: messageData.user_name,
    user_role: messageData.user_role,
    message: messageData.message,
    parent_id: messageData.parent_id // For replies
  });
};
```

### Testing Checklist
- [ ] Students can post messages in course
- [ ] Teacher can reply to student questions
- [ ] Reply threading works correctly
- [ ] Messages display in chronological order
- [ ] Per-week discussions work

### Success Criteria
- ✅ Two-way communication between teacher and students
- ✅ Thread-based discussions
- ✅ Per-week discussion sections

---

## PHASE 8: Performance & Scalability
**Duration:** 2-3 days  
**Status:** 📝 PLANNED

### Objectives
- Optimize for 15,000 concurrent users
- Add caching layer
- Database query optimization
- CDN for static assets
- Load testing

### Implementation Steps

#### 8.1 Database Optimization

```sql
-- Add indexes for frequently queried data
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course 
ON enrollments(student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_course_content_week 
ON course_content(week_id, order_index);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student 
ON quiz_attempts(student_id, quiz_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_progress_student 
ON content_progress(student_id, completed);

CREATE INDEX IF NOT EXISTS idx_meeting_bookings_date 
ON meeting_bookings(meeting_date, teacher_id, approval_status);

-- Add partial indexes for active data
CREATE INDEX IF NOT EXISTS idx_published_courses 
ON courses(published_at) WHERE published_at IS NOT NULL;

-- Analyze tables for query optimization
ANALYZE courses;
ANALYZE enrollments;
ANALYZE course_content;
ANALYZE quiz_attempts;
```

#### 8.2 Redis Caching

**Install Redis:**
```bash
npm install ioredis
```

**Backend:** `backend/src/services/cacheService.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class CacheService {
  static async get(key: string) {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  static async set(key: string, value: any, ttl = 300) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }
  
  static async del(key: string) {
    await redis.del(key);
  }
  
  // Cache teacher availability
  static async getTeacherSlots(teacherId: string) {
    const key = `teacher:${teacherId}:slots`;
    let slots = await this.get(key);
    
    if (!slots) {
      slots = await TeacherSlotService.getAvailableSlots(teacherId);
      await this.set(key, slots, 60); // 1 minute TTL
    }
    
    return slots;
  }
  
  // Cache course listings
  static async getCourses(filters: any) {
    const key = `courses:${JSON.stringify(filters)}`;
    let courses = await this.get(key);
    
    if (!courses) {
      courses = await CourseService.getAllCourses(filters);
      await this.set(key, courses, 300); // 5 minutes TTL
    }
    
    return courses;
  }
  
  // Invalidate cache when data changes
  static async invalidateCourseCache(courseId: string) {
    await this.del(`course:${courseId}`);
    // Also invalidate list caches
    const keys = await redis.keys('courses:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

#### 8.3 Rate Limiting (Already Implemented)

**Backend:** `backend/src/server.ts`

```typescript
import rateLimit from 'express-rate-limit';

// API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min
  message: 'Too many requests, please try again later.'
});

app.use('/api/', apiLimiter);

// Auth endpoints stricter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/', authLimiter);
```

#### 8.4 Connection Pooling (Already Configured)

Supabase handles this automatically with:
- Max 60 connections per project (Pro plan)
- Connection pooling enabled by default
- For 15K users: Not all query simultaneously
- Average: 100-200 concurrent DB connections

#### 8.5 Load Testing

**Install k6:**
```bash
npm install -g k6
```

**Load test script:** `load-tests/course-enrollment.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 1000 },   // Ramp up to 1000 users
    { duration: '5m', target: 5000 },   // Ramp up to 5000 users
    { duration: '10m', target: 15000 }, // Ramp up to 15000 users
    { duration: '5m', target: 0 },      // Ramp down
  ],
};

export default function () {
  // Test course listing
  let response = http.get('https://academy-two-green.vercel.app/api/courses');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // Test course enrollment
  response = http.post('https://academy-q5jv.vercel.app/api/courses/abc123/enroll', {
    headers: { 'Authorization': 'Bearer token' }
  });
  check(response, {
    'enrollment status is 200': (r) => r.status === 200,
  });
  
  sleep(2);
}
```

**Run test:**
```bash
k6 run load-tests/course-enrollment.js
```

#### 8.6 CDN Configuration

**Vercel automatically provides:**
- ✅ Global CDN for static assets
- ✅ Edge caching for API responses
- ✅ Image optimization
- ✅ Automatic compression (gzip/brotli)

**Additional optimization:**

```typescript
// Next.js Image Optimization
import Image from 'next/image';

<Image 
  src={course.thumbnail} 
  width={300} 
  height={200}
  loading="lazy"
  alt={course.title}
/>
```

### Scalability Summary

**Expected Performance at 15,000 Users:**

| Metric | Target | Implementation |
|--------|--------|----------------|
| Concurrent Users | 15,000 | ✅ Vercel auto-scales |
| DB Connections | 100-200 | ✅ Supabase pooling |
| API Response Time | < 500ms | ✅ Caching + indexes |
| Course Page Load | < 2s | ✅ CDN + optimization |
| Video Streaming | N/A | ✅ YouTube handles it |
| Google Meet | Unlimited | ✅ Google handles it |

**Cost Estimate at 15K Users:**
- Supabase Pro: $25/month
- Vercel Pro: $20/month
- Google Workspace: $6/user × 20 teachers = $120/month
- **Total: ~$165/month**

### Testing Checklist
- [ ] All database indexes created
- [ ] Redis caching implemented
- [ ] Cache invalidation works correctly
- [ ] Load test with 100 users passes
- [ ] Load test with 1000 users passes
- [ ] Load test with 5000 users passes
- [ ] Load test with 15000 users passes
- [ ] API response times < 500ms
- [ ] No database connection errors

### Success Criteria
- ✅ System handles 15,000 concurrent users
- ✅ API response times under 500ms
- ✅ No database bottlenecks
- ✅ Costs remain under $200/month

---

## Testing & Deployment Strategy

### Testing Phases

#### 1. Unit Testing
- Test individual functions (course creation, enrollment, quiz grading)
- Test API endpoints with Postman/Thunder Client
- Verify database queries return correct data

#### 2. Integration Testing
- Test complete user flows:
  - Student enrolls → watches video → takes quiz → gets certificate
  - Teacher creates course → adds content → schedules live session
  - Admin generates meet link → students join → recording saved

#### 3. Load Testing
- Use k6 to simulate 15,000 concurrent users
- Monitor database performance
- Check API response times
- Verify no connection timeouts

#### 4. User Acceptance Testing (UAT)
- Test with real teachers and students
- Gather feedback on UI/UX
- Fix critical bugs before launch

### Deployment Checklist

#### Backend Deployment (Vercel)
- [ ] Push all code to GitHub
- [ ] Configure environment variables in Vercel:
  - Database credentials
  - Clerk keys
  - Razorpay keys
  - Google Calendar API credentials
  - Redis URL (if using)
- [ ] Run database migrations on Supabase
- [ ] Deploy backend to Vercel
- [ ] Test API endpoints in production
- [ ] Monitor logs for errors

#### Frontend Deployment (Vercel)
- [ ] Build frontend locally to check for errors
- [ ] Configure environment variables:
  - Clerk public key
  - Backend API URL (production)
  - Supabase URL
  - Razorpay key
- [ ] Deploy frontend to Vercel
- [ ] Test all pages in production
- [ ] Verify authentication works
- [ ] Test payment flow

#### Database Setup
- [ ] Run all SQL migrations in order:
  1. `create-course-system.sql`
  2. `add-google-meet-fields.sql`
  3. `create-quiz-system.sql`
  4. `enhance-certificates.sql`
- [ ] Create database indexes
- [ ] Enable Row Level Security (RLS) policies
- [ ] Backup database before major changes

#### Google Calendar API Setup
- [ ] Create Google Cloud Project
- [ ] Enable Google Calendar API
- [ ] Create Service Account
- [ ] Download credentials JSON
- [ ] Add service account email to Google Calendar
- [ ] Grant domain-wide delegation
- [ ] Add credentials to backend `.env`

### Monitoring & Maintenance

#### Production Monitoring
- Vercel Analytics for frontend performance
- Supabase Dashboard for database metrics
- Custom logging for critical events:
  - Course enrollments
  - Payment transactions
  - Quiz submissions
  - Certificate generations
  - Google Meet link creations

#### Regular Maintenance Tasks
- Weekly: Review error logs
- Monthly: Database cleanup (old quiz attempts, expired sessions)
- Quarterly: Performance optimization review
- As needed: Scale up infrastructure if usage increases

---

## Summary & Timeline

### Total Duration: 3-4 Weeks

| Phase | Days | Status |
|-------|------|--------|
| Phase 1: Fix Current Issues | 1-2 | ✅ COMPLETED |
| Phase 2: Auto Google Meet | 2-3 | 📝 READY TO START |
| Phase 3: Course System MVP | 5-7 | 📝 PLANNED |
| Phase 4: Live Sessions | 2-3 | 📝 PLANNED |
| Phase 5: Quiz System | 3-4 | 📝 PLANNED |
| Phase 6: Certificates | 2 | 📝 PLANNED |
| Phase 7: Chat/Discussion | 2 | 📝 PLANNED |
| Phase 8: Performance | 2-3 | 📝 PLANNED |
| **Total** | **19-24 days** | |

### Key Deliverables

1. ✅ **Auto Google Meet Generation**
   - Admin clicks button → Meet link created
   - Calendar invites sent to all participants
   - Automatic 30-minute reminders

2. ✅ **Complete Course System**
   - Hybrid: Recorded videos + live sessions
   - Browse courses, enroll, track progress
   - Weekly structure with unlockable content

3. ✅ **Quiz & Assessment**
   - Weekly quizzes + final exam
   - Auto-grading with instant results
   - Pass threshold: 60%

4. ✅ **Certificate Generation**
   - Auto-generates when eligible
   - Professional PDF with Islamic design
   - Email notification + download

5. ✅ **Scalability**
   - Handles 15,000 concurrent users
   - Database optimization
   - Caching layer
   - Load tested

### Next Steps

**Ready to start Phase 2: Auto Google Meet Integration**

When you're ready, just say:
- "Start Phase 2" - I'll begin implementing Google Meet auto-generation
- "Explain Phase X" - I'll explain any phase in detail
- "Change Phase X" - I'll modify the plan based on your feedback

---

**Document Version:** 1.0  
**Last Updated:** December 1, 2025  
**Status:** READY FOR IMPLEMENTATION
