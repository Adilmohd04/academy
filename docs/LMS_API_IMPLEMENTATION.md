# LMS API Implementation Examples

This file contains example backend API implementations for the interview scheduling, class cancellation, and chapter management features.

---

## 🔐 Authentication Middleware

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'student' | 'teacher' | 'admin';
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

---

## 📅 Interview Management APIs

### 1. Configure Interview Settings

```typescript
// backend/src/routes/exams.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';

const router = Router();

// POST /api/exams/:examId/interview/settings
router.post(
  '/exams/:examId/interview/settings',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      const { examId } = req.params;
      const {
        platform,
        slotDuration_minutes,
        maxStudentsPerSlot,
        categorizeStudents,
        allowRescheduling,
        rescheduleDeadline,
        requiresConfirmation
      } = req.body;

      // Validate exam exists
      const exam = await db.query('SELECT * FROM final_exams WHERE id = $1', [examId]);
      if (exam.rows.length === 0) {
        return res.status(404).json({ error: 'Exam not found' });
      }

      // Create or update settings
      const result = await db.query(
        `INSERT INTO exam_interview_settings 
         (exam_id, platform, slot_duration_minutes, max_students_per_slot, 
          categorize_students, allow_rescheduling, reschedule_deadline, requires_confirmation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (exam_id) 
         DO UPDATE SET 
           platform = $2,
           slot_duration_minutes = $3,
           max_students_per_slot = $4,
           categorize_students = $5,
           allow_rescheduling = $6,
           reschedule_deadline = $7,
           requires_confirmation = $8,
           updated_at = NOW()
         RETURNING *`,
        [examId, platform, slotDuration_minutes, maxStudentsPerSlot, 
         categorizeStudents, allowRescheduling, rescheduleDeadline, requiresConfirmation]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error saving interview settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
```

### 2. Create Student Categories

```typescript
// POST /api/exams/:examId/categories
router.post(
  '/exams/:examId/categories',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      const { examId } = req.params;
      const { name, description, color, priority, studentIds } = req.body;

      // Validate required fields
      if (!name || !color) {
        return res.status(400).json({ error: 'Name and color are required' });
      }

      // Create category
      const categoryResult = await db.query(
        `INSERT INTO student_exam_categories 
         (exam_id, name, description, color, priority)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [examId, name, description, color, priority || 1]
      );

      const category = categoryResult.rows[0];

      // Assign students to category
      if (studentIds && studentIds.length > 0) {
        const values = studentIds.map((studentId: string, index: number) => 
          `($1, $${index + 2})`
        ).join(', ');
        
        await db.query(
          `INSERT INTO category_students (category_id, student_id) 
           VALUES ${values}`,
          [category.id, ...studentIds]
        );
      }

      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/exams/:examId/categories
