# Interview-Based Final Exams & Class Management

## Overview

This document covers the advanced features added to the LMS system:

1. **Interview-Based Final Exams** - Schedule and manage one-on-one or group interviews
2. **Student Categorization** - Organize students into groups for targeted scheduling
3. **Class Cancellation Management** - Handle cancellations and rescheduling
4. **Chapter Organization** - Structure recorded videos by chapters within weeks

---

## 🎯 Interview-Based Final Exams

### Features

#### For Students
- Browse available interview time slots
- Book interview appointments
- Receive meeting links (Google Meet, Zoom, Teams)
- Confirm scheduled interviews
- Reschedule if needed (within deadline)
- View interview results and feedback

#### For Admins/Teachers
- Configure interview settings (platform, duration, capacity)
- Create student categories
- Generate time slots
- Assign students to categories
- Reserve slots for specific categories
- Track bookings and attendance
- Enter scores and feedback

### Interview Settings

```typescript
interface FinalExamInterviewSettings {
  platform: 'google_meet' | 'zoom' | 'teams';
  slotDuration_minutes: number;         // e.g., 30
  maxStudentsPerSlot: number;           // 1 for individual, >1 for group
  categorizeStudents: boolean;          // Enable student categorization
  allowRescheduling: boolean;           // Allow students to reschedule
  rescheduleDeadline?: string;          // Last date to reschedule
  requiresConfirmation: boolean;        // Students must confirm booking
}
```

### Student Categories

Organize students into categories for better scheduling:

```typescript
interface StudentExamCategory {
  id: string;
  name: string;                         // e.g., "Beginners", "Advanced", "VIP"
  description?: string;
  color: string;                        // Hex color for UI
  priority: number;                     // 1-10, affects slot reservation
  studentIds: string[];                 // Assigned students
}
```

**Common Categories:**
- **Beginners** - Students needing more time/support
- **Intermediate** - Regular students
- **Advanced** - High performers
- **Special Needs** - Students requiring accommodations
- **VIP** - Priority students

### Time Slots

```typescript
interface ExamTimeSlot {
  id: string;
  date: string;                         // YYYY-MM-DD
  startTime: string;                    // HH:MM
  endTime: string;                      // Auto-calculated
  maxStudents: number;
  bookedStudents: number;
  categoryId?: string;                  // Reserved for category
  meetingUrl?: string;                  // Generated meeting link
  meetingPassword?: string;
  status: 'available' | 'full' | 'completed' | 'cancelled';
}
```

### Student Interview Record

```typescript
interface StudentExamInterview {
  id: string;
  studentId: string;
  examId: string;
  slotId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration_minutes: number;
  platform: 'google_meet' | 'zoom' | 'teams';
  meetingUrl: string;
  meetingPassword?: string;
  status: 'pending' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  confirmedAt?: string;
  marksObtained?: number;
  feedback?: string;
  conductedBy?: string;                 // Teacher/examiner ID
  rescheduledFrom?: string;             // Original slot ID if rescheduled
  rescheduledTo?: string;               // New slot ID
  rescheduledReason?: string;
}
```

---

## 📅 Student Interview Booking Flow

### Step 1: View Available Slots
```tsx
import FinalExamInterview from '@/components/student/FinalExamInterview';

<FinalExamInterview
  exam={examData}
  studentId="student-123"
  studentCategory="intermediate"
/>
```

### Step 2: Select & Book Slot
- Student sees list of available slots
- Slots show date, time, spots left
- Category-reserved slots are marked
- Click to select, confirm to book

### Step 3: Receive Confirmation
- Meeting link generated automatically
- Email notification sent
- Calendar invite (optional)
- Reminder notifications before interview

### Step 4: Confirm Attendance (if required)
- Student must confirm 24-48 hours before
- Unconfirmed slots may be released

### Step 5: Join Interview
- Click "Join Interview" button
- Opens meeting in new tab
- Meeting password displayed if needed

### Step 6: View Results
- Results published after grading
- Score and feedback visible
- Contributes to final grade

---

