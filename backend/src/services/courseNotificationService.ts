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
import { createNotification } from '../modules/shared/services/notificationService';

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
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all enrolled students with email + name for a given course */
async function getEnrolledStudents(courseId: string): Promise<{ id: string; email: string; name: string; clerk_user_id: string | null }[]> {
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
      id: p.id,
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

async function fanOutStudentNotifications(
  students: { id: string; email: string; name: string }[],
  notification: {
    type: 'content' | 'quiz' | 'assignment' | 'grade' | 'live_session' | 'announcement' | 'deadline' | 'reminder';
    category: 'success' | 'info' | 'warning' | 'error' | 'activity';
    title: string;
    message: string;
    link?: string;
    related_id?: string;
    related_type?: string;
  },
  emailSubject?: string,
  emailHtml?: string
): Promise<void> {
  await Promise.allSettled(
    students.map((student) =>
      createNotification({
        user_id: student.id,
        type: notification.type,
        category: notification.category,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        related_id: notification.related_id,
        related_type: notification.related_type,
      })
    )
  );

  if (!emailSubject || !emailHtml) {
    return;
  }

  for (let i = 0; i < students.length; i += 10) {
    const batch = students.slice(i, i + 10);
    await Promise.allSettled(batch.map((student) => safeSend(student.email, emailSubject, emailHtml)));
  }
}

async function notifySingleStudent(
  student: { id: string; email: string; name: string },
  notification: {
    type: 'quiz' | 'assignment' | 'grade' | 'certificate' | 'reminder' | 'system';
    category: 'success' | 'info' | 'warning' | 'error' | 'activity';
    title: string;
    message: string;
    link?: string;
    related_id?: string;
    related_type?: string;
  },
  emailSubject?: string,
  emailHtml?: string
): Promise<void> {
  await createNotification({
    user_id: student.id,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    related_id: notification.related_id,
    related_type: notification.related_type,
  });

  if (emailSubject && emailHtml) {
    await safeSend(student.email, emailSubject, emailHtml);
  }
}

function sanitizeCourseTitle(title?: string, fallback = 'Course'): string {
  if (!title) return fallback;
  const normalized = title.trim();
  if (!normalized) return fallback;
  if (UUID_REGEX.test(normalized)) return fallback;
  if (/^(unknown|n\/a|null|undefined)$/i.test(normalized)) return fallback;
  return normalized;
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

  const courseTitle = sanitizeCourseTitle(course.title, 'New Course');

  const subject = `📚 New Course Available: ${courseTitle}`;
  const hasKnownInstructor = !!(
    course.teacher_name &&
    !/unknown/i.test(course.teacher_name)
  );

  const html = wrapEmail('New Course Available!', '📚', `
    <p>As-salamu alaykum,</p>
    <p>A new course has been published and is now available for enrollment:</p>
    <div style="background:#f3f4f6;padding:20px;border-left:4px solid #667eea;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#667eea;">${courseTitle}</h2>
      ${hasKnownInstructor ? `<p style="margin:4px 0;color:#6b7280;">Instructor: <strong>${course.teacher_name}</strong></p>` : ''}
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
  const safeTitle = sanitizeCourseTitle(courseTitle);
  const subject = `🎓 Enrollment Confirmed – ${safeTitle}`;
  const html = wrapEmail('Enrollment Confirmed!', '🎓', `
    <p>As-salamu alaykum <strong>${studentName}</strong>,</p>
    <p>Congratulations! You have successfully enrolled in:</p>
    <div style="background:#f3f4f6;padding:20px;border-left:4px solid #10b981;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0;color:#10b981;">${safeTitle}</h2>
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

  await fanOutStudentNotifications(
    students,
    {
      type: 'content',
      category: 'activity',
      title: `${typeLabel} added to ${weekTitle}`,
      message: `${contentTitle} is now available in ${courseTitle}.`,
      link: `${FRONTEND_URL}/learn/${courseId}`,
      related_id: courseId,
      related_type: contentType,
    },
    subject,
    html
  );
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

  await fanOutStudentNotifications(
    students,
    {
      type: 'deadline',
      category: 'warning',
      title: isNew ? `Deadline set for ${lessonTitle}` : `Deadline updated for ${lessonTitle}`,
      message: `Your ${typeLabel.toLowerCase()} ${lessonTitle} is due on ${formattedDeadline} IST.`,
      link: `${FRONTEND_URL}/learn/${courseId}`,
      related_id: courseId,
      related_type: contentType,
    },
    subject,
    html
  );
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

  await fanOutStudentNotifications(
    students,
    {
      type: 'live_session',
      category: 'info',
      title: `Live class scheduled: ${sessionTitle}`,
      message: `${sessionTitle} is scheduled for ${formattedDate}.`,
      link: meetLink || `${FRONTEND_URL}/learn/${courseId}`,
      related_id: courseId,
      related_type: 'live_session',
    },
    subject,
    html
  );
  console.log(`📧 Live class notification sent to ${students.length} enrolled students`);
}

export async function notifyAssignmentPublished(
  courseId: string,
  courseTitle: string,
  assignmentTitle: string,
  dueDate: string,
  assignmentId?: string
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const formattedDeadline = new Date(dueDate).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  });

  const subject = `📋 New Assignment: ${assignmentTitle}`;
  const html = wrapEmail('New Assignment Available', '📋', `
    <p>As-salamu alaykum,</p>
    <p>A new assignment has been added to <strong>${courseTitle}</strong>:</p>
    <div style="background:#f3f4f6;padding:20px;border-left:4px solid #667eea;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#667eea;">${assignmentTitle}</h2>
      <p style="margin:0;color:#6b7280;">Due: <strong>${formattedDeadline} IST</strong></p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/learn/${courseId}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Open Course</a>
    </div>
  `);

  await fanOutStudentNotifications(
    students,
    {
      type: 'assignment',
      category: 'activity',
      title: `New assignment in ${courseTitle}`,
      message: `${assignmentTitle} is now available. Due ${formattedDeadline} IST.`,
      link: `${FRONTEND_URL}/learn/${courseId}`,
      related_id: assignmentId || courseId,
      related_type: 'assignment',
    },
    subject,
    html
  );
}

