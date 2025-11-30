
import pool from '../config/database';
import { sendStudentMeetingNotification, sendTeacherMeetingNotification } from './emailService';
import { formatTimeRange, formatDate } from '../utils/timeFormat';

/**
 * BOX APPROVAL SERVICE
 * Groups meeting requests by slot (teacher + date + time)
 * Allows batch approval of all students in a box
 */

interface Box {
  boxId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
  slotName: string;
  maxCapacity: number;
  currentBookings: number;
  deadlineUtc: string;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'APPROVED';
  students: Array<{
    requestId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    notes: string;
    paymentStatus: string;
    amount: number;
    requestedAt: string;
  }>;
}

/**
 * Get all boxes grouped by slot
 * A box = one teacher slot with multiple student requests
 */
export const getPendingBoxes = async (): Promise<Box[]> => {
  try {
    // Query boxes grouped by teacher_slot_id (the correct primary key!)
    const query = `
      SELECT 
        mb.teacher_slot_id as box_id,
        tsa.teacher_id,
        p.full_name as teacher_name,
        p.email as teacher_email,
        mb.meeting_date as date,
        tsa.time_slot_id,
        ts.slot_name,
        ts.start_time,
        ts.end_time,
        tsa.max_capacity,
        COUNT(mb.id)::integer as current_bookings,
        -- Combine date and time into a UTC timestamp for deadline
        CASE 
          WHEN tsa.booking_deadline_date IS NOT NULL AND tsa.booking_deadline_time IS NOT NULL THEN
            (tsa.booking_deadline_date || ' ' || tsa.booking_deadline_time)::timestamp
          ELSE NULL
        END as deadline_utc,
        CASE 
          WHEN tsa.booking_deadline_date IS NOT NULL AND tsa.booking_deadline_time IS NOT NULL THEN
            ROUND(EXTRACT(EPOCH FROM ((tsa.booking_deadline_date || ' ' || tsa.booking_deadline_time)::timestamp - NOW())) / 3600, 1)
          ELSE NULL
        END as hours_until_deadline,
        CASE 
          -- CLOSED: deadline passed OR capacity full (but still approvable)
          WHEN (tsa.booking_deadline_date IS NOT NULL AND tsa.booking_deadline_time IS NOT NULL 
            AND (tsa.booking_deadline_date || ' ' || tsa.booking_deadline_time)::timestamp < NOW())
            OR COUNT(mb.id) >= tsa.max_capacity THEN 'CLOSED'
          -- PARTIAL: within 3 hours of deadline OR has some bookings
          WHEN (tsa.booking_deadline_date IS NOT NULL AND tsa.booking_deadline_time IS NOT NULL
            AND EXTRACT(EPOCH FROM ((tsa.booking_deadline_date || ' ' || tsa.booking_deadline_time)::timestamp - NOW())) / 3600 < 3)
            OR COUNT(mb.id) > 0 THEN 'PARTIAL'
          ELSE 'OPEN'
        END as status,
        -- Calculate minutes until meeting starts
        CASE 
          WHEN tsa.booking_deadline_date IS NOT NULL AND tsa.booking_deadline_time IS NOT NULL THEN
            ROUND(EXTRACT(EPOCH FROM (mb.meeting_date || ' ' || ts.start_time)::timestamp - NOW()) / 60)
          ELSE NULL
        END as minutes_until_meeting,
        json_agg(
          json_build_object(
            'requestId', mb.id,
            'studentId', mb.student_id,
            'studentName', mb.student_name,
            'studentEmail', mb.student_email,
            'studentPhone', mb.student_phone,
            'notes', mb.notes,
            'paymentStatus', mb.payment_status,
            'amount', mb.payment_amount::numeric,
            'requestedAt', mb.created_at
          ) ORDER BY mb.created_at
        ) as students
      FROM meeting_bookings mb
      JOIN teacher_slot_availability tsa ON tsa.id = mb.teacher_slot_id
      JOIN time_slots ts ON ts.id = tsa.time_slot_id
      JOIN profiles p ON p.clerk_user_id = tsa.teacher_id
      WHERE mb.status = 'paid' 
        AND mb.approval_status = 'pending'
        AND mb.teacher_slot_id IS NOT NULL
        AND tsa.date >= CURRENT_DATE
      GROUP BY 
        mb.teacher_slot_id,
        tsa.teacher_id,
        p.full_name,
        p.email,
        mb.meeting_date,
        tsa.time_slot_id,
        ts.slot_name,
        ts.start_time,
        ts.end_time,
        tsa.max_capacity,
        tsa.booking_deadline_date,
        tsa.booking_deadline_time
      ORDER BY mb.meeting_date, ts.start_time
    `;

    const result = await pool.query(query);
    
    return result.rows.map((row: any) => ({
      boxId: row.box_id,
      teacherId: row.teacher_id,
      teacherName: row.teacher_name,
      teacherEmail: row.teacher_email,
      date: row.date,
      timeSlotId: row.time_slot_id,
      slotName: row.slot_name,
      startTime: row.start_time,
      endTime: row.end_time,
      maxCapacity: row.max_capacity,
      currentBookings: row.current_bookings,
      deadlineUtc: row.deadline_utc,
      status: row.status,
      students: row.students,
    }));
  } catch (error) {
    console.error('Error getting pending boxes:', error);
    throw error;
  }
};

