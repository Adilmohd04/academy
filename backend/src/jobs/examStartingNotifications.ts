/**
 * EXAM STARTING NOTIFICATIONS - Sends when interview is about to start
 * - 5 minutes before: Send student final reminder + join button
 * - At exact time: Send teacher "Student is waiting" notification
 * 
 * Requirements:
 * - PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET env vars configured
 * - Install: npm install pusher
 */

import cron from 'node-cron';
import { supabase } from '../config/database';
import nodemailer from 'nodemailer';

type ProfileRow = {
  id?: string;
  full_name?: string;
  email?: string;
};

type CourseRow = {
  id?: string;
  title?: string;
};

type FinalExamRow = {
  id?: string;
  title?: string;
  course_id?: string;
  courses?: CourseRow | CourseRow[] | null;
};

function firstOrNull<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function parseNotes(input: unknown): Record<string, any> {
  if (!input) return {};
  if (typeof input === 'object') return input as Record<string, any>;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

// Real-time notification service (Pusher)
let pusher: any = null;
try {
  const Pusher = require('pusher');
  if (process.env.PUSHER_APP_ID) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || 'mt1',
      useTLS: true
    });
  }
} catch (err) {
  console.log('⚠️  Pusher not configured for real-time notifications');
}

// Email service (same as existing)
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

async function sendStudentExamStartingEmail(
  studentEmail: string,
  studentName: string,
  examTitle: string,
  courseName: string,
  meetingLink: string,
  scheduledDate: string
): Promise<void> {
  const examDateTime = new Date(scheduledDate).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Your Exam is Starting Soon!</h2>
      
      <p>Assalamu Alaikum ${studentName},</p>
      
      <p>Your <strong>${examTitle}</strong> interview for <strong>${courseName}</strong> starts in <strong>5 minutes</strong>!</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Exam Details:</strong></p>
        <p>📅 Date & Time: ${examDateTime}</p>
        <p>📝 Course: ${courseName}</p>
        <p>🎯 Exam: ${examTitle}</p>
      </div>
      
      <p style="margin: 20px 0;">
        <a href="${meetingLink}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          ✨ JOIN EXAM NOW
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px;">
        <strong>⚠️ Important:</strong> Please ensure you have:
        <ul>
          <li>✓ Stable internet connection</li>
          <li>✓ Working microphone and camera</li>
          <li>✓ Quiet environment</li>
          <li>✓ Valid ID proof nearby</li>
        </ul>
      </p>
      
      <p style="color: #999; font-size: 12px; margin-top: 30px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  `;

  await emailTransporter.sendMail({
    from: process.env.GMAIL_USER,
    to: studentEmail,
    subject: `⏰ Your Exam Starts in 5 Minutes: ${examTitle}`,
    html: htmlContent
  });
}

