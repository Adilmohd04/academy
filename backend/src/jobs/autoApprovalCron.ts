import { CronJob } from 'cron';
import pool from '../config/database';
import { sendStudentMeetingNotification, sendTeacherMeetingNotification } from '../services/emailService';
import { formatTimeRange, formatDate } from '../utils/timeFormat';
import { isCalendarConfigured, createMeetEvent } from '../services/calendarService';

/**
 * Auto-approve boxes 10 minutes before meeting starts
 * Runs every minute to check for meetings that need auto-approval
 */
export const autoApprovalCronJob = new CronJob(
  '* * * * *', // Run every minute
  async () => {
    try {
      console.log('🔍 Checking for boxes needing auto-approval...');
      
      const result = await pool.query(`
        SELECT DISTINCT
          mb.teacher_slot_id as box_id,
          tsa.teacher_id,
          p.full_name as teacher_name,
          p.email as teacher_email,
          mb.meeting_date,
          ts.start_time,
          ts.end_time,
          ts.slot_name,
          COUNT(mb.id) as student_count,
          ROUND(EXTRACT(EPOCH FROM ((mb.meeting_date || ' ' || ts.start_time)::timestamp - NOW())) / 60) as minutes_until_meeting
        FROM meeting_bookings mb
        JOIN teacher_slot_availability tsa ON tsa.id = mb.teacher_slot_id
        JOIN time_slots ts ON ts.id = tsa.time_slot_id
        JOIN profiles p ON p.clerk_user_id = tsa.teacher_id
        WHERE mb.status = 'paid'
          AND mb.approval_status = 'pending'
          AND mb.teacher_slot_id IS NOT NULL
          AND mb.meeting_date >= CURRENT_DATE
          AND (
            -- Upcoming within next 10 minutes
            ((mb.meeting_date || ' ' || ts.start_time)::timestamp - NOW()) BETWEEN INTERVAL '0 minutes' AND INTERVAL '10 minutes'
            OR
            -- Missed: already started but within past 60 minutes
            ((mb.meeting_date || ' ' || ts.start_time)::timestamp BETWEEN (NOW() - INTERVAL '60 minutes') AND NOW())
          )
        GROUP BY
          mb.teacher_slot_id,
          tsa.teacher_id,
          p.full_name,
          p.email,
          mb.meeting_date,
          ts.start_time,
          ts.end_time,
          ts.slot_name
        HAVING COUNT(mb.id) > 0
      `);

      if (result.rows.length === 0) {
        console.log('✅ No boxes need auto-approval at this time');
        return;
      }

      console.log(`📦 Found ${result.rows.length} box(es) needing auto-approval`);

      for (const box of result.rows) {
        try {
          const missed = box.minutes_until_meeting < 0;
          console.log(`🔄 Auto-approving box: ${box.box_id} (${box.student_count} students, ${missed ? 'MEETING STARTED' : 'starts in ' + box.minutes_until_meeting + ' mins'})`);
          
          // Create Google Meet link via Calendar API if configured; fallback otherwise
          let meetingLink: string | undefined;
          try {
            if (isCalendarConfigured()) {
              const tz = process.env.TIMEZONE || 'Asia/Kolkata';
              const startDateTimeISO = `${box.meeting_date}T${box.start_time}`;
              const endDateTimeISO = `${box.meeting_date}T${box.end_time}`;
              const attendeesEmails: string[] = [];
              const attendeesRows = await pool.query(
                `SELECT mb.student_email FROM meeting_bookings mb WHERE mb.teacher_slot_id = $1 AND mb.status = 'paid' AND mb.approval_status = 'pending'`,
                [box.box_id]
              );
              for (const r of attendeesRows.rows) {
                if (r.student_email) attendeesEmails.push(r.student_email);
              }
              const created = await createMeetEvent({
                summary: `Class with ${box.teacher_name}`,
                startDateTimeISO,
                endDateTimeISO,
                timeZone: tz,
                attendeesEmails,
              });
              meetingLink = created.hangoutLink;
              console.log(`🎥 Created Google Meet event ${created.eventId} link: ${meetingLink}`);
            }
          } catch (e) {
            console.warn('⚠️ Auto-approval calendar create failed; using pseudo link:', (e as Error).message);
          }
          if (!meetingLink) {
            meetingLink = `https://meet.google.com/${generateMeetCode()}`;
          }
          
          // Get all students in this box
          const studentsResult = await pool.query(`
            SELECT 
              mb.id,
              mb.student_id,
              mb.student_name,
              mb.student_email,
              mb.student_phone,
              mb.notes,
              mb.payment_amount
            FROM meeting_bookings mb
            WHERE mb.teacher_slot_id = $1
              AND mb.status = 'paid'
              AND mb.approval_status = 'pending'
          `, [box.box_id]);

          let approved = 0;
          let failed = 0;

          // Approve each student
          for (const student of studentsResult.rows) {
            try {
              // Update booking status
              await pool.query(`
                UPDATE meeting_bookings 
                SET 
                  approval_status = 'approved', 
                  status = 'approved',
                  meeting_link = $1,
                  approved_by = 'AUTO_SYSTEM',
                  approval_date = NOW(),
                  updated_at = NOW()
                WHERE id = $2
              `, [meetingLink, student.id]);

              // Send email notifications
              const formattedTime = formatTimeRange(box.start_time, box.end_time);
              const formattedDate = formatDate(box.meeting_date);

              await sendStudentMeetingNotification(
                student.student_email,
                student.student_name,
                box.teacher_name,
                formattedDate,
                formattedTime,
                meetingLink
              );

              await sendTeacherMeetingNotification(
                box.teacher_email,
                box.teacher_name,
                student.student_name,
                student.student_email,
                student.student_phone || '',
                formattedDate,
                formattedTime,
                meetingLink
              );

              // Mark emails as sent
              await pool.query(`
                UPDATE meeting_bookings 
                SET student_email_sent = true, teacher_email_sent = true 
                WHERE id = $1
              `, [student.id]);

              console.log(`✅ Auto-approved: ${student.student_name}`);
              approved++;
            } catch (err) {
              console.error(`❌ Failed to auto-approve ${student.student_name}:`, err);
              failed++;
            }
          }

          console.log(`✅ Box ${box.box_id} auto-approved: ${approved} students, ${failed} failures`);
        } catch (boxError) {
          console.error(`❌ Error auto-approving box ${box.box_id}:`, boxError);
        }
      }

    } catch (error) {
      console.error('❌ Error in auto-approval cron job:', error);
    }
  },
  null,
  false, // Don't start immediately
  'Asia/Kolkata'
);

/**
 * Generate a random Google Meet-style code (xxx-yyyy-zzz)
 */
function generateMeetCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const randomString = (length: number) => 
    Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  
  return `${randomString(3)}-${randomString(4)}-${randomString(3)}`;
}

export default autoApprovalCronJob;
