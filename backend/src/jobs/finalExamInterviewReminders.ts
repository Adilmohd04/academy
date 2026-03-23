import cron from 'node-cron';
import { supabase } from '../config/database';
import {
  notifyFinalExamInterviewReminder,
  notifyTeacherInterviewStartingSoon
} from '../services/courseNotificationService';

type ReminderType = '24h' | '1h' | '15m' | '5m';

type ReminderRule = {
  type: ReminderType;
  leadMinutes: number;
  sentKey: string;
};

const REMINDER_RULES: ReminderRule[] = [
  { type: '24h', leadMinutes: 24 * 60, sentKey: 'interview_reminder_24h_sent_at' },
  { type: '1h', leadMinutes: 60, sentKey: 'interview_reminder_1h_sent_at' },
  { type: '15m', leadMinutes: 15, sentKey: 'interview_reminder_15m_sent_at' },
  { type: '5m', leadMinutes: 5, sentKey: 'interview_reminder_5m_sent_at' }
];

const CHECK_WINDOW_MINUTES = 10;

function parseJsonObject(input: any): Record<string, any> {
  if (!input) return {};
  if (typeof input === 'object') return input;

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

function isWithinReminderWindow(scheduledAt: Date, now: Date, leadMinutes: number): boolean {
  const start = new Date(now.getTime() + leadMinutes * 60 * 1000);
  const end = new Date(start.getTime() + CHECK_WINDOW_MINUTES * 60 * 1000);
  return scheduledAt >= start && scheduledAt < end;
}

async function processInterviewReminders(): Promise<void> {
  try {
    const now = new Date();
    const searchEnd = new Date(now.getTime() + (24 * 60 + CHECK_WINDOW_MINUTES + 5) * 60 * 1000);

    const { data: interviews, error } = await supabase
      .from('final_exam_interviews')
      .select(`
        id,
        final_exam_id,
        student_id,
        scheduled_date,
        duration_minutes,
        meeting_link,
        notes,
        status,
        final_exams (
          id,
          title,
          course_id,
          courses (
            id,
            title
          )
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_date', now.toISOString())
      .lte('scheduled_date', searchEnd.toISOString())
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching final exam interviews for reminders:', error);
      return;
    }

    if (!interviews || interviews.length === 0) {
      return;
    }

    const studentIds = [...new Set((interviews || []).map((item: any) => item.student_id).filter(Boolean))];
    if (studentIds.length === 0) {
      return;
    }

    const { data: studentProfiles, error: studentError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);

    if (studentError) {
      console.error('❌ Error fetching student profiles for interview reminders:', studentError);
      return;
    }

    const profileMap = (studentProfiles || []).reduce((acc: Record<string, any>, profile: any) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    const teacherIds = [...new Set((interviews || []).map((item: any) => {
      const notesObj = parseJsonObject(item.notes);
      return notesObj.assigned_interviewer_id;
    }).filter(Boolean))];

    let teacherMap: Record<string, any> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', teacherIds);

      teacherMap = (teachers || []).reduce((acc: Record<string, any>, profile: any) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
    }

    let totalSent = 0;

    for (const interview of interviews) {
      try {
        const scheduledAt = new Date(interview.scheduled_date);
        if (isNaN(scheduledAt.getTime())) continue;

        const finalExamRaw: any = interview.final_exams;
        const finalExam = Array.isArray(finalExamRaw) ? finalExamRaw[0] : finalExamRaw;
        const courseRaw: any = finalExam?.courses;
        const course = Array.isArray(courseRaw) ? courseRaw[0] : courseRaw;

        const examTitle = finalExam?.title || 'Final Exam Interview';
        const courseTitle = course?.title || 'Your Course';

        const studentProfile = profileMap[interview.student_id];
        const studentEmail = studentProfile?.email;
        const studentName = studentProfile?.full_name || 'Student';

        if (!studentEmail) continue;

        const notesObj = parseJsonObject(interview.notes);

        for (const rule of REMINDER_RULES) {
          if (!isWithinReminderWindow(scheduledAt, now, rule.leadMinutes)) {
            continue;
          }

          if (notesObj[rule.sentKey]) {
            continue;
          }

          await notifyFinalExamInterviewReminder(studentEmail, studentName, {
            courseTitle,
            examTitle,
            scheduledAt: interview.scheduled_date,
            meetingLink: interview.meeting_link || null,
            reminderType: rule.type
          });

          notesObj[rule.sentKey] = new Date().toISOString();

          if (rule.type === '5m' && !notesObj.interview_teacher_reminder_5m_sent_at) {
            const teacherId = notesObj.assigned_interviewer_id;
            const teacherProfile = teacherId ? teacherMap[teacherId] : null;

            if (teacherProfile?.email) {
              await notifyTeacherInterviewStartingSoon(teacherProfile.email, teacherProfile.full_name || 'Teacher', {
                studentName,
                courseTitle,
                examTitle,
                scheduledAt: interview.scheduled_date,
                meetingLink: interview.meeting_link || null
              });
              notesObj.interview_teacher_reminder_5m_sent_at = new Date().toISOString();
            }
          }

          totalSent += 1;
        }

        const { error: updateError } = await supabase
          .from('final_exam_interviews')
          .update({
            notes: JSON.stringify(notesObj),
            updated_at: new Date().toISOString()
          })
          .eq('id', interview.id);

        if (updateError) {
          console.error(`⚠️ Failed to persist reminder state for interview ${interview.id}:`, updateError);
        }
      } catch (interviewError) {
        console.error('⚠️ Error processing interview reminder item:', interviewError);
      }
    }

    if (totalSent > 0) {
      console.log(`📧 Final exam interview reminders sent: ${totalSent}`);
    }
  } catch (error) {
    console.error('❌ Error in processInterviewReminders:', error);
  }
}

export function startFinalExamInterviewReminderJob(): void {
  console.log('🚀 Starting final exam interview reminder cron job (runs every 10 minutes)');

  cron.schedule('*/10 * * * *', async () => {
    await processInterviewReminders();
  });

  setTimeout(async () => {
    await processInterviewReminders();
  }, 7000);
}

export { processInterviewReminders };
