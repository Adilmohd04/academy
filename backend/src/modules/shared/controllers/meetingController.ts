/**
 * Meeting Controller
 * 
 * Handles HTTP requests for meetings
 */

import { Request, Response } from 'express';
import * as meetingService from '../services/meetingService';
import * as emailService from '../services/emailService';
import { UserService } from '../services/userService';
import * as timeSlotService from '../services/timeSlotService';
import pool, { supabase } from '../../../config/database';

// ============================================
// MEETING REQUESTS
// ============================================

/**
 * Create new meeting request
 * POST /api/meetings
 */
export const createMeetingRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('📋 Creating meeting request for clerk_user_id:', userId);
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    // Get student's profile ID (UUID) from clerk_user_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id, full_name')
      .eq('clerk_user_id', userId)
      .single();

    console.log('📋 Profile lookup result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('❌ Profile not found for clerk_user_id:', userId);
      return res.status(404).json({ error: 'Profile not found. Please ensure your account is properly set up.' });
    }

    console.log('✅ Using clerk_user_id:', profile.clerk_user_id, 'for student:', profile.full_name);

    const meetingRequest = await meetingService.createMeetingRequest({
      ...req.body,
      student_id: profile.clerk_user_id, // Use clerk_user_id to match FK constraint on profiles.clerk_user_id
    });

    console.log('✅ Meeting request created:', meetingRequest.id);

    res.status(201).json(meetingRequest);
  } catch (error: any) {
    console.error('❌ Error creating meeting request:', error);
    res.status(500).json({ error: error.message || 'Failed to create meeting request' });
  }
};

/**
 * Create free meeting booking directly (no payment required)
 * POST /api/meetings/bookings/free
 */
export const createFreeBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { meeting_request_id } = req.body;
    if (!meeting_request_id) {
      return res.status(400).json({ error: 'meeting_request_id is required' });
    }

    console.log('🆓 Creating free booking for meeting request:', meeting_request_id);

    // Insert booking with payment_status='free' and no payment record
    const booking = await meetingService.insertMeetingBooking(meeting_request_id, 'free');
    
    console.log('✅ Free booking created:', booking.id);

    res.status(201).json({ 
      success: true,
      data: booking,
      message: 'Free meeting booked successfully'
    });
  } catch (error: any) {
    console.error('❌ Error creating free booking:', error);
    res.status(500).json({ error: error.message || 'Failed to create free booking' });
  }
};

/**
 * Get meeting requests
 * GET /api/meetings/requests
 */
export const getMeetingRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { status, date_from, date_to } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (date_from) filters.date_from = date_from as string;
    if (date_to) filters.date_to = date_to as string;

    // Students can only see their own requests
    // Admins can see all requests
    const userRole = req.body.userRole || 'student'; // This should come from Clerk metadata
    if (userRole === 'student' && userId) {
      filters.student_id = userId;
    }

    const requests = await meetingService.getMeetingRequests(filters);
    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching meeting requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meeting requests' });
  }
};

/**
 * Get single meeting request
 * GET /api/meetings/requests/:id
 */
export const getMeetingRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const request = await meetingService.getMeetingRequestById(id);

    if (!request) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    res.json(request);
  } catch (error: any) {
    console.error('Error fetching meeting request:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meeting request' });
  }
};

// ============================================
// SCHEDULED MEETINGS
// ============================================

/**
 * Get scheduled meetings
 * GET /api/meetings
 */
export const getScheduledMeetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { status, date_from, date_to, role } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (date_from) filters.date_from = date_from as string;
    if (date_to) filters.date_to = date_to as string;

    // Filter based on role
    const userRole = role || req.body.userRole || 'student';
    if (userRole === 'student' && userId) {
      filters.student_id = userId;
    } else if (userRole === 'teacher' && userId) {
      filters.teacher_id = userId;
    }

    const meetings = await meetingService.getScheduledMeetings(filters);
    res.json(meetings);
  } catch (error: any) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
  }
};

/**
 * Get single scheduled meeting
 * GET /api/meetings/:id
 */
