/**
 * Course Notification Service
 * 
 * Sends email notifications to students for course-related events:
 * - New course approved/published
 * - Enrollment confirmation
 * - Course content updates (quiz/assignment added)
 * - Deadline announcements/updates
 * - Live class session scheduled
 * 
 * Uses SMTP transporter (SMTP_USER / SMTP_PASS env vars).
 * Falls back to EMAIL_USER / EMAIL_APP_PASSWORD if SMTP vars not set.
 * All sends are fire-and-forget: failures are logged but never block the caller.
 */

import nodemailer from 'nodemailer';
import { supabase } from '../config/database';

// ---------------------------------------------------------------------------
// Transporter setup — reuse SMTP config from emailNotifications.ts pattern
// ---------------------------------------------------------------------------
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_APP_PASSWORD;
const isEmailConfigured = !!(smtpUser && smtpPass);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })
  : null;

const FROM_ADDRESS = `"Little Muslim Academy" <${smtpUser || 'noreply@littlemuslima.com'}>`;
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all enrolled students with email + name for a given course */
async function getEnrolledStudents(courseId: string): Promise<{ email: string; name: string; clerk_user_id: string }[]> {
  // enrollments.student_id stores profile.id (UUID)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('course_id', courseId);

  if (!enrollments || enrollments.length === 0) return [];

  const studentIds = [...new Set(enrollments.map((e: any) => e.student_id))];

  // Profiles may be keyed by id (UUID) or clerk_user_id (TEXT)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, clerk_user_id, full_name, email')
    .in('id', studentIds);

  if (!profiles) return [];

  return profiles
    .filter((p: any) => p.email)
    .map((p: any) => ({
      email: p.email,
      name: p.full_name || 'Student',
      clerk_user_id: p.clerk_user_id,
    }));
}

/** Get ALL student profiles (for "new course" broadcast) */
async function getAllStudentEmails(): Promise<{ email: string; name: string }[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .eq('role', 'student');

  if (!profiles) return [];

  return profiles
    .filter((p: any) => p.email)
    .map((p: any) => ({ email: p.email, name: p.full_name || 'Student' }));
}