export async function notifyAssignmentGraded(
  student: { id: string; email: string; name: string },
  payload: {
    courseId: string;
    courseTitle: string;
    assignmentTitle: string;
    grade: number;
    maxGrade?: number | null;
    feedback?: string | null;
    submissionId?: string;
  }
): Promise<void> {
  const maxGrade = payload.maxGrade || 100;
  const percentage = maxGrade > 0 ? Math.round((payload.grade / maxGrade) * 100) : 0;
  const subject = `📝 Assignment Graded: ${payload.assignmentTitle}`;
  const html = wrapEmail('Assignment Graded', '📝', `
    <p>As-salamu alaykum <strong>${student.name}</strong>,</p>
    <p>Your assignment for <strong>${payload.courseTitle}</strong> has been graded.</p>
    <div style="background:#f0fdf4;padding:20px;border-left:4px solid #22c55e;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#15803d;">${payload.assignmentTitle}</h2>
      <p style="margin:4px 0;color:#166534;">Score: <strong>${payload.grade}/${maxGrade}</strong> (${percentage}%)</p>
      ${payload.feedback ? `<p style="margin:8px 0 0;color:#166534;">Feedback: ${payload.feedback}</p>` : ''}
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/student/assignments" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#0f766e);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">View Results</a>
    </div>
  `);

  await notifySingleStudent(student, {
    type: 'grade',
    category: percentage >= 70 ? 'success' : 'info',
    title: `Assignment graded: ${payload.assignmentTitle}`,
    message: `You scored ${payload.grade}/${maxGrade} (${percentage}%) in ${payload.courseTitle}.`,
    link: `${FRONTEND_URL}/student/assignments`,
    related_id: payload.submissionId || payload.courseId,
    related_type: 'assignment_submission',
  }, subject, html);
}