async function sendTeacherStudentWaitingEmail(
  teacherEmail: string,
  teacherName: string,
  studentName: string,
  examTitle: string,
  courseName: string,
  meetingLink: string
): Promise<void> {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Student Waiting for Interview</h2>
      
      <p>Assalamu Alaikum ${teacherName},</p>
      
      <p><strong>${studentName}</strong> is waiting to start their <strong>${examTitle}</strong> interview.</p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p><strong>🔔 ACTION NEEDED:</strong></p>
        <p>Student is ready to join the interview. Please be at your desk and monitor the meeting link.</p>
      </div>
      
      <p><strong>Interview Details:</strong></p>
      <ul>
        <li>👤 Student: ${studentName}</li>
        <li>📝 Course: ${courseName}</li>
        <li>🎯 Exam: ${examTitle}</li>
        <li>🔗 Meeting Link: <a href="${meetingLink}">${meetingLink}</a></li>
      </ul>
      
      <p style="color: #666; font-size: 14px;">
        Please ensure the meeting link is secure and only the assigned student is admitted.
      </p>
    </div>
  `;

  await emailTransporter.sendMail({
    from: process.env.GMAIL_USER,
    to: teacherEmail,
    subject: `🔔 Student Waiting: ${studentName} - ${examTitle}`,
    html: htmlContent
  });
}

async function pushStudentNotification(
  studentId: string,
  title: string,
  message: string,
  meetingLink: string,
  examStartsInSeconds: number
): Promise<void> {
  if (!pusher) return;

  try {
    await pusher.trigger(`exam-student-${studentId}`, 'exam-starting', {
      title,
      message,
      meetingLink,
      startsInSeconds: examStartsInSeconds,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error pushing real-time notification:', err);
  }
}

async function pushTeacherNotification(
  teacherId: string,
  studentName: string,
  examTitle: string,
  meetingLink: string
): Promise<void> {
  if (!pusher) return;

  try {
    await pusher.trigger(`exam-teacher-${teacherId}`, 'student-waiting', {
      title: 'Student Waiting for Interview',
      message: `${studentName} is ready to start ${examTitle}`,
      meetingLink,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error pushing teacher notification:', err);
  }
}

/**
 * Check for interviews starting in 5 minutes
 * Runs every 2 minutes
 */
async function processExamStartingNotifications(): Promise<void> {
  try {
    const now = new Date();
    const sixMinutesFromNow = new Date(now.getTime() + 6 * 60 * 1000);

    // Find interviews starting in approximately 5 minutes
    const { data: interviews, error } = await supabase
      .from('final_exam_interviews')
      .select(`
        id,
        final_exam_id,
        student_id,
        scheduled_date,
        meeting_link,
        status,
        notes,
        final_exams (
          id,
          title,
          course_id,
          courses (
            id,
            title
          )
        ),
        profiles:student_id (
          id,
          full_name,
          email
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_date', now.toISOString())
      .lt('scheduled_date', sixMinutesFromNow.toISOString())
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching interviews for 5-min reminders:', error);
      return;
    }

    if (!interviews || interviews.length === 0) {
      return;
    }

    // Send notifications to students and teachers
    for (const interview of interviews) {
      try {
        const scheduledTime = new Date(interview.scheduled_date);
        const secondsUntilExam = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);

        const studentProfile = firstOrNull<ProfileRow>(interview.profiles as ProfileRow | ProfileRow[] | null);
        if (!studentProfile) {
          console.log(`⚠️  No student profile for interview ${interview.id}`);
          continue;
        }

        const finalExam = firstOrNull<FinalExamRow>(interview.final_exams as FinalExamRow | FinalExamRow[] | null);
        const course = firstOrNull<CourseRow>(finalExam?.courses ?? null);

        if (!studentProfile.email || !finalExam?.title) {
          console.log(`⚠️  Missing student email or exam title for interview ${interview.id}`);
          continue;
        }

        // Send email to student
        await sendStudentExamStartingEmail(
          studentProfile.email,
          studentProfile.full_name || 'Student',
          finalExam.title,
          course?.title || 'Your Course',
          interview.meeting_link || 'Link not yet provided',
          interview.scheduled_date
        );

        // Send real-time notification to student
        await pushStudentNotification(
          interview.student_id,
          '⏰ Exam Starting Soon!',
          'Your exam starts in 5 minutes. Click below to join.',
          interview.meeting_link || '',
          secondsUntilExam
        );

        // Get assigned teacher from notes
        let teacherId = null;
        const notesData = parseNotes(interview.notes);
        teacherId = notesData.assigned_interviewer_id || null;

        // If no assigned teacher, use course teacher
        if (!teacherId) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('teacher_id')
            .eq('id', finalExam.course_id)
            .single();
          teacherId = courseData?.teacher_id;
        }

        // Send notification to teacher
        if (teacherId) {
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', teacherId)
            .single();

          if (teacherProfile) {
            // Email to teacher
            await sendTeacherStudentWaitingEmail(
              teacherProfile.email,
              teacherProfile.full_name || 'Teacher',
              studentProfile.full_name || 'Student',
              finalExam.title,
              course?.title || 'Your Course',
              interview.meeting_link || 'Link not yet provided'
            );

            // Real-time notification to teacher
            await pushTeacherNotification(
              teacherId,
              studentProfile.full_name || 'Student',
              finalExam.title,
              interview.meeting_link || ''
            );
          }
        }

        console.log(`✅ Sent 5-min reminder for interview ${interview.id}`);
      } catch (err) {
        console.error(`Error processing interview ${interview.id}:`, err);
      }
    }
  } catch (error) {
    console.error('❌ Error in processExamStartingNotifications:', error);
  }
}

/**
 * Initialize the cron job
 * Runs every 2 minutes to catch exams starting in ~5 minutes
 */
export function initExamStartingNotifications(): void {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', () => {
    console.log('🔔 Checking for exams starting in 5 minutes...');
    processExamStartingNotifications().catch(err => {
      console.error('Unhandled error in exam starting notifications:', err);
    });
  });

  console.log('✅ Exam starting notifications job initialized (checks every 2 minutes)');
}

export { processExamStartingNotifications };