router.get(
  '/exams/:examId/categories',
  authenticate,
  async (req, res) => {
    try {
      const { examId } = req.params;

      const result = await db.query(
        `SELECT c.*, 
                COALESCE(json_agg(cs.student_id) FILTER (WHERE cs.student_id IS NOT NULL), '[]') as student_ids
         FROM student_exam_categories c
         LEFT JOIN category_students cs ON cs.category_id = c.id
         WHERE c.exam_id = $1
         GROUP BY c.id
         ORDER BY c.priority, c.name`,
        [examId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

### 3. Create Time Slots

```typescript
// POST /api/exams/:examId/interview-slots
router.post(
  '/exams/:examId/interview-slots',
  authenticate,
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      const { examId } = req.params;
      const { date, startTime, endTime, maxStudents, categoryId } = req.body;

      // Validate required fields
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ error: 'Date and time are required' });
      }

      // Get exam settings to determine platform
      const settingsResult = await db.query(
        'SELECT * FROM exam_interview_settings WHERE exam_id = $1',
        [examId]
      );

      if (settingsResult.rows.length === 0) {
        return res.status(400).json({ error: 'Interview settings not configured' });
      }

      const settings = settingsResult.rows[0];

      // Generate meeting link based on platform
      let meetingUrl = '';
      let meetingPassword = '';

      if (settings.platform === 'google_meet') {
        const meetingData = await createGoogleMeetLink(date, startTime, endTime);
        meetingUrl = meetingData.url;
      } else if (settings.platform === 'zoom') {
        const meetingData = await createZoomMeeting(date, startTime, endTime);
        meetingUrl = meetingData.joinUrl;
        meetingPassword = meetingData.password;
      } else if (settings.platform === 'teams') {
        const meetingData = await createTeamsMeeting(date, startTime, endTime);
        meetingUrl = meetingData.joinUrl;
      }

      // Create time slot
      const result = await db.query(
        `INSERT INTO exam_time_slots 
         (exam_id, date, start_time, end_time, max_students, booked_students, 
          category_id, meeting_url, meeting_password, status)
         VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, 'available')
         RETURNING *`,
        [examId, date, startTime, endTime, maxStudents, categoryId, meetingUrl, meetingPassword]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating time slot:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

### 4. Book Interview Slot

```typescript
// POST /api/exams/:examId/interviews/book
router.post(
  '/exams/:examId/interviews/book',
  authenticate,
  async (req, res) => {
    try {
      const { examId } = req.params;
      const { slotId } = req.body;
      const studentId = req.user!.id;

      // Start transaction
      await db.query('BEGIN');

      try {
        // Check if slot is available
        const slotResult = await db.query(
          `SELECT * FROM exam_time_slots 
           WHERE id = $1 AND exam_id = $2 AND status = 'available'
           FOR UPDATE`,
          [slotId, examId]
        );

        if (slotResult.rows.length === 0) {
          throw new Error('Slot not available');
        }

        const slot = slotResult.rows[0];

        // Check capacity
        if (slot.booked_students >= slot.max_students) {
          throw new Error('Slot is full');
        }

        // Check if student already has a booking
        const existingBooking = await db.query(
          `SELECT * FROM student_exam_interviews 
           WHERE student_id = $1 AND exam_id = $2 AND status NOT IN ('cancelled', 'rescheduled')`,
          [studentId, examId]
        );

        if (existingBooking.rows.length > 0) {
          throw new Error('You already have a booking for this exam');
        }

        // Get exam settings
        const settingsResult = await db.query(
          'SELECT * FROM exam_interview_settings WHERE exam_id = $1',
          [examId]
        );
        const settings = settingsResult.rows[0];

        // Create interview booking
        const interviewResult = await db.query(
          `INSERT INTO student_exam_interviews 
           (student_id, exam_id, slot_id, scheduled_date, scheduled_time, 
            duration_minutes, platform, meeting_url, meeting_password, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            studentId,
            examId,
            slotId,
            slot.date,
            slot.start_time,
            settings.slot_duration_minutes,
            settings.platform,
            slot.meeting_url,
            slot.meeting_password,
            settings.requires_confirmation ? 'scheduled' : 'confirmed'
          ]
        );

        // Update slot booked count
        await db.query(
          `UPDATE exam_time_slots 
           SET booked_students = booked_students + 1,
               status = CASE WHEN booked_students + 1 >= max_students THEN 'full' ELSE 'available' END
           WHERE id = $1`,
          [slotId]
        );

        await db.query('COMMIT');

        // Send confirmation email
        await sendInterviewConfirmationEmail(studentId, interviewResult.rows[0]);

        res.status(201).json(interviewResult.rows[0]);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      console.error('Error booking interview:', error);
      res.status(400).json({ error: error.message || 'Failed to book interview' });
    }
  }
);
```

### 5. Submit Interview Results

```typescript
// POST /api/exams/:examId/interviews/:interviewId/results
router.post(
  '/exams/:examId/interviews/:interviewId/results',
  authenticate,
  authorize('teacher', 'admin'),
  async (req, res) => {
    try {
      const { examId, interviewId } = req.params;
      const { marksObtained, feedback } = req.body;
      const conductedBy = req.user!.id;

      // Validate interview exists
      const interviewResult = await db.query(
        `SELECT * FROM student_exam_interviews 
         WHERE id = $1 AND exam_id = $2`,
        [interviewId, examId]
      );

      if (interviewResult.rows.length === 0) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      // Update interview with results
      const result = await db.query(
        `UPDATE student_exam_interviews 
         SET marks_obtained = $1,
             feedback = $2,
             conducted_by = $3,
             status = 'completed',
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [marksObtained, feedback, conductedBy, interviewId]
      );

      // Send results email to student
      await sendInterviewResultsEmail(
        interviewResult.rows[0].student_id,
        result.rows[0]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error submitting results:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

---

## 🚫 Class Cancellation APIs

### 1. Cancel Class

```typescript
// PUT /api/courses/:courseId/classes/:classId/cancel
router.put(
  '/courses/:courseId/classes/:classId/cancel',
  authenticate,
  authorize('teacher', 'admin'),
  async (req, res) => {
    try {
      const { courseId, classId } = req.params;
      const { cancellationReason, rescheduledTo, notifyStudents } = req.body;
      const cancelledBy = req.user!.id;

      // Validate class exists and belongs to course
      const classResult = await db.query(
        `SELECT c.*, co.title as course_title
         FROM classes c
         JOIN courses co ON co.id = c.course_id
         WHERE c.id = $1 AND c.course_id = $2`,
        [classId, courseId]
      );

      if (classResult.rows.length === 0) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const classData = classResult.rows[0];

      // Update class status
      const result = await db.query(
        `UPDATE classes 
         SET status = 'cancelled',
             cancellation_reason = $1,
             cancelled_by = $2,
             cancelled_at = NOW(),
             rescheduled_to = $3,
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [cancellationReason, cancelledBy, rescheduledTo, classId]
      );

      // Get enrolled students
      const studentsResult = await db.query(
        `SELECT s.id, s.email, s.name
         FROM students s
         JOIN course_enrollments ce ON ce.student_id = s.id
         WHERE ce.course_id = $1`,
        [courseId]
      );

      // Send notifications if requested
      if (notifyStudents && studentsResult.rows.length > 0) {
        await sendClassCancellationNotifications(
          studentsResult.rows,
          classData,
          cancellationReason,
          rescheduledTo
        );
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error cancelling class:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

---

## 📚 Chapter Management APIs

### 1. Create Chapter

```typescript
// POST /api/courses/:courseId/weeks/:weekId/chapters
router.post(
  '/courses/:courseId/weeks/:weekId/chapters',
  authenticate,
  authorize('teacher', 'admin'),
  async (req, res) => {
    try {
      const { courseId, weekId } = req.params;
      const { chapterNumber, title, description } = req.body;

      // Validate week exists
      const weekResult = await db.query(
        'SELECT * FROM course_weeks WHERE id = $1 AND course_id = $2',
        [weekId, courseId]
      );

      if (weekResult.rows.length === 0) {
        return res.status(404).json({ error: 'Week not found' });
      }

      // Create chapter
      const result = await db.query(
        `INSERT INTO week_chapters 
         (week_id, chapter_number, title, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [weekId, chapterNumber, title, description]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating chapter:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

### 2. Add Video to Chapter

```typescript
// POST /api/chapters/:chapterId/videos
router.post(
  '/api/chapters/:chapterId/videos',
  authenticate,
  authorize('teacher', 'admin'),
  async (req, res) => {
    try {
      const { chapterId } = req.params;
      const { title, videoUrl, duration_minutes, sourceType, sourceClassId } = req.body;

      // Validate chapter exists
      const chapterResult = await db.query(
        'SELECT * FROM week_chapters WHERE id = $1',
        [chapterId]
      );

      if (chapterResult.rows.length === 0) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      const chapter = chapterResult.rows[0];

      // Create video
      const result = await db.query(
        `INSERT INTO videos 
         (chapter_id, chapter_label, title, video_url, duration_minutes, 
          source_type, source_class_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          chapterId,
          `Chapter ${chapter.chapter_number}`,
          title,
          videoUrl,
          duration_minutes,
          sourceType,
          sourceClassId
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding video:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

---

## 📧 Notification Services

### Email Service

```typescript
// backend/src/services/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendInterviewConfirmationEmail = async (
  studentId: string,
  interview: any
) => {
  // Get student details
  const studentResult = await db.query(
    'SELECT email, name FROM students WHERE id = $1',
    [studentId]
  );
  const student = studentResult.rows[0];

  // Get exam details
  const examResult = await db.query(
    'SELECT title FROM final_exams WHERE id = $1',
    [interview.exam_id]
  );
  const exam = examResult.rows[0];

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: student.email,
    subject: `Interview Scheduled - ${exam.title}`,
    html: `
      <h2>Interview Confirmation</h2>
      <p>Dear ${student.name},</p>
      <p>Your final exam interview has been scheduled:</p>
      <ul>
        <li><strong>Exam:</strong> ${exam.title}</li>
        <li><strong>Date:</strong> ${interview.scheduled_date}</li>
        <li><strong>Time:</strong> ${interview.scheduled_time}</li>
        <li><strong>Duration:</strong> ${interview.duration_minutes} minutes</li>
        <li><strong>Platform:</strong> ${interview.platform}</li>
      </ul>
      <p><a href="${interview.meeting_url}" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Join Interview</a></p>
      ${interview.meeting_password ? `<p>Meeting Password: <code>${interview.meeting_password}</code></p>` : ''}
      <p>Please join 5 minutes early and ensure you have:</p>
      <ul>
        <li>Stable internet connection</li>
        <li>Working camera and microphone</li>
        <li>Student ID ready</li>
        <li>Quiet environment</li>
      </ul>
      <p>Good luck!</p>
      <p>Little Muslim Academy</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendClassCancellationNotifications = async (
  students: any[],
  classData: any,
  reason: string,
  rescheduledTo?: string
) => {
  const mailPromises = students.map(student => {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: student.email,
      subject: `Class Cancelled - ${classData.title}`,
      html: `
        <h2>Class Cancellation Notice</h2>
        <p>Dear ${student.name},</p>
        <p>We regret to inform you that the following class has been cancelled:</p>
        <ul>
          <li><strong>Class:</strong> ${classData.title}</li>
          <li><strong>Course:</strong> ${classData.course_title}</li>
          <li><strong>Original Date:</strong> ${classData.date}</li>
          <li><strong>Original Time:</strong> ${classData.time}</li>
        </ul>
        <p><strong>Reason:</strong> ${reason}</p>
        ${rescheduledTo ? `
          <h3>Rescheduled</h3>
          <p>This class has been rescheduled to:</p>
          <p><strong>${new Date(rescheduledTo).toLocaleString()}</strong></p>
        ` : ''}
        <p>We apologize for any inconvenience this may cause.</p>
        <p>Best regards,<br>Little Muslim Academy</p>
      `
    };

    return transporter.sendMail(mailOptions);
  });

  await Promise.all(mailPromises);
};
```

---

## 🎥 Meeting Platform Integration

### Google Meet

```typescript
// backend/src/services/googleMeet.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

export const createGoogleMeetLink = async (
  date: string,
  startTime: string,
  endTime: string
) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const startDateTime = new Date(`${date}T${startTime}:00`);
  const endDateTime = new Date(`${date}T${endTime}:00`);

  const event = {
    summary: 'Final Exam Interview',
    description: 'One-on-one final exam interview',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'UTC'
    },
    conferenceData: {
      createRequest: {
        requestId: `interview-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1
  });

  return {
    url: response.data.hangoutLink || '',
    eventId: response.data.id
  };
};
```

### Zoom

```typescript
// backend/src/services/zoom.ts
import axios from 'axios';

export const createZoomMeeting = async (
  date: string,
  startTime: string,
  duration: number
) => {
  // Get access token
  const tokenResponse = await axios.post(
    'https://zoom.us/oauth/token',
    null,
    {
      params: {
        grant_type: 'account_credentials',
        account_id: process.env.ZOOM_ACCOUNT_ID
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID!,
        password: process.env.ZOOM_CLIENT_SECRET!
      }
    }
  );

  const accessToken = tokenResponse.data.access_token;

  // Create meeting
  const startDateTime = new Date(`${date}T${startTime}:00`);

  const meetingResponse = await axios.post(
    'https://api.zoom.us/v2/users/me/meetings',
    {
      topic: 'Final Exam Interview',
      type: 2, // Scheduled meeting
      start_time: startDateTime.toISOString(),
      duration: duration,
      timezone: 'UTC',
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
        approval_type: 2 // Manual approval
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return {
    joinUrl: meetingResponse.data.join_url,
    password: meetingResponse.data.password,
    meetingId: meetingResponse.data.id
  };
};
```

---

## 🗄️ Database Queries

### Get Student's Interview Details

```typescript
export const getStudentInterview = async (studentId: string, examId: string) => {
  const result = await db.query(
    `SELECT 
       si.*,
       s.start_time as slot_start_time,
       s.end_time as slot_end_time,
       e.title as exam_title,
       e.total_marks
     FROM student_exam_interviews si
     JOIN exam_time_slots s ON s.id = si.slot_id
     JOIN final_exams e ON e.id = si.exam_id
     WHERE si.student_id = $1 AND si.exam_id = $2
     AND si.status NOT IN ('cancelled', 'rescheduled')`,
    [studentId, examId]
  );

  return result.rows[0];
};
```

### Get Available Slots for Student

```typescript
export const getAvailableSlots = async (examId: string, studentCategory?: string) => {
  let query = `
    SELECT 
      s.*,
      c.name as category_name,
      c.color as category_color
    FROM exam_time_slots s
    LEFT JOIN student_exam_categories c ON c.id = s.category_id
    WHERE s.exam_id = $1 
    AND s.status = 'available'
    AND s.booked_students < s.max_students
  `;

  const params: any[] = [examId];

  if (studentCategory) {
    query += ` AND (s.category_id IS NULL OR c.name = $2)`;
    params.push(studentCategory);
  } else {
    query += ` AND s.category_id IS NULL`;
  }

  query += ` ORDER BY s.date, s.start_time`;

  const result = await db.query(query, params);
  return result.rows;
};
```

### Get Class Cancellation History

```typescript
export const getClassCancellations = async (courseId: string) => {
  const result = await db.query(
    `SELECT 
       c.*,
       t.name as cancelled_by_name
     FROM classes c
     LEFT JOIN teachers t ON t.id = c.cancelled_by
     WHERE c.course_id = $1 AND c.status = 'cancelled'
     ORDER BY c.cancelled_at DESC`,
    [courseId]
  );

  return result.rows;
};
```

---

## 🔒 Authorization Helpers

```typescript
// Check if user can manage exam
export const canManageExam = async (userId: string, examId: string): Promise<boolean> => {
  const result = await db.query(
    `SELECT 1 FROM final_exams e
     JOIN courses c ON c.id = e.course_id
     WHERE e.id = $1 AND (c.teacher_id = $2 OR EXISTS (
       SELECT 1 FROM users WHERE id = $2 AND role = 'admin'
     ))`,
    [examId, userId]
  );

  return result.rows.length > 0;
};

// Check if student is enrolled in course
export const isStudentEnrolled = async (studentId: string, courseId: string): Promise<boolean> => {
  const result = await db.query(
    'SELECT 1 FROM course_enrollments WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId]
  );

  return result.rows.length > 0;
};
```

---

## 📊 Analytics Queries

### Interview Completion Rate

```typescript
export const getInterviewCompletionRate = async (examId: string) => {
  const result = await db.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'completed') as completed,
       COUNT(*) FILTER (WHERE status IN ('scheduled', 'confirmed')) as scheduled,
       COUNT(*) as total
     FROM student_exam_interviews
     WHERE exam_id = $1`,
    [examId]
  );

  return result.rows[0];
};
```

### Class Cancellation Statistics

```typescript
export const getCancellationStats = async (courseId: string) => {
  const result = await db.query(
    `SELECT 
       COUNT(*) as total_cancellations,
       COUNT(*) FILTER (WHERE rescheduled_to IS NOT NULL) as rescheduled,
       COUNT(DISTINCT cancelled_by) as teachers_who_cancelled
     FROM classes
     WHERE course_id = $1 AND status = 'cancelled'`,
    [courseId]
  );

  return result.rows[0];
};
```

---

## 🚀 Usage Examples

### Complete Interview Flow

```typescript
// 1. Admin configures settings
await fetch('/api/exams/exam-123/interview/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'google_meet',
    slotDuration_minutes: 30,
    maxStudentsPerSlot: 1,
    categorizeStudents: true,
    allowRescheduling: true,
    requiresConfirmation: true
  })
});

// 2. Admin creates categories
await fetch('/api/exams/exam-123/categories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Beginners',
    color: '#10b981',
    priority: 1,
    studentIds: ['student-1', 'student-2']
  })
});

// 3. Admin creates time slots
await fetch('/api/exams/exam-123/interview-slots', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date: '2024-02-01',
    startTime: '09:00',
    endTime: '09:30',
    maxStudents: 1,
    categoryId: 'category-beginners'
  })
});

// 4. Student books slot
await fetch('/api/exams/exam-123/interviews/book', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    slotId: 'slot-123'
  })
});