/**
 * Approve an entire box (all students in the slot)
 * Generates meeting link and sends emails
 */
import { isCalendarConfigured, createMeetEvent } from './calendarService';

export const approveBox = async (
  boxId: string,
  adminId: string,
  meetingLink?: string,
  forceApprove: boolean = false
): Promise<{ approved: number; failed: number }> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get all paid requests for this box using teacher_slot_id (meeting_bookings)
    const requestsQuery = `
      SELECT mb.id, mb.student_id, mb.student_name, mb.student_email, mb.student_phone, mb.meeting_date, mb.time_slot_id, mb.notes,
             tsa.teacher_id, p.full_name as teacher_name, p.email as teacher_email, ts.start_time, ts.end_time, ts.slot_name
      FROM meeting_bookings mb
      JOIN teacher_slot_availability tsa ON tsa.id = mb.teacher_slot_id
      JOIN profiles p ON p.clerk_user_id = tsa.teacher_id
      JOIN time_slots ts ON ts.id = tsa.time_slot_id
      WHERE mb.teacher_slot_id = $1
        AND mb.status = 'paid'
    `;

    const requests = await client.query(requestsQuery, [boxId]);

    let approved = 0;
    let failed = 0;

    for (const request of requests.rows) {
      try {
        // Update approval status and set meeting link
        let updateQuery = `UPDATE meeting_bookings 
                          SET approval_status = 'approved', 
                              status = 'approved', 
                              updated_at = NOW()`;
        const params: any[] = [request.id];

        // Meeting link now MUST be provided manually (auto generation disabled)
        if (meetingLink && meetingLink.trim().length > 0) {
          updateQuery += `, meeting_link = $2 WHERE id = $1`;
          params.splice(1, 0, meetingLink);
        } else {
          updateQuery += ` WHERE id = $1`;
        }

        await client.query(updateQuery, params);
        
        console.log(`✅ Approved booking for ${request.student_name} (${request.student_email})`);
        
        // Send email notifications if meeting link provided
        if (meetingLink) {
          try {
            const formattedTime = formatTimeRange(request.start_time, request.end_time);
            const formattedDate = formatDate(request.meeting_date);
            
            await sendStudentMeetingNotification(
              request.student_email,
              request.student_name,
              request.teacher_name,
              formattedDate,
              formattedTime,
              meetingLink
            );
            
            await sendTeacherMeetingNotification(
              request.teacher_email,
              request.teacher_name,
              request.student_name,
              request.student_email,
              request.student_phone || '',
              formattedDate,
              formattedTime,
              meetingLink
            );
            
            // Mark emails as sent
            await client.query(
              `UPDATE meeting_bookings 
               SET student_email_sent = true, teacher_email_sent = true 
               WHERE id = $1`,
              [request.id]
            );
            
            console.log(`📧 Sent email notifications for ${request.student_name}`);
          } catch (emailError) {
            console.error(`❌ Failed to send emails for ${request.student_name}:`, emailError);
          }
        }
        
        approved++;
      } catch (err) {
        console.error(`❌ Failed to approve booking for ${request.student_name}:`, err);
        failed++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`📦 Box approval complete: ${approved} approved, ${failed} failed`);
    
    return { approved, failed };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving box:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Generate Google Meet link and approve box
 * Creates a Google Meet-style link with proper date/time context
 */
export const generateMeetingAndApprove = async (
  boxId: string,
  adminId: string,
  date: string,
  startTime: string,
  endTime: string,
  teacherName?: string
): Promise<{ approved: number; failed: number; meetingLink: string }> => {
  let meetingLink: string | undefined;
  try {
    if (isCalendarConfigured()) {
      // Build ISO datetimes (assume inputs are 'YYYY-MM-DD' and 'HH:MM:SS')
      const tz = process.env.TIMEZONE || 'Asia/Kolkata';
      const startDateTimeISO = `${date}T${startTime}`; // assume server timezone matches tz
      const endDateTimeISO = `${date}T${endTime}`;
      // Gather attendees (students) for this box
      const attendeesRes = await pool.query(
        `SELECT student_email FROM meeting_bookings WHERE teacher_slot_id = $1 AND status = 'paid' AND approval_status = 'pending'`,
        [boxId]
      );
      const attendeesEmails: string[] = attendeesRes.rows.map(r => r.student_email).filter((e: string) => !!e);

      const summary = `Class with ${teacherName || 'Teacher'}`;
      const created = await createMeetEvent({
        summary,
        startDateTimeISO,
        endDateTimeISO,
        timeZone: tz,
        attendeesEmails,
      });
      meetingLink = created.hangoutLink;
      console.log(`🎥 Created Google Meet event ${created.eventId} link: ${meetingLink}`);
    }
  } catch (e) {
    console.warn('⚠️ Google Calendar not configured or failed, falling back to pseudo link:', (e as Error).message);
  }

  if (!meetingLink) {
    // Fallback to pseudo Meet-style link (not guaranteed joinable)
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const rnd = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    meetingLink = `https://meet.google.com/${rnd(3)}-${rnd(4)}-${rnd(3)}`;
    console.log(`🎥 Fallback generated Google Meet-style link: ${meetingLink}`);
  }

  // Call approveBox with generated meeting link
  const result = await approveBox(boxId, adminId, meetingLink);
  
  return {
    ...result,
    meetingLink
  };
};

/**
 * Close a box (no more bookings allowed)
 * Happens automatically at deadline or when capacity full
 */
export const closeBox = async (boxId: string): Promise<void> => {
  try {
    const [teacherId, date, timeSlotId] = boxId.split('_');
    
    await pool.query(
      `UPDATE teacher_slot_availability 
       SET is_available = false
       WHERE teacher_id = $1
         AND date = $2
         AND time_slot_id = $3`,
      [teacherId, date, timeSlotId]
    );
  } catch (error) {
    console.error('Error closing box:', error);
    throw error;
  }
};

/**
 * Auto-close boxes that reached deadline
 * Run this via cron job every 10 minutes
 */
export const autoCloseExpiredBoxes = async (): Promise<number> => {
  try {
    const result = await pool.query(
      `UPDATE teacher_slot_availability
       SET is_available = false
       WHERE is_available = true
         AND booking_deadline_date IS NOT NULL
         AND booking_deadline_time IS NOT NULL
         AND (booking_deadline_date || ' ' || booking_deadline_time)::timestamp < NOW()
       RETURNING id`
    );
    
    console.log(`🔒 Auto-closed ${result.rowCount} expired boxes`);
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error auto-closing boxes:', error);
    throw error;
  }
};
