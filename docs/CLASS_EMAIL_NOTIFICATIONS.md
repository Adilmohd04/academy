# Class Email Notification System

## Overview

Automated email notification system that sends reminders to enrolled students before live classes start.

## Features

### 1. **24-Hour Reminder**
- Sent 24 hours before class starts
- Includes class details, meeting link, and preparation instructions

### 2. **1-Hour Reminder**
- Sent 1 hour before class starts
- Quick reminder with direct join link

### 3. **30-Minute Alert**
- "Class starting soon" notification
- Urgent reminder for students to join

### 4. **Weekly Schedule Digest**
- Sent every Monday morning
- Lists all upcoming classes for the week

## Email Templates

### 24-Hour Reminder Email

```
Subject: Reminder: [Class Name] Tomorrow at [Time]

Dear [Student Name],

This is a friendly reminder that you have a live class scheduled for tomorrow:

📚 Course: [Course Name]
📖 Class: [Class Title]
📅 Date: [Day, Month DD, YYYY]
⏰ Time: [HH:MM AM/PM]
⏱️ Duration: [Duration] minutes
👨‍🏫 Teacher: [Teacher Name]

[Join Meeting Button/Link]

What to prepare:
• Review last week's materials
• Prepare any questions you have
• Test your camera and microphone
• Find a quiet place for the class

Need to reschedule? Contact your teacher or admin.

See you in class!

Little Muslim Academy
```

### 1-Hour Reminder Email

```
Subject: Starting Soon: [Class Name] in 1 Hour

Dear [Student Name],

Your class "[Class Title]" starts in 1 hour!

📅 [Day, Month DD] at [HH:MM AM/PM]

[Join Meeting Button/Link]

Quick checklist:
✓ Camera working
✓ Microphone working
✓ Quiet environment
✓ Materials ready

See you soon!

Little Muslim Academy
```

### 30-Minute Alert Email

```
Subject: ⏰ Class Starting in 30 Minutes!

[Student Name],

Your class is starting in 30 minutes!

[Large Join Button]

Join now and get ready.

Little Muslim Academy
```

### Weekly Digest Email

```
Subject: Your Class Schedule for Week [Number]

Dear [Student Name],

Here's your schedule for this week in [Course Name]:

📅 Monday, [Date] at [Time]
   [Class Title]
   [Join Link]

📅 Wednesday, [Date] at [Time]
   [Class Title]
   [Join Link]

📅 Friday, [Date] at [Time]
   [Class Title]
   [Join Link]

Total: 3 classes this week

[View Full Schedule Button]

Stay on track with your learning!

Little Muslim Academy
```

## Backend API Implementation

### API Endpoints

```typescript
// Send class reminder notifications
POST /api/notifications/class-reminder
Body: {
  classData: ClassNotificationData,
  students: StudentNotification[],
  hoursBeforeClass: number
}

// Send "class starting soon" notifications
POST /api/notifications/class-starting-soon
Body: {
  classData: ClassNotificationData,
  students: StudentNotification[]
}

// Send weekly schedule digest
POST /api/notifications/weekly-digest
Body: {
  courseId: string,
  courseName: string,
  weekNumber: number,
  classes: ClassNotificationData[],
  students: StudentNotification[]
}

// Get enrolled students
GET /api/courses/:courseId/enrolled-students
Returns: Array<{id, email, name}>
```

### Backend Service Example (Node.js/Express)

