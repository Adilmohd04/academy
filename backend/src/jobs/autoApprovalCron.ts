import { CronJob } from 'cron';
import { supabase } from '../config/database';
import { sendStudentMeetingNotification, sendTeacherMeetingNotification } from '../modules/shared/services/emailService';
import { formatTimeRange, formatDate } from '../utils/timeFormat';
import { isCalendarConfigured, createMeetEvent } from '../modules/shared/services/calendarService';

/**
 * Auto-approve boxes 10 minutes before meeting starts
 * Runs every minute to check for meetings that need auto-approval
 */
export const autoApprovalCronJob = new CronJob(
  '* * * * *', // Run every minute
  async () => {
    try {
      console.log('🔍 Checking for boxes needing auto-approval...');
      
      // Use raw SQL via Supabase rpc for complex query
      const { data: boxesNeedingApproval, error: queryError } = await supabase.rpc('get_boxes_needing_auto_approval');
      
      // Fallback to direct query if rpc doesn't exist
      let result: any[] = [];
      if (queryError) {
        // Use raw query approach
        const { data, error } = await supabase
          .from('meeting_bookings')
          .select(`
            id,
            teacher_slot_id,
            meeting_date,
            status,
            approval_status,
            student_name,
            student_email,
            student_phone,
            notes,
            payment_amount,
            student_id,
            teacher_slot_availability!inner (
              teacher_id,
              time_slots!inner (
                start_time,
                end_time,
                slot_name
              )
            )
          `)
          .eq('status', 'paid')
          .eq('approval_status', 'pending')
          .not('teacher_slot_id', 'is', null)
          .gte('meeting_date', new Date().toISOString().split('T')[0]);

        if (error) {
          console.error('Error querying bookings:', error);
          return;
        }

        // Group by teacher_slot_id and filter by time
        const now = new Date();
        const groupedByBox: Record<string, any> = {};
        
        for (const booking of data || []) {
          const slot = (booking.teacher_slot_availability as any);
          const timeSlot = slot?.time_slots;
          const meetingDateTime = new Date(`${booking.meeting_date}T${timeSlot?.start_time}`);
          const minutesUntil = (meetingDateTime.getTime() - now.getTime()) / 60000;
          
          // Within 10 minutes before or up to 60 minutes after start
          if (minutesUntil <= 10 && minutesUntil >= -60) {
            const boxId = booking.teacher_slot_id;
            if (!groupedByBox[boxId]) {
              // Get teacher info
              const { data: teacherProfile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('clerk_user_id', slot.teacher_id)
                .single();

              groupedByBox[boxId] = {
                box_id: boxId,
                teacher_id: slot.teacher_id,
                teacher_name: teacherProfile?.full_name || 'Teacher',
                teacher_email: teacherProfile?.email || '',
                meeting_date: booking.meeting_date,
                start_time: timeSlot?.start_time,
                end_time: timeSlot?.end_time,
                slot_name: timeSlot?.slot_name,
                minutes_until_meeting: minutesUntil,
                students: []
              };
            }
            groupedByBox[boxId].students.push(booking);
          }
        }
        
        result = Object.values(groupedByBox);
      } else {
        result = boxesNeedingApproval || [];
      }

      if (result.length === 0) {
        console.log('✅ No boxes need auto-approval at this time');
        return;
      }

      console.log(`📦 Found ${result.length} box(es) needing auto-approval`);

      for (const box of result) {
        try {
          const missed = box.minutes_until_meeting < 0;
          const studentCount = box.students?.length || box.student_count || 0;
          console.log(`🔄 Auto-approving box: ${box.box_id} (${studentCount} students, ${missed ? 'MEETING STARTED' : 'starts in ' + Math.round(box.minutes_until_meeting) + ' mins'})`);
          
          // Create Google Meet link via Calendar API if configured; fallback otherwise
          let meetingLink: string | undefined;
          try {
            if (isCalendarConfigured()) {
              const tz = process.env.TIMEZONE || 'Asia/Kolkata';
              const startDateTimeISO = `${box.meeting_date}T${box.start_time}`;
              const endDateTimeISO = `${box.meeting_date}T${box.end_time}`;
              const attendeesEmails: string[] = [];
              
              // Get student emails
              const { data: attendeesData } = await supabase
                .from('meeting_bookings')
                .select('student_email')
                .eq('teacher_slot_id', box.box_id)
                .eq('status', 'paid')
                .eq('approval_status', 'pending');
              
              for (const r of attendeesData || []) {
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
          const { data: studentsInBox, error: studentsError } = await supabase
            .from('meeting_bookings')
            .select('id, student_id, student_name, student_email, student_phone, notes, payment_amount')
            .eq('teacher_slot_id', box.box_id)
            .eq('status', 'paid')
            .eq('approval_status', 'pending');

          if (studentsError) {
            console.error(`Error getting students for box ${box.box_id}:`, studentsError);
            continue;
          }

          let approved = 0;
          let failed = 0;

          // Approve each student
          for (const student of studentsInBox || []) {
            try {
              // Update booking status
              const { error: updateError } = await supabase
                .from('meeting_bookings')
                .update({
                  approval_status: 'approved',
                  status: 'approved',
                  meeting_link: meetingLink,
                  approved_by: 'AUTO_SYSTEM',
                  approval_date: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', student.id);

              if (updateError) throw updateError;

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
              const { error: emailUpdateError } = await supabase
                .from('meeting_bookings')
                .update({ 
                  student_email_sent: true, 
                  teacher_email_sent: true 
                })
                .eq('id', student.id);

              if (emailUpdateError) {
                console.warn(`Warning: Failed to mark emails sent for ${student.id}:`, emailUpdateError);
              }

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