## 🎬 Admin Interview Scheduler

### Setup Interview Exam

```tsx
import ExamInterviewScheduler from '@/components/admin/ExamInterviewScheduler';

<ExamInterviewScheduler
  exam={examData}
  courseId="course-123"
/>
```

### Workflow

#### 1. Configure Settings
```typescript
// Set basic interview parameters
{
  platform: 'google_meet',              // Choose platform
  slotDuration_minutes: 30,             // Individual interview time
  maxStudentsPerSlot: 1,                // 1 = individual, >1 = group
  categorizeStudents: true,             // Enable categories
  allowRescheduling: true,
  rescheduleDeadline: '2024-01-15',
  requiresConfirmation: true
}
```

#### 2. Create Student Categories
```typescript
// Example categories
const categories = [
  {
    name: "Beginners",
    description: "Students who need extra time",
    color: "#10b981",
    priority: 1,
    studentIds: []
  },
  {
    name: "Advanced",
    description: "High-performing students",
    color: "#3b82f6",
    priority: 5,
    studentIds: []
  }
];
```

#### 3. Assign Students to Categories
- View list of enrolled students
- Search and filter students
- Assign each student to appropriate category
- Bulk assignment supported

#### 4. Create Time Slots
```typescript
// Generate slots
const slot = {
  date: "2024-01-20",
  startTime: "09:00",
  endTime: "09:30",                     // Auto-calculated
  maxStudents: 1,
  categoryId: "category-beginners",     // Optional: reserve for category
  status: "available"
};
```

**Tips for Slot Creation:**
- Create slots in advance (1-2 weeks)
- Consider time zones
- Allow buffer time between slots
- Reserve early/late slots for special categories
- Create backup slots

#### 5. Generate Meeting Links

**Option A: Auto-generate (Recommended)**
```javascript
// API will generate meeting links automatically
// Requires integration with Google Meet/Zoom/Teams API
```

**Option B: Manual Entry**
```javascript
// Admin manually creates and pastes meeting links
// Useful for testing or custom setups
```

#### 6. Monitor Bookings
- View real-time booking status
- See which students booked which slots
- Check for unconfirmed bookings
- Send reminder notifications

#### 7. Conduct Interviews
- Join meeting at scheduled time
- Use rubric/checklist for evaluation
- Take notes during interview

#### 8. Enter Scores & Feedback
```typescript
interface InterviewResult {
  studentId: string;
  marksObtained: number;
  maxMarks: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
  conductedBy: string;
  conductedAt: string;
}
```

---

## 🚫 Class Cancellation Management

### Features

- Cancel scheduled classes with reason
- Option to reschedule to new date/time
- Automatic student notifications
- Display cancellation info in schedule
- Track cancellation history

### Cancel a Class

```tsx
import ClassCancellationManager from '@/components/teacher/ClassCancellationManager';

const handleCancel = async (
  reason: string,
  rescheduleDate?: string,
  rescheduleTime?: string
) => {
  await fetch(`/api/courses/${courseId}/classes/${classId}/cancel`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cancellationReason: reason,
      cancelledBy: teacherId,
      cancelledAt: new Date().toISOString(),
      rescheduledTo: rescheduleDate && rescheduleTime 
        ? `${rescheduleDate}T${rescheduleTime}` 
        : undefined,
      notifyStudents: true
    })
  });
};

<ClassCancellationManager
  classData={classData}
  courseId={courseId}
  onCancel={handleCancel}
  onClose={() => setShowModal(false)}
/>
```

### Cancellation Data

```typescript
interface WeekClass {
  // ... other fields
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  cancellationReason?: string;
  cancelledBy?: string;                 // Teacher ID
  cancelledAt?: string;                 // ISO timestamp
  rescheduledTo?: string;               // New date/time
  meetingPlatform?: 'google_meet' | 'zoom' | 'teams';
}
```

### Student View of Cancelled Class

When a class is cancelled, students see:
- ~~Strikethrough title~~
- Red "CANCELLED" badge
- Cancellation reason in red alert box
- Rescheduled date/time (if applicable)
- "Join Meeting" button hidden
- Notification sent via email/app