export const getScheduledMeetingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[MeetingController] Fetching meeting ID: ${id}`);
    
    const meeting = await meetingService.getScheduledMeetingById(id);

    if (!meeting) {
      console.log(`[MeetingController] Meeting not found for ID: ${id}`);
      return res.status(404).json({ error: 'Meeting not found' });
    }

    console.log(`[MeetingController] Successfully fetched meeting: ${id}`);
    res.json({ data: meeting }); // Wrap in data object to match frontend expectation if needed, or just return meeting
  } catch (error: any) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meeting' });
  }
};

/**
 * Assign teacher to meeting (Admin only)
 * POST /api/meetings/:id/assign-teacher
 */
export const assignTeacherToMeeting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;
    const { teacher_id, meeting_link, meeting_platform, admin_notes } = req.body;

    if (!teacher_id) {
      return res.status(400).json({ error: 'Teacher ID is required' });
    }

    if (!meeting_link) {
      return res.status(400).json({ error: 'Meeting link is required' });
    }

    const meeting = await meetingService.assignTeacherToMeeting(id, {
      teacher_id,
      meeting_link,
      meeting_platform,
      admin_notes,
      assigned_by: userId,
    });

    // TODO: Send email notifications to both student and teacher
    try {
      // Get meeting request details
      const meetingRequest = await meetingService.getMeetingRequestById(meeting.meeting_request_id);
      
      if (!meetingRequest) {
        console.log('⚠️ Meeting request not found, skipping email notifications');
        return res.json(meeting);
      }

      // Get teacher details from profiles table
      const teacher = await UserService.getUserByClerkId(teacher_id);
      
      if (!teacher) {
        console.log('⚠️ Teacher not found, skipping email notifications');
        return res.json(meeting);
      }

      // Get time slot details
      const timeSlotDetails = await timeSlotService.getTimeSlotById(meeting.time_slot_id);

      // Format date and time
      const meetingDate = new Date(meeting.scheduled_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const timeSlotStart = timeSlotDetails?.start_time || 'N/A';
      const timeSlotEnd = timeSlotDetails?.end_time || 'N/A';
      const meetingTime = `${timeSlotStart} - ${timeSlotEnd}`;

      // Calculate ISO datetime for calendar invite
      const scheduledDate = new Date(meeting.scheduled_date);
      const [startHour, startMin] = (timeSlotStart || '00:00').split(':');
      const [endHour, endMin] = (timeSlotEnd || '01:00').split(':');
      
      const startDateTime = new Date(scheduledDate);
      startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0);
      
      const endDateTime = new Date(scheduledDate);
      endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0);

      // Send email notifications
      console.log('📧 Sending email notifications...');
      console.log(`  Student: ${meetingRequest.student_email}`);
      console.log(`  Teacher: ${teacher.email}`);
      console.log(`  Date: ${meetingDate}`);
      console.log(`  Time: ${meetingTime}`);
      
      // Send student notification
      await emailService.sendStudentMeetingNotification(
        meetingRequest.student_email,
        meetingRequest.student_name || 'Student',
        teacher.full_name || 'Teacher',
        meetingDate,
        meetingTime,
        meeting.meeting_link || 'Will be provided',
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      // Send teacher notification
      await emailService.sendTeacherMeetingNotification(
        teacher.email,
        teacher.full_name || 'Teacher',
        meetingRequest.student_name || 'Student',
        meetingDate,
        meetingTime,
        meeting.meeting_link || 'Will be provided',
        startDateTime.toISOString(),
        endDateTime.toISOString()
      );

      console.log('✅ Email notifications sent successfully!');
    } catch (emailError) {
      console.error('⚠️ Error sending email notifications:', emailError);
      // Don't fail the entire request if email fails
    }

    res.json(meeting);
  } catch (error: any) {
    console.error('Error assigning teacher:', error);
    res.status(500).json({ error: error.message || 'Failed to assign teacher' });
  }
};

/**
 * Update meeting status
 * PUT /api/meetings/:id/status
 */
export const updateMeetingStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const meeting = await meetingService.updateMeetingStatus(id, status, userId);
    res.json(meeting);
  } catch (error: any) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({ error: error.message || 'Failed to update meeting status' });
  }
};

/**
 * Reschedule meeting
 * PUT /api/meetings/:id/reschedule
 */
export const rescheduleMeeting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { new_date, new_time_slot_id, reason } = req.body;

    if (!new_date || !new_time_slot_id || !reason) {
      return res.status(400).json({ error: 'New date, time slot, and reason are required' });
    }

    const meeting = await meetingService.rescheduleMeeting(
      id,
      new_date,
      new_time_slot_id,
      reason,
      userId
    );

    res.json(meeting);
  } catch (error: any) {
    console.error('Error rescheduling meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to reschedule meeting' });
  }
};

/**
 * Cancel meeting
 * DELETE /api/meetings/:id
 */
export const cancelMeeting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    const meeting = await meetingService.cancelMeeting(id, reason, userId);
    res.json(meeting);
  } catch (error: any) {
    console.error('Error cancelling meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel meeting' });
  }
};

// ============================================
// MEETING LOGS
// ============================================

/**
 * Get meeting logs
 * GET /api/meetings/:id/logs
 */
export const getMeetingLogs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await meetingService.getMeetingLogs(id);
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching meeting logs:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meeting logs' });
  }
};

// ============================================
// DASHBOARD VIEWS
// ============================================

/**
 * Get student's upcoming meetings
 * GET /api/meetings/student/upcoming
 */
export const getStudentUpcomingMeetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetings = await meetingService.getStudentUpcomingMeetings(userId);
    res.json({ data: meetings }); // Wrap in data object for frontend
  } catch (error: any) {
    console.error('Error fetching student meetings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
  }
};

/**
 * Get teacher's upcoming meetings
 * GET /api/meetings/teacher/upcoming
 */
export const getTeacherUpcomingMeetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const meetings = await meetingService.getTeacherUpcomingMeetings(userId);
    res.json(meetings);
  } catch (error: any) {
    console.error('Error fetching teacher meetings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
  }
};

/**
 * Get pending meetings for admin
 * GET /api/meetings/admin/pending
 */
export const getPendingMeetingsForAdmin = async (req: Request, res: Response) => {
  try {
    const meetings = await meetingService.getPendingMeetingsForAdmin();
    res.json(meetings);
  } catch (error: any) {
    console.error('Error fetching pending meetings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch pending meetings' });
  }
};

/**
 * Approve meeting booking (Admin only)
 * POST /api/meetings/admin/:id/approve
 */
export const approveMeetingBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { meetingLink } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update meeting booking status to approved
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({ 
        approval_status: 'approved',
        status: 'approved',
        meeting_link: meetingLink || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error approving meeting:', error);
      return res.status(500).json({ error: 'Failed to approve meeting' });
    }

    // Also update the scheduled_meetings if exists
    await supabase
      .from('scheduled_meetings')
      .update({ 
        status: 'scheduled',
        meeting_link: meetingLink || null
      })
      .eq('booking_id', id);

    // Send email notifications to student and teacher
    try {
      // Get student and teacher profiles
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('clerk_user_id', data.student_id)
        .single();

      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('clerk_user_id', data.teacher_id)
        .single();

      // Get time slot details
      const { data: timeSlot } = await supabase
        .from('time_slots')
        .select('start_time, end_time')
        .eq('id', data.time_slot_id)
        .single();

      if (studentProfile && teacherProfile && timeSlot) {
        // Format date and time
        const meetingDate = new Date(data.meeting_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const meetingTime = `${timeSlot.start_time} - ${timeSlot.end_time}`;

        // Calculate ISO datetime for calendar invite
        const scheduledDate = new Date(data.meeting_date);
        const [startHour, startMin] = (timeSlot.start_time || '00:00').split(':');
        const [endHour, endMin] = (timeSlot.end_time || '01:00').split(':');
        
        const startDateTime = new Date(scheduledDate);
        startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0);
        
        const endDateTime = new Date(scheduledDate);
        endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0);

        console.log('📧 Sending approval email notifications...');
        
        // Send student notification
        await emailService.sendStudentMeetingNotification(
          studentProfile.email,
          studentProfile.full_name || data.student_name,
          teacherProfile.full_name || 'Teacher',
          meetingDate,
          meetingTime,
          meetingLink || data.meeting_link || 'Meeting link will be provided',
          startDateTime.toISOString(),
          endDateTime.toISOString()
        );

        // Send teacher notification
        await emailService.sendTeacherMeetingNotification(
          teacherProfile.email,
          teacherProfile.full_name || 'Teacher',
          studentProfile.full_name || data.student_name,
          meetingDate,
          meetingTime,
          meetingLink || data.meeting_link || 'Meeting link will be provided',
          startDateTime.toISOString(),
          endDateTime.toISOString()
        );

        console.log('✅ Approval email notifications sent successfully!');
      } else {
        console.log('⚠️ Missing profile or time slot data, skipping email notifications');
      }
    } catch (emailError) {
      console.error('⚠️ Error sending approval email notifications:', emailError);
      // Don't fail the approval if email fails
    }

    res.json({ 
      success: true, 
      message: 'Meeting approved successfully',
      booking: data
    });
  } catch (error: any) {
    console.error('Error approving meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to approve meeting' });
  }
};

/**
 * Reject meeting booking (Admin only)
 * POST /api/meetings/admin/:id/reject
 */
export const rejectMeetingBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Update meeting booking status to rejected
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({ 
        approval_status: 'rejected',
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting meeting:', error);
      return res.status(500).json({ error: 'Failed to reject meeting' });
    }

    // Update the scheduled_meetings if exists
    await supabase
      .from('scheduled_meetings')
      .update({ status: 'cancelled' })
      .eq('booking_id', id);

    // Decrement the slot booking count since it's rejected
    if (data?.teacher_slot_id) {
      await supabase
        .from('teacher_slot_availability')
        .update({ 
          current_bookings: supabase.rpc('decrement_slot_bookings', { slot_id: data.teacher_slot_id })
        })
        .eq('id', data.teacher_slot_id);
    }

    res.json({ 
      success: true, 
      message: 'Meeting rejected',
      booking: data
    });
  } catch (error: any) {
    console.error('Error rejecting meeting:', error);
    res.status(500).json({ error: error.message || 'Failed to reject meeting' });
  }
};

/**
 * Get all meetings (Admin only)
 * GET /api/meetings/all
 */
export const getAllMeetings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Use Supabase client instead of pg-pool to avoid connection issues
    const { data, error } = await supabase
      .from('meeting_bookings')
      .select(`
        id,
        student_name,
        student_email,
        student_phone,
        teacher_id,
        meeting_date,
        status,
        approval_status,
        payment_status,
        payment_amount,
        meeting_link,
        created_at,
        time_slot_id,
        time_slots!time_slot_id(
          slot_name,
          start_time,
          end_time
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get teacher names from profiles
    const teacherIds = [...new Set(data?.map(m => m.teacher_id).filter(Boolean))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', teacherIds);

    const teacherMap = new Map(profiles?.map(p => [p.clerk_user_id, p]) || []);

    // Get scheduled meetings to check assignment status
    const bookingIds = data?.map(m => m.id) || [];
    const { data: scheduledMeetings } = await supabase
      .from('scheduled_meetings')
      .select('id, status, teacher_id')
      .in('id', bookingIds);

    const scheduledMap = new Map(scheduledMeetings?.map(sm => [sm.id, sm]) || []);

    // Transform to camelCase for frontend compatibility
    const transformedData = (data || []).map(row => {
      const teacher = teacherMap.get(row.teacher_id);
      const timeSlot = Array.isArray(row.time_slots) ? row.time_slots[0] : row.time_slots;
      const scheduled = scheduledMap.get(row.id);
      const assignedTeacher = scheduled?.teacher_id ? teacherMap.get(scheduled.teacher_id) : null;
      
      return {
        id: row.id,
        studentName: row.student_name,
        studentEmail: row.student_email,
        studentPhone: row.student_phone,
        teacherName: teacher?.full_name || 'Unassigned',
        teacherEmail: teacher?.email || '',
        preferredDate: row.meeting_date,
        timeSlot: timeSlot?.slot_name || `${timeSlot?.start_time || ''} - ${timeSlot?.end_time || ''}`.trim() || 'Not specified',
        status: row.status,
        approvalStatus: row.approval_status,
        paymentStatus: row.payment_status,
        amount: row.payment_amount || 0,
        isFree: row.payment_amount === 0 || row.payment_amount === null,
        meetingLink: row.meeting_link || '',
        assignedTeacher: assignedTeacher?.full_name || null,
        assignmentStatus: scheduled ? scheduled.status : null,
        createdAt: row.created_at
      };
    });

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error: any) {
    console.error('Error fetching all meetings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
  }
};

/**
 * Update meeting attendance
 * PUT /api/meetings/:id/attendance
 */
export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { attendance } = req.body;

    // Validate attendance value
    const validAttendance = ['pending', 'present', 'absent', 'cancelled'];
    if (!validAttendance.includes(attendance)) {
      return res.status(400).json({ error: 'Invalid attendance value' });
    }

    // Check if user is teacher for this meeting
    const { data: meeting, error: checkError } = await supabase
      .from('meeting_bookings')
      .select('id, teacher_id')
      .eq('id', id)
      .single();

    if (checkError || !meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    // Only teacher assigned to this meeting can mark attendance
    if (meeting.teacher_id !== userId) {
      return res.status(403).json({ error: 'Only the assigned teacher can mark attendance' });
    }

    // Update attendance
    const { data: updated, error: updateError } = await supabase
      .from('meeting_bookings')
      .update({ attendance, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: `Attendance marked as ${attendance}`,
      data: updated
    });
  } catch (error: any) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to update attendance' });
  }
};