```typescript
// backend/src/services/emailNotifications.ts
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

export async function send24HourReminder(
  classData: any,
  student: any
) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: student.studentEmail,
    subject: `Reminder: ${classData.className} Tomorrow at ${classData.classTime}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          .class-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .info-row { display: flex; margin: 10px 0; }
          .info-label { width: 100px; font-weight: bold; }
          .join-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .checklist { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .checklist ul { margin: 10px 0; padding-left: 20px; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Class Reminder</h1>
            <p>You have a live class scheduled for tomorrow!</p>
          </div>
          
          <div class="content">
            <p>Dear ${student.studentName},</p>
            
            <p>This is a friendly reminder about your upcoming live class:</p>
            
            <div class="class-info">
              <h2>${classData.className}</h2>
              <div class="info-row">
                <div class="info-label">📚 Course:</div>
                <div>${classData.courseName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">📅 Date:</div>
                <div>${classData.classDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">⏰ Time:</div>
                <div>${classData.classTime}</div>
              </div>
              <div class="info-row">
                <div class="info-label">⏱️ Duration:</div>
                <div>${classData.duration} minutes</div>
              </div>
              <div class="info-row">
                <div class="info-label">👨‍🏫 Teacher:</div>
                <div>${classData.teacherName}</div>
              </div>
            </div>
            
            ${classData.meetingUrl ? `
              <div style="text-align: center;">
                <a href="${classData.meetingUrl}" class="join-button">
                  Join Meeting
                </a>
              </div>
            ` : ''}
            
            <div class="checklist">
              <h3>📝 What to prepare:</h3>
              <ul>
                <li>Review last week's materials</li>
                <li>Prepare any questions you have</li>
                <li>Test your camera and microphone</li>
                <li>Find a quiet place for the class</li>
                <li>Have your notebook and materials ready</li>
              </ul>
            </div>
            
            <p>Need to reschedule? Please contact your teacher or admin as soon as possible.</p>
            
            <p>Looking forward to seeing you in class!</p>
          </div>
          
          <div class="footer">
            <p>Little Muslim Academy</p>
            <p>Quality Islamic Education for Everyone</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function send1HourReminder(
  classData: any,
  student: any
) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: student.studentEmail,
    subject: `⏰ Starting Soon: ${classData.className} in 1 Hour`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 10px; }
          .join-button { display: inline-block; background: #10b981; color: white; padding: 20px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 30px 0; }
          .checklist { text-align: left; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Class Starting in 1 Hour!</h1>
          </div>
          
          <h2>${classData.className}</h2>
          <p style="font-size: 18px;">${classData.classDate} at ${classData.classTime}</p>
          
          <a href="${classData.meetingUrl}" class="join-button">
            JOIN NOW
          </a>
          
          <div class="checklist">
            <strong>Quick checklist:</strong>
            <ul>
              <li>✓ Camera working</li>
              <li>✓ Microphone working</li>
              <li>✓ Quiet environment</li>
              <li>✓ Materials ready</li>
            </ul>
          </div>
          
          <p>See you soon, ${student.studentName}!</p>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
}

export async function send30MinuteAlert(
  classData: any,
  student: any
) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: student.studentEmail,
    subject: `🔔 JOIN NOW: ${classData.className} Starting in 30 Minutes!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px; }
          .urgent { background: #ef4444; color: white; padding: 20px; border-radius: 10px; font-size: 24px; font-weight: bold; }
          .join-button { display: inline-block; background: #10b981; color: white; padding: 25px 50px; text-decoration: none; border-radius: 8px; font-size: 22px; font-weight: bold; margin: 30px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="urgent">
            ⏰ CLASS STARTING IN 30 MINUTES!
          </div>
          
          <h1>${classData.className}</h1>
          
          <a href="${classData.meetingUrl}" class="join-button">
            🚀 JOIN NOW
          </a>
          
          <p style="font-size: 18px;">Don't be late, ${student.studentName}!</p>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
}
```

### Cron Job for Automated Notifications

```typescript
// backend/src/jobs/classNotifications.ts
import cron from 'node-cron';
import { db } from '../config/database';
import { send1HourReminder, send30MinuteAlert } from '../services/emailNotifications';

// Run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('🔍 Checking for upcoming classes...');
  
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);
  
  // Find classes starting in 1 hour
  const classesIn1Hour = await db.query(`
    SELECT c.*, co.title as course_name, co.teacher_name
    FROM classes c
    JOIN courses co ON co.id = c.course_id
    WHERE c.scheduled_at BETWEEN $1 AND $2
    AND c.status = 'scheduled'
    AND c.notification_1hr_sent = false
  `, [now, oneHourLater]);
  
  for (const classData of classesIn1Hour.rows) {
    // Get enrolled students
    const students = await db.query(`
      SELECT s.id, s.email, s.name
      FROM students s
      JOIN course_enrollments ce ON ce.student_id = s.id
      WHERE ce.course_id = $1
    `, [classData.course_id]);
    
    // Send 1-hour reminders
    for (const student of students.rows) {
      await send1HourReminder(classData, student);
    }
    
    // Mark as sent
    await db.query(
      'UPDATE classes SET notification_1hr_sent = true WHERE id = $1',
      [classData.id]
    );
  }
  
  // Similar logic for 30-minute alerts
  const classesIn30Min = await db.query(`
    SELECT c.*, co.title as course_name, co.teacher_name
    FROM classes c
    JOIN courses co ON co.id = c.course_id
    WHERE c.scheduled_at BETWEEN $1 AND $2
    AND c.status = 'scheduled'
    AND c.notification_30min_sent = false
  `, [now, thirtyMinLater]);
  
  for (const classData of classesIn30Min.rows) {
    const students = await db.query(`
      SELECT s.id, s.email, s.name
      FROM students s
      JOIN course_enrollments ce ON ce.student_id = s.id
      WHERE ce.course_id = $1
    `, [classData.course_id]);
    
    for (const student of students.rows) {
      await send30MinuteAlert(classData, student);
    }
    
    await db.query(
      'UPDATE classes SET notification_30min_sent = true WHERE id = $1',
      [classData.id]
    );
  }
});
```

## Database Schema Updates

Add notification tracking fields to `classes` table:

```sql
ALTER TABLE classes 
ADD COLUMN notification_24hr_sent BOOLEAN DEFAULT false,
ADD COLUMN notification_1hr_sent BOOLEAN DEFAULT false,
ADD COLUMN notification_30min_sent BOOLEAN DEFAULT false;
```

## Usage

### When Teacher Creates a Class

```typescript
// After creating a class in the database
import { scheduleClassNotifications } from '@/lib/classNotifications';

const newClass = {
  courseId: 'course-123',
  courseName: 'Islamic Studies 101',
  classId: 'class-456',
  className: 'Introduction to Quran',
  classDate: 'Monday, January 15, 2024',
  classTime: '10:00 AM',
  duration: 60,
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
  teacherName: 'Sheikh Ahmad'
};

await scheduleClassNotifications(newClass);
```

### Manual Notification Send

```typescript
import { sendClassReminderEmails, getEnrolledStudents } from '@/lib/classNotifications';

const students = await getEnrolledStudents('course-123');
await sendClassReminderEmails(classData, students, 24);
```

## Environment Variables

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@littlemuslimacademy.com
SMTP_PASS=your-app-password
EMAIL_FROM="Little Muslim Academy <noreply@littlemuslimacademy.com>"
```

## Testing

1. Create a test class 25 hours in the future
2. Create a test class 2 hours in the future
3. Create a test class 40 minutes in the future
4. Verify emails are sent at correct times

## Benefits

✅ **Improved Attendance** - Students are reminded multiple times  
✅ **Better Preparation** - Students have time to prepare  
✅ **Reduced No-Shows** - Multiple reminders reduce forgetfulness  
✅ **Professional Communication** - Branded, well-designed emails  
✅ **Automated** - No manual work required  

This completes the class notification system! 🎉