---

## 📚 Chapter Organization

### Structure

Videos are now organized by chapters within weeks:

```
Course
└── Week 1
    ├── Chapter 1: Introduction
    │   ├── Video 1: Welcome
    │   ├── Video 2: Overview
    │   └── Resources
    ├── Chapter 2: Basics
    │   ├── Video 1: Fundamentals
    │   ├── Video 2: Practice
    │   └── Quiz
    └── Activity: Week 1 Assignment
```

### Chapter Data

```typescript
interface WeekChapter {
  id: string;
  weekId: string;
  chapterNumber: number;
  title: string;
  description?: string;
  videos: WeekVideo[];
  resources: CourseResource[];
  isCompleted: boolean;
  completedAt?: string;
}
```

### Video with Chapter Link

```typescript
interface WeekVideo {
  // ... other fields
  chapterId?: string;                   // Link to chapter
  chapterLabel?: string;                // e.g., "Chapter 1"
  sourceType?: 'live_recording' | 'uploaded';
  sourceClassId?: string;               // If from live class recording
}
```

### Adding Recorded Videos to Chapters

**After Live Class:**
1. Class completes successfully
2. Recording available
3. Teacher/Admin adds recording to appropriate chapter
4. Video linked to source class via `sourceClassId`
5. Students can watch recording in chapter section

```typescript
// Example: Add live class recording to chapter
const addRecordingToChapter = async (
  classId: string,
  chapterId: string,
  recordingUrl: string
) => {
  await fetch(`/api/chapters/${chapterId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "Live Class Recording",
      videoUrl: recordingUrl,
      sourceType: 'live_recording',
      sourceClassId: classId,
      chapterId: chapterId
    })
  });
};
```

---

## 🔗 API Endpoints

### Interview Management

```
POST   /api/exams/:examId/interview/settings
PUT    /api/exams/:examId/interview/settings

POST   /api/exams/:examId/categories
GET    /api/exams/:examId/categories
PUT    /api/exams/:examId/categories/:categoryId
DELETE /api/exams/:examId/categories/:categoryId

POST   /api/exams/:examId/interview-slots
GET    /api/exams/:examId/interview-slots
PUT    /api/exams/:examId/interview-slots/:slotId
DELETE /api/exams/:examId/interview-slots/:slotId

GET    /api/exams/:examId/available-slots
POST   /api/exams/:examId/interviews/book
PUT    /api/exams/:examId/interviews/:interviewId/confirm
PUT    /api/exams/:examId/interviews/:interviewId/reschedule
POST   /api/exams/:examId/interviews/:interviewId/results
```

### Class Management

```
PUT    /api/courses/:courseId/classes/:classId/cancel
PUT    /api/courses/:courseId/classes/:classId/reschedule
POST   /api/courses/:courseId/classes/:classId/cancel/notify
```

### Chapter Management

```
GET    /api/courses/:courseId/weeks/:weekId/chapters
POST   /api/courses/:courseId/weeks/:weekId/chapters
PUT    /api/courses/:courseId/weeks/:weekId/chapters/:chapterId
DELETE /api/courses/:courseId/weeks/:weekId/chapters/:chapterId

POST   /api/chapters/:chapterId/videos
PUT    /api/chapters/:chapterId/videos/:videoId
DELETE /api/chapters/:chapterId/videos/:videoId
```

---

## 📧 Notification Templates

### Class Cancellation Email

```
Subject: Class Cancelled - [Course Name]

Dear [Student Name],

We regret to inform you that the following class has been cancelled:

Class: [Class Title]
Original Date: [Date]
Original Time: [Time]

Reason: [Cancellation Reason]

[If rescheduled:]
New Schedule:
Date: [New Date]
Time: [New Time]
Meeting Link: [Link]

We apologize for any inconvenience this may cause.

Best regards,
[Teacher Name]
Little Muslim Academy
```

### Interview Booking Confirmation

```
Subject: Interview Scheduled - [Exam Name]