/** Send an email, swallowing errors */
async function safeSend(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    console.log(`📧 [SKIP] Email not configured. Would send to ${to}: "${subject}"`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM_ADDRESS, to, subject, html });
    console.log(`✅ Email sent to ${to}: "${subject}"`);
  } catch (err) {
    console.error(`⚠️ Failed to send email to ${to}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Base email wrapper
// ---------------------------------------------------------------------------
function wrapEmail(title: string, emoji: string, body: string): string {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f5f7;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:40px 30px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">${emoji} ${title}</h1>
      </div>
      <div style="padding:30px;color:#333;line-height:1.7;font-size:15px;">
        ${body}
      </div>
      <div style="text-align:center;color:#9ca3af;font-size:13px;padding:20px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <strong style="color:#667eea;">Little Muslim Academy</strong><br/>
        Building knowledge, one lesson at a time 📚
      </div>
    </div>
  </body>
  </html>`;
}

// ---------------------------------------------------------------------------
// 1. NEW COURSE AVAILABLE (broadcast to all students)
// ---------------------------------------------------------------------------
export async function notifyNewCourseAvailable(course: {
  id: string;
  title: string;
  description?: string;
  teacher_name?: string;
}): Promise<void> {
  const students = await getAllStudentEmails();
  if (students.length === 0) return;

  const subject = `📚 New Course Available: ${course.title}`;
  const html = wrapEmail('New Course Available!', '📚', `
    <p>As-salamu alaykum,</p>
    <p>A new course has been published and is now available for enrollment:</p>
    <div style="background:#f3f4f6;padding:20px;border-left:4px solid #667eea;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#667eea;">${course.title}</h2>
      ${course.teacher_name ? `<p style="margin:4px 0;color:#6b7280;">Instructor: <strong>${course.teacher_name}</strong></p>` : ''}
      ${course.description ? `<p style="margin:8px 0;color:#555;">${course.description.substring(0, 200)}${course.description.length > 200 ? '...' : ''}</p>` : ''}
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/courses/${course.id}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        View Course &amp; Enroll
      </a>
    </div>
  `);

  // Send in parallel batches of 10
  for (let i = 0; i < students.length; i += 10) {
    const batch = students.slice(i, i + 10);
    await Promise.allSettled(batch.map((s) => safeSend(s.email, subject, html)));
  }
  console.log(`📧 New course notification sent to ${students.length} students`);
}

// ---------------------------------------------------------------------------
// 2. ENROLLMENT CONFIRMATION (single student)
// ---------------------------------------------------------------------------
export async function notifyEnrollmentConfirmation(
  studentEmail: string,
  studentName: string,
  courseTitle: string,
  courseId: string
): Promise<void> {
  const subject = `🎓 Enrollment Confirmed – ${courseTitle}`;
  const html = wrapEmail('Enrollment Confirmed!', '🎓', `
    <p>As-salamu alaykum <strong>${studentName}</strong>,</p>
    <p>Congratulations! You have successfully enrolled in:</p>
    <div style="background:#f3f4f6;padding:20px;border-left:4px solid #10b981;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0;color:#10b981;">${courseTitle}</h2>
    </div>
    <p>You can now access all course materials, lessons, and resources. Head to your dashboard to begin!</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/learn/${courseId}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#14b8a6);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Start Learning
      </a>
    </div>
  `);

  await safeSend(studentEmail, subject, html);
}

// ---------------------------------------------------------------------------
// 3. COURSE CONTENT UPDATED (quiz / assignment added to a week)
// ---------------------------------------------------------------------------
export async function notifyCourseContentUpdate(
  courseId: string,
  courseTitle: string,
  weekTitle: string,
  contentType: 'quiz' | 'assignment' | 'video' | 'resource',
  contentTitle: string
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const typeLabel = contentType === 'quiz' ? '📝 Quiz' :
                    contentType === 'assignment' ? '📋 Assignment' :
                    contentType === 'video' ? '🎬 Video' : '📄 Resource';

  const subject = `📢 Course Update: ${typeLabel} added to ${courseTitle}`;
  const html = wrapEmail('Course Content Updated!', '📢', `
    <p>As-salamu alaykum,</p>
    <p>Your enrolled course <strong>${courseTitle}</strong> has been updated!</p>
    <div style="background:#f3f4f6;padding:20px;border-left:4px solid #f59e0b;margin:20px 0;border-radius:8px;">
      <p style="margin:0 0 8px;color:#92400e;font-weight:bold;">${weekTitle}</p>
      <p style="margin:0;font-size:16px;color:#333;">${typeLabel}: <strong>${contentTitle}</strong></p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/learn/${courseId}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Go to Course
      </a>
    </div>
  `);

  for (let i = 0; i < students.length; i += 10) {
    const batch = students.slice(i, i + 10);
    await Promise.allSettled(batch.map((s) => safeSend(s.email, subject, html)));
  }
  console.log(`📧 Content update notification sent to ${students.length} enrolled students`);
}

// ---------------------------------------------------------------------------
// 4. DEADLINE ANNOUNCED / UPDATED
// ---------------------------------------------------------------------------
export async function notifyDeadlineUpdate(
  courseId: string,
  courseTitle: string,
  lessonTitle: string,
  contentType: 'quiz' | 'assignment',
  deadline: string,
  isNew: boolean
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const typeLabel = contentType === 'quiz' ? 'Quiz' : 'Assignment';
  const formattedDeadline = new Date(deadline).toLocaleString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  });

  const subject = isNew
    ? `⏰ Deadline Set: ${typeLabel} – ${lessonTitle}`
    : `⏰ Deadline Updated: ${typeLabel} – ${lessonTitle}`;

  const html = wrapEmail(isNew ? 'New Deadline Announced' : 'Deadline Updated', '⏰', `
    <p>As-salamu alaykum,</p>
    <p>${isNew ? 'A new deadline has been set' : 'The deadline has been updated'} for your course <strong>${courseTitle}</strong>:</p>
    <div style="background:#fff7ed;padding:20px;border-left:4px solid #f59e0b;margin:20px 0;border-radius:8px;">
      <p style="margin:0 0 4px;font-weight:bold;color:#92400e;">${typeLabel}: ${lessonTitle}</p>
      <p style="margin:0;font-size:18px;color:#b45309;font-weight:bold;">📅 Due: ${formattedDeadline} IST</p>
    </div>
    <p>Please make sure to complete your submission before the deadline.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/learn/${courseId}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Go to Course
      </a>
    </div>
  `);

  for (let i = 0; i < students.length; i += 10) {
    const batch = students.slice(i, i + 10);
    await Promise.allSettled(batch.map((s) => safeSend(s.email, subject, html)));
  }
  console.log(`📧 Deadline notification sent to ${students.length} enrolled students`);
}

// ---------------------------------------------------------------------------
// 5. LIVE CLASS SCHEDULED (only enrolled students get the link)
// ---------------------------------------------------------------------------
export async function notifyLiveClassScheduled(
  courseId: string,
  courseTitle: string,
  sessionTitle: string,
  scheduledAt: string,
  durationMinutes: number,
  meetLink?: string
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const formattedDate = new Date(scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  });

  const subject = `🎥 Live Class Scheduled: ${sessionTitle}`;
  const html = wrapEmail('Live Class Scheduled!', '🎥', `
    <p>As-salamu alaykum,</p>
    <p>A live class has been scheduled for your course <strong>${courseTitle}</strong>:</p>
    <div style="background:#ecfdf5;padding:20px;border-left:4px solid #10b981;margin:20px 0;border-radius:8px;">
      <h3 style="margin:0 0 12px;color:#065f46;">${sessionTitle}</h3>
      <p style="margin:4px 0;color:#047857;">📅 <strong>${formattedDate} IST</strong></p>
      <p style="margin:4px 0;color:#047857;">⏱ Duration: <strong>${durationMinutes} minutes</strong></p>
      ${meetLink ? `
      <div style="margin-top:16px;">
        <a href="${meetLink}" style="display:inline-block;background:#10b981;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
          🔗 Join Meeting
        </a>
      </div>` : ''}
    </div>
    <p style="font-size:13px;color:#6b7280;">This meeting link is exclusive to enrolled students. Please do not share it.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/learn/${courseId}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Go to Course
      </a>
    </div>
  `);

  for (let i = 0; i < students.length; i += 10) {
    const batch = students.slice(i, i + 10);
    await Promise.allSettled(batch.map((s) => safeSend(s.email, subject, html)));
  }
  console.log(`📧 Live class notification sent to ${students.length} enrolled students`);
}