/**
 * Get meetings assigned to a teacher
 * GET /api/teacher/meetings
 */
export const getTeacherAssignedMeetings = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).auth?.userId;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('meeting_bookings')
      .select(`
        *,
        time_slots:time_slot_id (
          slot_name,
          start_time,
          end_time
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('approval_status', 'approved')
      .order('meeting_date', { ascending: true });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error: any) {
    console.error('Error fetching teacher meetings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch meetings' });
  }
};

/**
 * Update notes link for a meeting
 * PUT /api/meetings/:id/notes
 */
export const updateNotesLink = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).auth?.userId;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { notes_link } = req.body;

    if (!notes_link) {
      return res.status(400).json({ error: 'notes_link is required' });
    }

    // Verify the meeting belongs to this teacher
    const { data: meeting, error: fetchError } = await supabase
      .from('meeting_bookings')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to update this meeting' });
    }

    // Update notes_link in meeting_bookings - specific to enrolled students only
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({ notes_link, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Study materials link saved for enrolled students in this meeting',
      data,
    });
  } catch (error: any) {
    console.error('Error updating notes link:', error);
    res.status(500).json({ error: error.message || 'Failed to update notes link' });
  }
};

/**
 * Update resources for a meeting
 * PUT /api/meetings/:id/resources
 */
export const updateResources = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).auth?.userId;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { resources } = req.body;

    if (!Array.isArray(resources)) {
      return res.status(400).json({ error: 'resources must be an array' });
    }

    // Verify the meeting belongs to this teacher
    const { data: meeting, error: fetchError } = await supabase
      .from('meeting_bookings')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to update this meeting' });
    }

    // Update resources in meeting_bookings
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({ resources, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Resources updated successfully',
      data,
    });
  } catch (error: any) {
    console.error('Error updating resources:', error);
    res.status(500).json({ error: error.message || 'Failed to update resources' });
  }
};

/**
 * Update resource link for a meeting
 * PUT /api/meetings/:id/resource
 */
export const updateResourceLink = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).auth?.userId;
    if (!teacherId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { resource_link } = req.body;

    if (!resource_link) {
      return res.status(400).json({ error: 'resource_link is required' });
    }

    // Verify the meeting belongs to this teacher
    const { data: meeting, error: fetchError } = await supabase
      .from('meeting_bookings')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (fetchError || !meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.teacher_id !== teacherId) {
      return res.status(403).json({ error: 'Unauthorized to update this meeting' });
    }

    // Update resource_link in meeting_bookings
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({ resource_link, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Resource link saved for enrolled students in this meeting',
      data,
    });
  } catch (error: any) {
    console.error('Error updating resource link:', error);
    res.status(500).json({ error: error.message || 'Failed to update resource link' });
  }
};