Dear [Student Name],

Your final exam interview has been scheduled:

Exam: [Exam Title]
Date: [Interview Date]
Time: [Interview Time]
Duration: [Duration] minutes
Platform: [Google Meet/Zoom/Teams]

Meeting Link: [Link]
[If password required:] Password: [Password]

Please join the meeting 5 minutes early. Make sure you have:
✓ Stable internet connection
✓ Working camera and microphone
✓ Student ID ready
✓ Quiet environment

If you need to reschedule, please do so before [Reschedule Deadline].

Good luck!

Little Muslim Academy
```

### Interview Reminder (24 hours before)

```
Subject: Reminder: Interview Tomorrow - [Exam Name]

Dear [Student Name],

This is a reminder that your final exam interview is scheduled for tomorrow:

Date: [Tomorrow's Date]
Time: [Interview Time]
Meeting Link: [Link]

Please confirm your attendance by clicking the button below:
[Confirm Attendance Button]

If you cannot attend, please reschedule as soon as possible.

See you tomorrow!
Little Muslim Academy
```

---

## 🎨 UI Components

### Student Components

| Component | Purpose |
|-----------|---------|
| `FinalExamInterview.tsx` | Student view for booking and managing interview appointments |
| `CourseSchedule.tsx` | Shows weekly schedule with chapters, classes (including cancelled ones) |

### Admin/Teacher Components

| Component | Purpose |
|-----------|---------|
| `ExamInterviewScheduler.tsx` | Admin interface for creating categories, slots, and managing interviews |
| `ClassCancellationManager.tsx` | Teacher interface for cancelling/rescheduling classes |

---

## 🔄 Integration Guide

### Step 1: Database Setup

Create necessary tables:
- `exam_interview_settings`
- `student_exam_categories`
- `exam_time_slots`
- `student_exam_interviews`
- Update `classes` table with cancellation fields
- Update `videos` table with chapter fields

### Step 2: Meeting Platform Integration

#### Google Meet API
```javascript
// Generate Google Meet links
const { google } = require('googleapis');

async function createGoogleMeetLink(date, time, duration) {
  const event = {
    summary: 'Final Exam Interview',
    start: { dateTime: `${date}T${time}:00` },
    end: { dateTime: /* calculate end time */ },
    conferenceData: {
      createRequest: { requestId: uuid() }
    }
  };
  
  const calendar = google.calendar({ version: 'v3', auth });
  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1
  });
  
  return response.data.hangoutLink;
}
```

#### Zoom API
```javascript
// Generate Zoom meeting links
async function createZoomMeeting(date, time, duration) {
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${zoomToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: 'Final Exam Interview',
      type: 2,
      start_time: `${date}T${time}:00`,
      duration: duration,
      settings: {
        join_before_host: false,
        waiting_room: true
      }
    })
  });
  
  const data = await response.json();
  return {
    joinUrl: data.join_url,
    password: data.password
  };
}
```

### Step 3: Notification Service

```javascript
// Email notification service
async function sendClassCancellationEmail(classData, students, reason, newSchedule) {
  for (const student of students) {
    await sendEmail({
      to: student.email,
      subject: `Class Cancelled - ${classData.title}`,
      template: 'class-cancellation',
      data: {
        studentName: student.name,
        classTitle: classData.title,
        originalDate: classData.date,
        originalTime: classData.time,
        reason: reason,
        newSchedule: newSchedule
      }
    });
  }
}
```

### Step 4: Frontend Integration

```tsx
// In your course page
import FinalExamInterview from '@/components/student/FinalExamInterview';
import ExamInterviewScheduler from '@/components/admin/ExamInterviewScheduler';
import ClassCancellationManager from '@/components/teacher/ClassCancellationManager';

// Student view
{exam.type === 'interview' && (
  <FinalExamInterview
    exam={exam}
    studentId={currentUser.id}
    studentCategory={enrollment.studentCategory}
  />
)}

// Admin view
{isAdmin && exam.type === 'interview' && (
  <ExamInterviewScheduler
    exam={exam}
    courseId={course.id}
  />
)}