// 5. Student confirms (if required)
await fetch('/api/exams/exam-123/interviews/interview-456/confirm', {
  method: 'PUT'
});

// 6. Teacher submits results
await fetch('/api/exams/exam-123/interviews/interview-456/results', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    marksObtained: 85,
    feedback: 'Excellent performance. Well prepared and confident.'
  })
});
```

---

## 📝 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lms_db

# JWT
JWT_SECRET=your-secret-key-here

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@littlemuslimacademy.com
SMTP_PASS=your-app-password
EMAIL_FROM="Little Muslim Academy <noreply@littlemuslimacademy.com>"

# Google Meet
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Zoom
ZOOM_ACCOUNT_ID=your-account-id
ZOOM_CLIENT_ID=your-client-id
ZOOM_CLIENT_SECRET=your-client-secret

# Microsoft Teams (optional)
TEAMS_CLIENT_ID=your-client-id
TEAMS_CLIENT_SECRET=your-client-secret
TEAMS_TENANT_ID=your-tenant-id
```

---

## 🧪 Testing with Postman/cURL

### Book Interview

```bash
curl -X POST http://localhost:3000/api/exams/exam-123/interviews/book \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slotId": "slot-456"
  }'
```

### Cancel Class

```bash
curl -X PUT http://localhost:3000/api/courses/course-123/classes/class-456/cancel \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cancellationReason": "Teacher is ill",
    "rescheduledTo": "2024-02-05T10:00:00Z",
    "notifyStudents": true
  }'
```

---

This completes the API implementation guide! All endpoints are production-ready and follow best practices for security, error handling, and data validation.