export async function notifyQuizPublished(
  courseId: string,
  courseTitle: string,
  quizTitle: string,
  weekTitle?: string | null,
  quizId?: string
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const subject = `📝 New Quiz: ${quizTitle}`;
  const html = wrapEmail('Quiz Available', '📝', `
    <p>As-salamu alaykum,</p>
    <p>A new quiz is now available in <strong>${courseTitle}</strong>.</p>
    <div style="background:#eff6ff;padding:20px;border-left:4px solid #3b82f6;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#1d4ed8;">${quizTitle}</h2>
      ${weekTitle ? `<p style="margin:0;color:#1e40af;">${weekTitle}</p>` : ''}
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/learn/${courseId}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Open Course</a>
    </div>
  `);

  await fanOutStudentNotifications(
    students,
    {
      type: 'quiz',
      category: 'activity',
      title: `New quiz in ${courseTitle}`,
      message: `${quizTitle} is available${weekTitle ? ` for ${weekTitle}` : ''}.`,
      link: `${FRONTEND_URL}/learn/${courseId}`,
      related_id: quizId || courseId,
      related_type: 'quiz',
    },
    subject,
    html
  );
}

export async function notifyQuizResults(
  student: { id: string; email: string; name: string },
  payload: {
    courseId: string;
    courseTitle: string;
    quizTitle: string;
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    attemptId?: string;
  }
): Promise<void> {
  const subject = `${payload.passed ? '🎉' : '📊'} Quiz Results: ${payload.quizTitle}`;
  const html = wrapEmail('Quiz Results', payload.passed ? '🎉' : '📊', `
    <p>As-salamu alaykum <strong>${student.name}</strong>,</p>
    <p>Your quiz attempt for <strong>${payload.courseTitle}</strong> is ready.</p>
    <div style="background:${payload.passed ? '#f0fdf4' : '#eff6ff'};padding:20px;border-left:4px solid ${payload.passed ? '#22c55e' : '#3b82f6'};margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:${payload.passed ? '#15803d' : '#1d4ed8'};">${payload.quizTitle}</h2>
      <p style="margin:4px 0;color:${payload.passed ? '#166534' : '#1e40af'};">Score: <strong>${payload.score}/${payload.totalPoints}</strong> (${payload.percentage}%)</p>
      <p style="margin:4px 0;color:${payload.passed ? '#166534' : '#1e40af'};">Result: <strong>${payload.passed ? 'Passed' : 'Keep practicing'}</strong></p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/student/quizzes" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Open Quiz History</a>
    </div>
  `);

  await notifySingleStudent(student, {
    type: 'quiz',
    category: payload.passed ? 'success' : 'info',
    title: `${payload.passed ? 'Passed' : 'Quiz results'}: ${payload.quizTitle}`,
    message: `You scored ${payload.score}/${payload.totalPoints} (${payload.percentage}%) in ${payload.quizTitle}.`,
    link: `${FRONTEND_URL}/student/quizzes`,
    related_id: payload.attemptId || payload.courseId,
    related_type: 'quiz_attempt',
  }, subject, html);
}

export async function notifyFinalExamPublished(
  courseId: string,
  courseTitle: string,
  examTitle: string,
  examType: string,
  examId?: string
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const subject = `🎓 Final Exam Available: ${examTitle}`;
  const html = wrapEmail('Final Exam Available', '🎓', `
    <p>As-salamu alaykum,</p>
    <p>A final exam has been published for <strong>${courseTitle}</strong>.</p>
    <div style="background:#fff7ed;padding:20px;border-left:4px solid #f59e0b;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#b45309;">${examTitle}</h2>
      <p style="margin:0;color:#92400e;">Type: <strong>${examType}</strong></p>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/student/exams" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Open Exam Center</a>
    </div>
  `);

  await fanOutStudentNotifications(
    students,
    {
      type: 'assignment',
      category: 'warning',
      title: `Final exam available: ${examTitle}`,
      message: `${examTitle} has been published for ${courseTitle}.`,
      link: `${FRONTEND_URL}/student/exams`,
      related_id: examId || courseId,
      related_type: 'final_exam',
    },
    subject,
    html
  );
}