// Teacher view
{isTeacher && (
  <button onClick={() => setShowCancelModal(true)}>
    Cancel Class
  </button>
)}

{showCancelModal && (
  <ClassCancellationManager
    classData={selectedClass}
    courseId={course.id}
    onCancel={handleCancelClass}
    onClose={() => setShowCancelModal(false)}
  />
)}
```

---

## 🧪 Testing Checklist

### Interview Booking Flow
- [ ] Student can view available slots
- [ ] Student can book an available slot
- [ ] Booking prevents overbooking
- [ ] Meeting link is generated correctly
- [ ] Student receives confirmation email
- [ ] Student can confirm attendance
- [ ] Student can reschedule before deadline
- [ ] Student can join meeting via link
- [ ] Admin can view all bookings
- [ ] Admin can enter scores and feedback
- [ ] Scores appear in student's grading sheet

### Student Categorization
- [ ] Admin can create categories
- [ ] Admin can assign students to categories
- [ ] Category colors display correctly
- [ ] Reserved slots only show for category members
- [ ] Category priority affects slot ordering

### Class Cancellation
- [ ] Teacher can cancel a class
- [ ] Cancellation reason is required
- [ ] Students receive cancellation notification
- [ ] Cancelled class shows in schedule with badge
- [ ] Teacher can reschedule cancelled class
- [ ] Rescheduled date displays correctly

### Chapter Organization
- [ ] Chapters display in correct order
- [ ] Videos appear under correct chapter
- [ ] Chapter completion tracking works
- [ ] Live recordings link to source class

---

## 📱 Mobile Responsiveness

All components are mobile-responsive:

- Interview booking works on mobile
- Time slot selection touch-friendly
- Cancellation form scrollable on small screens
- Chapter navigation collapsible on mobile
- Meeting links open in mobile apps

---

## 🔒 Security Considerations

1. **Meeting Link Access**
   - Only enrolled students can see meeting links
   - Links expire after interview time
   - Waiting rooms enabled by default

2. **Slot Booking**
   - Prevent double booking
   - Validate student eligibility
   - Check time conflicts

3. **Cancellation Authorization**
   - Only assigned teacher can cancel
   - Require admin approval for mass cancellations
   - Log all cancellation actions

4. **Category Privacy**
   - Students don't see which category they're in
   - Category names are admin-only
   - Slots shown based on eligibility without revealing category

---

## 🎯 Best Practices

### For Admins
1. **Create categories early** - Assign students at course start
2. **Generate slots in advance** - At least 1-2 weeks before deadline
3. **Send reminders** - 1 week, 1 day, 1 hour before interviews
4. **Have backup slots** - For technical issues or no-shows
5. **Test meeting links** - Verify all links work before interviews

### For Teachers
1. **Cancel early** - Give students maximum notice
2. **Always reschedule** - Don't just cancel unless absolutely necessary
3. **Provide detailed reasons** - Students appreciate transparency
4. **Record interviews** - For quality assurance (with permission)
5. **Enter scores promptly** - Within 24-48 hours

### For Students
1. **Book early** - Popular times fill up fast
2. **Test your setup** - Check camera/mic before interview
3. **Join 5 minutes early** - Shows professionalism
4. **Have backup plan** - Know what to do if technical issues occur
5. **Confirm your slot** - Don't let your booking expire

---

## 🚀 Future Enhancements

- [ ] AI-powered interview scheduling optimization
- [ ] Automatic recording of interviews
- [ ] Real-time interview rubric scoring
- [ ] Student preference-based scheduling
- [ ] Bulk slot generation tool
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] SMS reminders
- [ ] Interview practice mode
- [ ] Peer review for group interviews
- [ ] Analytics dashboard for interview performance

---

## 📞 Support

For questions or issues:
- Check [LMS_SYSTEM.md](./LMS_SYSTEM.md) for general LMS documentation
- See [LMS_QUICKSTART.md](./LMS_QUICKSTART.md) for setup guide
- Contact: support@littlemuslimacademy.com
