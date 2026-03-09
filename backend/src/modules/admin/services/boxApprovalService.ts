
import { supabase } from '../../../config/database';
import { sendStudentMeetingNotification, sendTeacherMeetingNotification } from '../../shared/services/emailService';
import { formatTimeRange, formatDate } from '../../../utils/timeFormat';

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
    // Using raw SQL via rpc since this is a complex aggregation query
    const { data: result, error } = await supabase.rpc('get_pending_boxes_query');
    
    // If RPC doesn't exist, fall back to a simpler approach
    if (error) {
      // Fallback: get meeting bookings WITHOUT FK joins (no FK constraints exist)
      const { data: bookings, error: bookingsError } = await supabase
        .from('meeting_bookings')
        .select('id, teacher_slot_id, meeting_date, student_id, student_name, student_email, student_phone, notes, payment_status, payment_amount, created_at')
        .eq('status', 'paid')
        .eq('approval_status', 'pending')
        .not('teacher_slot_id', 'is', null);

      if (bookingsError) throw bookingsError;

      // Fetch teacher_slot_availability data manually
      const slotIds = [...new Set((bookings || []).map((b: any) => b.teacher_slot_id).filter(Boolean))];
      let slotsMap: Record<string, any> = {};
      if (slotIds.length > 0) {
        const { data: slots } = await supabase
          .from('teacher_slot_availability')
          .select('id, teacher_id, time_slot_id, max_capacity, booking_deadline_date, booking_deadline_time, date')
          .in('id', slotIds);
        if (slots) {
          slots.forEach((s: any) => { slotsMap[s.id] = s; });
        }
      }

      // Filter bookings to only include future dates
      const today = new Date().toISOString().split('T')[0];
      const filteredBookings = (bookings || []).filter((b: any) => {
        const slot = slotsMap[b.teacher_slot_id];
        return slot && slot.date >= today;
      });

      // Fetch time_slots data
      const timeSlotIds = [...new Set(Object.values(slotsMap).map((s: any) => s.time_slot_id).filter(Boolean))];
      let timeSlotsMap: Record<string, any> = {};
      if (timeSlotIds.length > 0) {
        const { data: timeSlots } = await supabase
          .from('time_slots')
          .select('id, slot_name, start_time, end_time')
          .in('id', timeSlotIds);
        if (timeSlots) {
          timeSlots.forEach((ts: any) => { timeSlotsMap[ts.id] = ts; });
        }
      }

      // Get teacher profiles
      const teacherIds = [...new Set(Object.values(slotsMap).map((s: any) => s.teacher_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', teacherIds.length > 0 ? teacherIds : ['none']);

      const profileMap = new Map((profiles || []).map((p: any) => [p.clerk_user_id, p]));

      // Group by teacher_slot_id
      const boxMap = new Map<string, any>();
      for (const booking of filteredBookings) {
        const boxId = booking.teacher_slot_id;
        if (!boxMap.has(boxId)) {
          const tsa = slotsMap[boxId];
          const ts = tsa ? timeSlotsMap[tsa.time_slot_id] : null;
          const profile = tsa ? profileMap.get(tsa.teacher_id) : null;
          boxMap.set(boxId, {
            boxId,
            teacherId: tsa?.teacher_id,
            teacherName: profile?.full_name || 'Unknown',
            teacherEmail: profile?.email || '',
            date: booking.meeting_date,
            timeSlotId: tsa?.time_slot_id,
            slotName: ts?.slot_name || '',
            startTime: ts?.start_time || '',
            endTime: ts?.end_time || '',
            maxCapacity: tsa?.max_capacity || 1,
            currentBookings: 0,
            deadlineUtc: tsa?.booking_deadline_date && tsa?.booking_deadline_time 
              ? `${tsa.booking_deadline_date} ${tsa.booking_deadline_time}` : null,
            status: 'OPEN',
            students: []
          });
        }
        const box = boxMap.get(boxId);
        box.currentBookings++;
        box.students.push({
          requestId: booking.id,
          studentId: booking.student_id,
          studentName: booking.student_name,
          studentEmail: booking.student_email,
          studentPhone: booking.student_phone,
          notes: booking.notes,
          paymentStatus: booking.payment_status,
          amount: parseFloat(booking.payment_amount) || 0,
          requestedAt: booking.created_at
        });
      }

      return Array.from(boxMap.values());
    }
    
    return (result || []).map((row: any) => ({
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
import { isCalendarConfigured, createMeetEvent } from '../../shared/services/calendarService';

export const approveBox = async (
  boxId: string,
  adminId: string,
  meetingLink?: string,
  forceApprove: boolean = false
): Promise<{ approved: number; failed: number }> => {
  try {
    // Get all paid requests for this box WITHOUT FK joins
    const { data: requests, error: requestsError } = await supabase
      .from('meeting_bookings')
      .select('id, student_id, student_name, student_email, student_phone, meeting_date, time_slot_id, teacher_slot_id, notes')
      .eq('teacher_slot_id', boxId)
      .eq('status', 'paid');

    if (requestsError) throw requestsError;

    // Fetch teacher_slot_availability to get teacher_id
    let teacherId: string | null = null;
    let timeSlotData: any = null;
    if (requests && requests.length > 0) {
      const { data: slot } = await supabase
        .from('teacher_slot_availability')
        .select('teacher_id, time_slot_id')
        .eq('id', boxId)
        .single();
      if (slot) {
        teacherId = slot.teacher_id;
        // Fetch time slot info
        if (slot.time_slot_id) {
          const { data: ts } = await supabase
            .from('time_slots')
            .select('start_time, end_time, slot_name')
            .eq('id', slot.time_slot_id)
            .single();
          timeSlotData = ts;
        }
      }
    }

    // Get teacher profiles for the requests
    const teacherIds = teacherId ? [teacherId] : [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', teacherIds.length > 0 ? teacherIds : ['none']);

    const profileMap = new Map((profiles || []).map((p: any) => [p.clerk_user_id, p]));

    let approved = 0;
    let failed = 0;

    for (const request of requests || []) {
      try {
        const profile = teacherId ? profileMap.get(teacherId) : null;

        // Update approval status and set meeting link
        const updateData: any = {
          approval_status: 'approved',
          status: 'approved',
          updated_at: new Date().toISOString()
        };

        // Meeting link now MUST be provided manually (auto generation disabled)
        if (meetingLink && meetingLink.trim().length > 0) {
          updateData.meeting_link = meetingLink;
        }

        const { error: updateError } = await supabase
          .from('meeting_bookings')
          .update(updateData)
          .eq('id', request.id);

        if (updateError) throw updateError;
        console.log(`✅ Approved booking for ${request.student_name} (${request.student_email})`);
        
        // Send email notifications if meeting link provided
        if (meetingLink) {
          try {
            const formattedTime = formatTimeRange(timeSlotData?.start_time, timeSlotData?.end_time);
            const formattedDate = formatDate(request.meeting_date);
            
            // Build ISO datetime for calendar invite with timezone
            const startDateTime = `${request.meeting_date}T${timeSlotData?.start_time}+05:30`;
            const endDateTime = `${request.meeting_date}T${timeSlotData?.end_time}+05:30`;
            
            console.log(`📧 Sending calendar invite to ${request.student_email} and ${profile?.email}`);
            console.log(`📅 Meeting: ${formattedDate} at ${formattedTime}`);
            console.log(`🔗 Link: ${meetingLink}`);
            
            await sendStudentMeetingNotification(
              request.student_email,
              request.student_name,
              profile?.full_name || 'Teacher',
              formattedDate,
              formattedTime,
              meetingLink,
              startDateTime,
              endDateTime
            );
            
            await sendTeacherMeetingNotification(
              profile?.email || '',
              profile?.full_name || 'Teacher',
              request.student_name,
              request.student_email,
              request.student_phone || '',
              formattedDate,
              formattedTime,
              meetingLink,
              startDateTime,
              endDateTime
            );
            
            // Mark emails as sent
            await supabase
              .from('meeting_bookings')
              .update({ student_email_sent: true, teacher_email_sent: true })
              .eq('id', request.id);
            
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
    
    console.log(`📦 Box approval complete: ${approved} approved, ${failed} failed`);
    
    return { approved, failed };
  } catch (error) {
    console.error('Error approving box:', error);
    throw error;
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
): Promise<{ approved: number; failed: number; meetingLink: string; googleEventId?: string }> => {
  let meetingLink: string | undefined;
  let googleEventId: string | undefined;
  
  // Try to create Google Meet if service account is configured
  try {
    if (isCalendarConfigured()) {
      // Build ISO datetimes with proper timezone offset
      const tz = process.env.TIMEZONE || 'Asia/Kolkata';
      // India Standard Time is UTC+5:30
      const startDateTimeISO = `${date}T${startTime}+05:30`;
      const endDateTimeISO = `${date}T${endTime}+05:30`;
      
      console.log(`📅 Creating event: ${startDateTimeISO} to ${endDateTimeISO} (${tz})`);
      
      // Gather attendees (students + teacher) for this box
      // Include both 'paid' and 'free' status bookings that are pending approval
      // First get teacher_id from teacher_slot_availability (no FK join)
      const { data: slotInfo } = await supabase
        .from('teacher_slot_availability')
        .select('teacher_id')
        .eq('id', boxId)
        .single();

      // Get teacher email
      let teacherEmail = '';
      if (slotInfo?.teacher_id) {
        const teacherIdFromSlot = slotInfo.teacher_id;
        if (teacherIdFromSlot) {
          const { data: teacherProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('clerk_user_id', teacherIdFromSlot)
            .single();
          teacherEmail = teacherProfile?.email || '';
        }
      }
      
      const { data: studentsRes } = await supabase
        .from('meeting_bookings')
        .select('student_email, student_name')
        .eq('teacher_slot_id', boxId)
        .eq('approval_status', 'pending')
        .in('status', ['paid', 'free']);
      
      const attendeesEmails: string[] = (studentsRes || []).map((r: any) => r.student_email).filter((e: string) => !!e);
      const studentNames = (studentsRes || []).map((r: any) => r.student_name).filter((n: string) => !!n);
      
      // Add teacher email to attendees
      if (teacherEmail) {
        attendeesEmails.push(teacherEmail);
      }

      console.log(`👥 Attendees (${attendeesEmails.length}): ${attendeesEmails.join(', ')}`);

      const summary = `Islamic Academy - Class with ${teacherName || 'Teacher'}`;
      const description = `Online class session.\n\nStudents: ${studentNames.join(', ')}\n\nThis is an automated calendar invite. Join the meeting using the Google Meet link above.`;
      
      const created = await createMeetEvent({
        summary,
        description,
        startDateTimeISO,
        endDateTimeISO,
        timeZone: tz,
        attendeesEmails,
      });
      
      meetingLink = created.hangoutLink;
      googleEventId = created.eventId;
      console.log(`🎥 Created Google Meet event ${created.eventId} link: ${meetingLink}`);
    }
  } catch (e) {
    const errorMsg = (e as Error).message;
    console.error('❌ Google Calendar API failed:', errorMsg);
    console.error('💡 For automatic meetings, you need Google Workspace');
    console.error('📝 Admin should use manual approval instead');
    // Don't throw here - let the check below handle it
  }

  if (!meetingLink) {
    throw new Error(
      '❌ Cannot create Google Meet automatically.\n\n' +
      'REASON: Service account only works with Google Workspace.\n\n' +
      'SOLUTION: Use the "Approve with Link" button and paste a manual Meet link from https://meet.google.com/\\n\\n' +
      'After you buy Google Workspace, automatic meetings will work.'
    );
  }

  // Call approveBox with generated meeting link
  const result = await approveBox(boxId, adminId, meetingLink);
  
  // Update all bookings with Google event ID if available
  if (googleEventId) {
    try {
      await supabase
        .from('meeting_bookings')
        .update({
          google_event_id: googleEventId,
          calendar_invite_sent: true,
          calendar_invite_sent_at: new Date().toISOString()
        })
        .eq('teacher_slot_id', boxId)
        .eq('status', 'approved');
      console.log(`✅ Saved Google event ID ${googleEventId} to database`);
    } catch (error) {
      console.error('❌ Failed to save Google event ID:', error);
    }
  }
  
  return {
    ...result,
    meetingLink,
    googleEventId
  };
};

/**
 * Close a box (no more bookings allowed)
 * Happens automatically at deadline or when capacity full
 */
export const closeBox = async (boxId: string): Promise<void> => {
  try {
    const [teacherId, date, timeSlotId] = boxId.split('_');
    
    await supabase
      .from('teacher_slot_availability')
      .update({ is_available: false })
      .eq('teacher_id', teacherId)
      .eq('date', date)
      .eq('time_slot_id', timeSlotId);
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
    // For complex UPDATE with computed conditions, we need to use a different approach
    // First get the IDs of slots that should be closed
    const { data: slots, error: fetchError } = await supabase
      .from('teacher_slot_availability')
      .select('id, booking_deadline_date, booking_deadline_time')
      .eq('is_available', true)
      .not('booking_deadline_date', 'is', null)
      .not('booking_deadline_time', 'is', null);

    if (fetchError) throw fetchError;

    const now = new Date();
    const expiredSlotIds = (slots || []).filter((slot: any) => {
      if (slot.booking_deadline_date && slot.booking_deadline_time) {
        const deadline = new Date(`${slot.booking_deadline_date}T${slot.booking_deadline_time}`);
        return deadline < now;
      }
      return false;
    }).map((slot: any) => slot.id);

    if (expiredSlotIds.length === 0) {
      console.log(`🔒 No expired boxes to close`);
      return 0;
    }

    const { error: updateError } = await supabase
      .from('teacher_slot_availability')
      .update({ is_available: false })
      .in('id', expiredSlotIds);

    if (updateError) throw updateError;
    
    console.log(`🔒 Auto-closed ${expiredSlotIds.length} expired boxes`);
    return expiredSlotIds.length;
  } catch (error) {
    console.error('Error auto-closing boxes:', error);
    throw error;
  }
};