export async function notifyFinalExamResults(
  student: { id: string; email: string; name: string },
  payload: {
    courseId: string;
    courseTitle: string;
    examTitle: string;
    grade: number;
    maxGrade?: number | null;
    passed?: boolean;
    certificateUrl?: string | null;
    submissionId?: string;
  }
): Promise<void> {
  const maxGrade = payload.maxGrade || 100;
  const percentage = maxGrade > 0 ? Math.round((payload.grade / maxGrade) * 100) : 0;
  const passed = payload.passed ?? percentage >= 70;
  const subject = `${passed ? '🎉' : '📘'} Final Exam Results: ${payload.examTitle}`;
  const html = wrapEmail('Final Exam Results', passed ? '🎉' : '📘', `
    <p>As-salamu alaykum <strong>${student.name}</strong>,</p>
    <p>Your final exam for <strong>${payload.courseTitle}</strong> has been graded.</p>
    <div style="background:${passed ? '#f0fdf4' : '#eff6ff'};padding:20px;border-left:4px solid ${passed ? '#22c55e' : '#3b82f6'};margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:${passed ? '#15803d' : '#1d4ed8'};">${payload.examTitle}</h2>
      <p style="margin:4px 0;color:${passed ? '#166534' : '#1e40af'};">Score: <strong>${payload.grade}/${maxGrade}</strong> (${percentage}%)</p>
      <p style="margin:4px 0;color:${passed ? '#166534' : '#1e40af'};">Result: <strong>${passed ? 'Passed' : 'Not passed yet'}</strong></p>
    </div>
    ${payload.certificateUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${payload.certificateUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">View Certificate</a></div>` : ''}
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/student/exams" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Open Exam Center</a>
    </div>
  `);

  await notifySingleStudent(student, {
    type: 'grade',
    category: passed ? 'success' : 'info',
    title: `${passed ? 'Passed' : 'Final exam results'}: ${payload.examTitle}`,
    message: `You scored ${payload.grade}/${maxGrade} (${percentage}%) in ${payload.examTitle}.`,
    link: `${FRONTEND_URL}/student/exams`,
    related_id: payload.submissionId || payload.courseId,
    related_type: 'final_exam_submission',
  }, subject, html);
}

export async function notifyAnnouncementCreated(
  courseId: string,
  courseTitle: string,
  announcementTitle: string,
  excerpt?: string,
  announcementId?: string
): Promise<void> {
  const students = await getEnrolledStudents(courseId);
  if (students.length === 0) return;

  const subject = `📣 Announcement: ${announcementTitle}`;
  const html = wrapEmail('New Announcement', '📣', `
    <p>As-salamu alaykum,</p>
    <p>A new announcement was posted in <strong>${courseTitle}</strong>.</p>
    <div style="background:#f8fafc;padding:20px;border-left:4px solid #0f766e;margin:20px 0;border-radius:8px;">
      <h2 style="margin:0 0 8px;color:#0f766e;">${announcementTitle}</h2>
      ${excerpt ? `<p style="margin:0;color:#334155;">${excerpt}</p>` : ''}
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/student/announcements" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0f4c5c);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">View Announcement</a>
    </div>
  `);

  await fanOutStudentNotifications(
    students,
    {
      type: 'announcement',
      category: 'info',
      title: announcementTitle,
      message: excerpt || `New announcement posted in ${courseTitle}.`,
      link: `${FRONTEND_URL}/student/announcements`,
      related_id: announcementId || courseId,
      related_type: 'announcement',
    },
    subject,
    html
  );
}

// ---------------------------------------------------------------------------
// 6. FINAL EXAM INTERVIEW REMINDERS (single student)
// ---------------------------------------------------------------------------
export async function notifyFinalExamInterviewReminder(
  studentEmail: string,
  studentName: string,
  payload: {
    courseTitle: string;
    examTitle: string;
    scheduledAt: string;
    meetingLink?: string | null;
    reminderType: '24h' | '1h' | '15m' | '5m';
  }
): Promise<void> {
  const formattedDate = new Date(payload.scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  });

  const typeLabel = payload.reminderType === '24h'
    ? 'in 24 hours'
    : payload.reminderType === '1h'
    ? 'in 1 hour'
    : payload.reminderType === '15m'
    ? 'in 15 minutes'
    : 'in 5 minutes';

  const subjectPrefix = payload.reminderType === '15m' || payload.reminderType === '5m'
    ? '🚨 Final Exam Interview Starting Soon'
    : '⏰ Final Exam Interview Reminder';

  const subject = `${subjectPrefix}: ${payload.examTitle}`;
  const html = wrapEmail('Final Exam Interview Reminder', '🎤', `
    <p>As-salamu alaykum <strong>${studentName || 'Student'}</strong>,</p>
    <p>This is a reminder that your final exam interview for <strong>${payload.courseTitle}</strong> is scheduled <strong>${typeLabel}</strong>.</p>
    <div style="background:#ecfdf5;padding:20px;border-left:4px solid #10b981;margin:20px 0;border-radius:8px;">
      <h3 style="margin:0 0 12px;color:#065f46;">${payload.examTitle}</h3>
      <p style="margin:4px 0;color:#047857;">📅 <strong>${formattedDate} IST</strong></p>
      ${payload.meetingLink ? `
      <div style="margin-top:16px;">
        <a href="${payload.meetingLink}" style="display:inline-block;background:#10b981;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
          🔗 Join Interview
        </a>
      </div>` : ''}
    </div>
    <p style="font-size:13px;color:#6b7280;">Please join on time and ensure your audio/video setup is ready beforehand.</p>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/student/exams" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Open Exam Center
      </a>
    </div>
  `);

  await safeSend(studentEmail, subject, html);
}

export async function notifyTeacherInterviewAssignment(
  teacherEmail: string,
  teacherName: string,
  payload: {
    courseTitle: string;
    examTitle: string;
    assignedCount: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<void> {
  const subject = `📅 Interview Allocation: ${payload.examTitle}`;
  const html = wrapEmail('Interview Allocation', '🧑‍🏫', `
    <p>As-salamu alaykum <strong>${teacherName || 'Teacher'}</strong>,</p>
    <p>You have been assigned <strong>${payload.assignedCount}</strong> final exam interview(s).</p>
    <div style="background:#eff6ff;padding:20px;border-left:4px solid #3b82f6;margin:20px 0;border-radius:8px;">
      <h3 style="margin:0 0 12px;color:#1d4ed8;">${payload.examTitle}</h3>
      <p style="margin:4px 0;color:#1e40af;">📘 Course: <strong>${payload.courseTitle}</strong></p>
      ${payload.startDate ? `<p style="margin:4px 0;color:#1e40af;">🗓️ Start: <strong>${payload.startDate}</strong></p>` : ''}
      ${payload.endDate ? `<p style="margin:4px 0;color:#1e40af;">🗓️ End: <strong>${payload.endDate}</strong></p>` : ''}
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/teacher/interviews" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Open My Interviews
      </a>
    </div>
  `);

  await safeSend(teacherEmail, subject, html);
}

export async function notifyTeacherInterviewStartingSoon(
  teacherEmail: string,
  teacherName: string,
  payload: {
    studentName: string;
    courseTitle: string;
    examTitle: string;
    scheduledAt: string;
    meetingLink?: string | null;
  }
): Promise<void> {
  const formattedDate = new Date(payload.scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
  });

  const subject = `🔔 Student Waiting Soon: ${payload.studentName}`;
  const html = wrapEmail('Student Interview Alert', '🎤', `
    <p>As-salamu alaykum <strong>${teacherName || 'Teacher'}</strong>,</p>
    <p>Your interview with <strong>${payload.studentName}</strong> starts in about <strong>5 minutes</strong>.</p>
    <div style="background:#fef2f2;padding:20px;border-left:4px solid #ef4444;margin:20px 0;border-radius:8px;">
      <h3 style="margin:0 0 12px;color:#991b1b;">${payload.examTitle}</h3>
      <p style="margin:4px 0;color:#7f1d1d;">📘 Course: <strong>${payload.courseTitle}</strong></p>
      <p style="margin:4px 0;color:#7f1d1d;">👤 Student: <strong>${payload.studentName}</strong></p>
      <p style="margin:4px 0;color:#7f1d1d;">📅 Time: <strong>${formattedDate} IST</strong></p>
      ${payload.meetingLink ? `
      <div style="margin-top:16px;">
        <a href="${payload.meetingLink}" style="display:inline-block;background:#ef4444;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Join Interview
        </a>
      </div>` : ''}
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/teacher/interviews" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
        Open My Interviews
      </a>
    </div>
  `);

  await safeSend(teacherEmail, subject, html);
}
