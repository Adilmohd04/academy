/**
 * Insert a paid meeting request into meeting_bookings for admin approval
 */
export const insertMeetingBooking = async (meetingRequestId: string, paymentRecordId: string) => {
  console.log('📝 Creating booking for meeting request:', meetingRequestId);
  
  // Get meeting request details
  const request = await getMeetingRequestById(meetingRequestId);
  if (!request) {
    console.error('❌ Meeting request not found:', meetingRequestId);
    throw new Error('Meeting request not found');
  }

  console.log('✅ Meeting request found:', {
    id: request.id,
    student: request.student_email,
    date: request.preferred_date,
    teacher_slot_id: request.teacher_slot_id
  });

  // Ensure teacher_id is present (from request or slot)
  let teacherId = request.teacher_id;
  let slotData: any = null; // Declare outside for use later
  
  if (!teacherId && request.teacher_slot_id) {
    // Fetch the slot to get the teacher_id (correct table: teacher_slot_availability)
    const { data: slot, error: slotError } = await supabase
      .from('teacher_slot_availability')
      .select('teacher_id')
      .eq('id', request.teacher_slot_id)
      .single();
    if (slotError || !slot) {
      console.error('[Booking Error] teacher_slot_id missing or invalid:', request.teacher_slot_id, 'slotError:', slotError, 'slot:', slot);
      throw new Error(`Could not determine teacher_id for booking. teacher_slot_id: ${request.teacher_slot_id}, slotError: ${slotError?.message || 'none'}, slot: ${JSON.stringify(slot)}`);
    }
    teacherId = slot.teacher_id;
  }
  if (!teacherId) {
    console.error('[Booking Error] teacher_id is still missing after lookup. meetingRequestId:', meetingRequestId, 'request:', request);
    throw new Error(`Could not determine teacher_id for booking. meetingRequestId: ${meetingRequestId}, request: ${JSON.stringify(request)}`);
  }

  console.log('✅ Teacher ID resolved:', teacherId);

  // Idempotency: if a booking already exists for this student/date/slot, reuse it
  try {
    const { data: existingBookings, error: existingBookingError } = await supabase
      .from('meeting_bookings')
      .select('*')
      .eq('student_id', request.student_id)
      .eq('meeting_date', request.preferred_date)
      .eq('time_slot_id', request.time_slot_id)
      .eq('teacher_slot_id', request.teacher_slot_id)
      .in('status', ['paid', 'approved'])
      .limit(1);

    if (!existingBookingError && existingBookings && existingBookings.length > 0) {
      console.log('🟡 Existing booking found for this request, returning it:', existingBookings[0]?.id);
      return existingBookings[0];
    }
  } catch (checkErr) {
    console.warn('⚠️ Existing booking check failed, proceeding to create booking:', (checkErr as any)?.message);
  }

  // Check slot capacity before booking
  if (request.teacher_slot_id) {
    const { data: fetchedSlotData, error: slotError } = await supabase
      .from('teacher_slot_availability')
      .select('current_bookings, max_capacity, is_unlimited')
      .eq('id', request.teacher_slot_id)
      .single();
    if (slotError || !fetchedSlotData) {
      console.error('[Booking Error] Could not fetch slot for capacity check:', slotError, fetchedSlotData);
      throw new Error('Could not verify slot capacity. Please try again.');
    }
    slotData = fetchedSlotData; // Store for use later
    
    console.log('📊 Slot capacity check:', {
      current: slotData.current_bookings,
      max: slotData.max_capacity,
      unlimited: slotData.is_unlimited
    });
    
    if (!slotData.is_unlimited && slotData.current_bookings >= slotData.max_capacity) {
      console.error('❌ Slot is full:', slotData);
      throw new Error('This slot is already full. Please select another slot.');
    }
  }

  // Insert into meeting_bookings
  // NOTE: There's a database trigger that automatically increments current_bookings
  // when a booking is inserted, so we don't need to do it manually
  
  // Determine payment status based on paymentRecordId
  const isFreeBooking = paymentRecordId === 'free';
  const paymentStatus = isFreeBooking ? 'free' : 'paid';
  
  const { data, error } = await supabase
    .from('meeting_bookings')
    .insert([
      {
        student_id: request.student_id,
        student_email: request.student_email,
        student_name: request.student_name,
        student_phone: request.student_phone,
        teacher_slot_id: request.teacher_slot_id,
        teacher_id: teacherId,
        course_id: request.course_id,
        meeting_date: request.preferred_date,
        time_slot_id: request.time_slot_id,
        notes: request.notes,
        payment_status: paymentStatus,
        payment_amount: isFreeBooking ? 0 : request.amount,
        approval_status: 'pending',
        status: 'paid', // CRITICAL: Admin portal filters by status='paid', NOT 'reserved'
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();
  if (error) {
    console.error('❌ Error inserting meeting booking:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    // If constraint violation, it means slot is full
    if (error.code === '23514') {
      throw new Error('This slot is already full. Please select another slot.');
    }
    throw new Error(error.message);
  }

  console.log('✅ Booking created successfully:', {
    id: data.id,
    student: data.student_email,
    date: data.meeting_date,
    approval_status: data.approval_status
  });

  return data;
};
/**
 * Meeting Service
 * 
 * Database operations for meetings, meeting requests, and scheduled meetings
 */

import { supabase } from '../config/database';

// ============================================
// INTERFACES
// ============================================

export interface MeetingRequest {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  course_id?: string;
  preferred_date: string;
  time_slot_id: string;
  teacher_slot_id?: string; // For capacity tracking
  teacher_id?: string; // Added for booking insertion
  notes?: string;
  status: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledMeeting {
  id: string;
  meeting_request_id: string;
  payment_record_id: string;
  student_id: string;
  teacher_id?: string;
  course_id?: string;
  time_slot_id: string;
  meeting_title: string;
  meeting_description?: string;
  scheduled_date: string;
  timezone: string;
  meeting_platform: string;
  meeting_link?: string;
  meeting_id?: string;
  meeting_password?: string;
  status: string;
  student_notified: boolean;
  teacher_notified: boolean;
  reminder_sent: boolean;
  admin_notes?: string;
  assigned_by?: string;
  assigned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingRequestInput {
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  course_id?: string;
  preferred_date: string;
  time_slot_id: string;
  teacher_slot_id?: string; // Added for capacity tracking
  notes?: string;
  amount: number;
}

export interface AssignTeacherInput {
  teacher_id: string;
  meeting_link?: string;
  meeting_platform?: string;
  admin_notes?: string;
  assigned_by: string;
}

export interface MeetingFilters {
  student_id?: string;
  teacher_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================
// MEETING REQUESTS
// ============================================

/**
 * Create a new meeting request (before payment)
 */
export const createMeetingRequest = async (data: CreateMeetingRequestInput): Promise<MeetingRequest> => {


  // Prevent double booking: check BOTH meeting_requests AND meeting_bookings
  console.log('🔍 Double-booking check:', {
    student_id: data.student_id,
    preferred_date: data.preferred_date,
    time_slot_id: data.time_slot_id,
    teacher_slot_id: data.teacher_slot_id
  });
  
  let existingRequests, checkError;
  try {
    // Check meeting_requests table
    ({ data: existingRequests, error: checkError } = await supabase
      .from('meeting_requests')
      .select('*')
      .eq('student_id', data.student_id)
      .eq('preferred_date', data.preferred_date)
      .eq('time_slot_id', data.time_slot_id)
      .not('status', 'in', ['failed', 'cancelled'])
    );
    if (checkError && checkError.code === 'PGRST100') {
      // Fallback for older PostgREST: use filter string
      ({ data: existingRequests, error: checkError } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('student_id', data.student_id)
        .eq('preferred_date', data.preferred_date)
        .eq('time_slot_id', data.time_slot_id)
        .filter('status', 'not.in', '(failed,cancelled)')
      );
    }
  } catch (err) {
    console.error('Error checking for double booking in requests:', err);
    throw new Error('Could not verify slot availability. Please try again.');
  }
  if (checkError) {
    console.error('Error checking for double booking in requests:', checkError);
    throw new Error('Could not verify slot availability. Please try again.');
  }
  
  console.log(`📋 Found ${existingRequests?.length || 0} existing requests`);
  
  // Handle existing pending_payment requests
  // Strategy: If the SAME student tries to book the SAME slot again, 
  // cancel their old pending_payment request and let them proceed
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (existingRequests && existingRequests.length > 0) {
    const pendingPaymentRequests = existingRequests.filter((req: any) => req.status === 'pending_payment');
    
    if (pendingPaymentRequests.length > 0) {
      console.log(`🔄 Found ${pendingPaymentRequests.length} pending_payment requests for this slot`);
      
      // Cancel ALL pending_payment requests (expired OR fresh) for THIS student/slot combo
      // This allows the student to retry booking the same slot without being blocked
      for (const pendingReq of pendingPaymentRequests) {
        await supabase
          .from('meeting_requests')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', pendingReq.id);
        console.log(`🧹 Auto-cancelled pending_payment request: ${pendingReq.id} (allowing retry)`);
      }
      
      // Remove cancelled pending_payment requests from the list
      existingRequests = existingRequests.filter((req: any) => req.status !== 'pending_payment');
    }
  }
  
  // Check meeting_bookings table (paid bookings waiting for approval)
  const { data: existingBookings, error: bookingCheckError } = await supabase
    .from('meeting_bookings')
    .select('*')
    .eq('student_id', data.student_id)
    .eq('meeting_date', data.preferred_date)
    .eq('time_slot_id', data.time_slot_id)
    .neq('teacher_slot_id', data.teacher_slot_id) // Allow same slot rebooking
    .in('status', ['paid', 'approved']); // Only block if booking is paid or approved
    
  if (bookingCheckError) {
    console.error('Error checking for double booking in bookings:', bookingCheckError);
    throw new Error('Could not verify slot availability. Please try again.');
  }
  
  console.log(`📋 Found ${existingBookings?.length || 0} existing bookings`);
  
  // Only block if there are PAID bookings or NON-pending_payment requests
  // (pending_payment requests were already cancelled above)
  const hasActiveRequest = existingRequests && existingRequests.length > 0 && existingRequests.some((req: any) => {
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    return !terminalStatuses.includes(req.status);
  });
  
  const hasPaidBooking = existingBookings && existingBookings.length > 0;
  
  if (hasActiveRequest || hasPaidBooking) {
    console.log('❌ Double booking detected:', { hasActiveRequest, hasPaidBooking });
    throw new Error('You already have a booking for this time slot. Please choose a different time.');
  }
  
  console.log('✅ No double booking found - proceeding with new request');
  
  console.log('✅ No double booking found - proceeding with new request');

  // Prevent booking two slots for the same teacher at the same time (if teacher_slot_id is provided)
  if (data.teacher_slot_id) {
    console.log('🔍 Checking for existing bookings with teacher_slot_id:', data.teacher_slot_id);
    
    // Check meeting_requests
    let teacherRequests, teacherCheckError;
    try {
      ({ data: teacherRequests, error: teacherCheckError } = await supabase
        .from('meeting_requests')
        .select('*')
        .eq('student_id', data.student_id)
        .eq('teacher_slot_id', data.teacher_slot_id)
        .not('status', 'in', ['failed', 'cancelled'])
      );
      if (teacherCheckError && teacherCheckError.code === 'PGRST100') {
        ({ data: teacherRequests, error: teacherCheckError } = await supabase
          .from('meeting_requests')
          .select('*')
          .eq('student_id', data.student_id)
          .eq('teacher_slot_id', data.teacher_slot_id)
          .filter('status', 'not.in', '(failed,cancelled)')
        );
      }
    } catch (err) {
      console.error('Error checking for teacher double booking in requests:', err);
      throw new Error('Could not verify teacher slot availability. Please try again.');
    }
    if (teacherCheckError) {
      console.error('Error checking for teacher double booking in requests:', teacherCheckError);
      throw new Error('Could not verify teacher slot availability. Please try again.');
    }
    
    console.log(`📋 Found ${teacherRequests?.length || 0} existing requests for this teacher_slot_id`);
    
    // Also check meeting_bookings for this teacher_slot_id
    const { data: teacherBookings, error: teacherBookingError } = await supabase
      .from('meeting_bookings')
      .select('*')
      .eq('student_id', data.student_id)
      .eq('teacher_slot_id', data.teacher_slot_id)
      .in('status', ['paid', 'approved']);
      
    if (teacherBookingError) {
      console.error('Error checking for teacher double booking in bookings:', teacherBookingError);
      throw new Error('Could not verify teacher slot availability. Please try again.');
    }
    
    console.log(`📋 Found ${teacherBookings?.length || 0} existing bookings for this teacher_slot_id`);
    
    // Ignore pending_payment requests older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const hasActiveTeacherRequest = teacherRequests && teacherRequests.length > 0 && teacherRequests.some((req: any) => {
      const terminalStatuses = ['completed', 'failed', 'cancelled'];
      if (terminalStatuses.includes(req.status)) {
        return false;
      }
      
      // Ignore expired pending_payment requests
      if (req.status === 'pending_payment') {
        const requestTime = new Date(req.updated_at || req.created_at);
        if (requestTime < thirtyMinutesAgo) {
          console.log('⏰ Ignoring expired teacher pending_payment request:', req.id);
          return false;
        }
      }
      
      return true;
    });
    
    const hasTeacherBooking = teacherBookings && teacherBookings.length > 0;
    
    if (hasActiveTeacherRequest || hasTeacherBooking) {
      console.log('❌ Teacher slot already booked:', { hasActiveTeacherRequest, hasTeacherBooking });
      if (hasTeacherBooking) {
        console.log('Existing bookings:', teacherBookings);
      }
      throw new Error('You already have a booking with this teacher for this time slot.');
    }
    
    console.log('✅ Teacher slot available');
  }

  const { data: request, error } = await supabase
    .from('meeting_requests')
    .insert([
      {
        ...data,
        status: 'pending_payment',
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating meeting request:', error);
    throw new Error(error.message);
  }

  // Check slot capacity manually
  if (data.teacher_slot_id) {
    try {
      // Get current slot details
      const { data: slotData, error: slotError } = await supabase
        .from('teacher_slot_availability')
        .select('max_capacity, current_bookings, is_unlimited')
        .eq('id', data.teacher_slot_id)
        .single();

      if (slotError) {
        console.error('❌ Error checking slot capacity:', slotError);
        throw new Error('Unable to verify slot availability');
      }

      if (!slotData.is_unlimited && slotData.current_bookings >= slotData.max_capacity) {
        console.log(`❌ Slot is full: ${slotData.current_bookings}/${slotData.max_capacity}`);
        await supabase.from('meeting_requests').delete().eq('id', request.id);
        throw new Error('This slot is no longer available. Please select another slot.');
      }

      console.log(`✅ Slot available: ${slotData.current_bookings}/${slotData.max_capacity}`);
    } catch (err: any) {
      // If it's the "slot full" error, propagate it
      if (err.message && err.message.includes('slot is no longer available')) {
        throw err;
      }
      console.warn('⚠️ Slot capacity check failed:', err.message);
      throw err;
    }
  }

  console.warn('⚠️⚠️⚠️ SLOT RESERVATION DISABLED! Run FIX_CONCURRENT_BOOKING_COMPLETE.sql in Supabase! ⚠️⚠️⚠️');

  return request;
};

/**
 * Get meeting request by ID
 */
export const getMeetingRequestById = async (id: string): Promise<MeetingRequest | null> => {
  const { data, error } = await supabase
    .from('meeting_requests')
    .select(`
      *,
      time_slot:time_slots(
        id,
        slot_name,
        start_time,
        end_time,
        duration_minutes
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching meeting request:', error);
    return null;
  }

  return data;
};

/**
 * Update meeting request status
 */
export const updateMeetingRequestStatus = async (id: string, status: string): Promise<MeetingRequest> => {
  // If status is being set to failed/cancelled, release the slot reservation
  if (status === 'failed' || status === 'cancelled') {
    const request = await getMeetingRequestById(id);
    if (request && request.teacher_slot_id) {
      await supabase.rpc('release_slot_reservation', {
        p_slot_id: request.teacher_slot_id
      });
      console.log(`🔓 Released slot reservation for ${request.teacher_slot_id}`);
    }
  }

  const { data, error } = await supabase
    .from('meeting_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting request:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Get all meeting requests with filters
 */
export const getMeetingRequests = async (filters: MeetingFilters): Promise<MeetingRequest[]> => {
  let query = supabase.from('meeting_requests').select('*');

  if (filters.student_id) {
    query = query.eq('student_id', filters.student_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.date_from) {
    query = query.gte('preferred_date', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('preferred_date', filters.date_to);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching meeting requests:', error);
    throw new Error(error.message);
  }

  return data || [];
};

// ============================================
// SCHEDULED MEETINGS
// ============================================

/**
 * Create scheduled meeting after payment
 */
export const createScheduledMeeting = async (
  meetingRequestId: string,
  paymentRecordId: string
): Promise<ScheduledMeeting> => {
  // First get the meeting request details
  const request = await getMeetingRequestById(meetingRequestId);
  if (!request) {
    throw new Error('Meeting request not found');
  }

  const { data: meeting, error } = await supabase
    .from('scheduled_meetings')
    .insert([
      {
        meeting_request_id: meetingRequestId,
        payment_record_id: paymentRecordId,
        student_id: request.student_id,
        course_id: request.course_id,
        time_slot_id: request.time_slot_id,
        scheduled_date: request.preferred_date,
        meeting_title: `Meeting - ${request.student_name}`,
        meeting_description: request.notes,
        status: 'pending_assignment',
        student_notified: false,
        teacher_notified: false,
        reminder_sent: false,
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled meeting:', error);
    throw new Error(error.message);
  }

  return meeting;
};

/**
 * Get scheduled meeting by ID
 */
export const getScheduledMeetingById = async (id: string): Promise<ScheduledMeeting | null> => {
  const { data, error } = await supabase
    .from('scheduled_meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching scheduled meeting:', error);
    return null;
  }

  return data;
};

/**
 * Get all scheduled meetings with filters
 */
export const getScheduledMeetings = async (filters: MeetingFilters): Promise<ScheduledMeeting[]> => {
  let query = supabase.from('scheduled_meetings').select('*');

  if (filters.student_id) {
    query = query.eq('student_id', filters.student_id);
  }
  if (filters.teacher_id) {
    query = query.eq('teacher_id', filters.teacher_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.date_from) {
    query = query.gte('scheduled_date', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('scheduled_date', filters.date_to);
  }

  query = query.order('scheduled_date', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching scheduled meetings:', error);
    throw new Error(error.message);
  }

  return data || [];
};

/**
 * Assign teacher to meeting (Admin action)
 */
export const assignTeacherToMeeting = async (
  meetingId: string,
  assignData: AssignTeacherInput
): Promise<ScheduledMeeting> => {
  const { data, error } = await supabase
    .from('scheduled_meetings')
    .update({
      teacher_id: assignData.teacher_id,
      meeting_link: assignData.meeting_link,
      meeting_platform: assignData.meeting_platform || 'google_meet',
      admin_notes: assignData.admin_notes,
      assigned_by: assignData.assigned_by,
      assigned_at: new Date().toISOString(),
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) {
    console.error('Error assigning teacher:', error);
    throw new Error(error.message);
  }

  // Log the assignment
  await logMeetingAction(meetingId, 'teacher_assigned', assignData.assigned_by, {
    teacher_id: assignData.teacher_id,
    meeting_link: assignData.meeting_link,
  });

  return data;
};

/**
 * Update meeting status
 */
export const updateMeetingStatus = async (
  meetingId: string,
  status: string,
  updatedBy?: string
): Promise<ScheduledMeeting> => {
  const { data, error } = await supabase
    .from('scheduled_meetings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) {
    console.error('Error updating meeting status:', error);
    throw new Error(error.message);
  }

  // Log the status change
  if (updatedBy) {
    await logMeetingAction(meetingId, 'status_updated', updatedBy, { new_status: status });
  }

  return data;
};

/**
 * Reschedule meeting
 */
export const rescheduleMeeting = async (
  meetingId: string,
  newDate: string,
  newTimeSlotId: string,
  reason: string,
  rescheduledBy: string
): Promise<ScheduledMeeting> => {
  // First get the current meeting
  const currentMeeting = await getScheduledMeetingById(meetingId);
  if (!currentMeeting) {
    throw new Error('Meeting not found');
  }

  const { data, error } = await supabase
    .from('scheduled_meetings')
    .update({
      original_date: currentMeeting.scheduled_date,
      original_time_slot_id: currentMeeting.time_slot_id,
      scheduled_date: newDate,
      time_slot_id: newTimeSlotId,
      reschedule_reason: reason,
      rescheduled_by: rescheduledBy,
      rescheduled_at: new Date().toISOString(),
      status: 'rescheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) {
    console.error('Error rescheduling meeting:', error);
    throw new Error(error.message);
  }

  // Log the reschedule
  await logMeetingAction(meetingId, 'rescheduled', rescheduledBy, {
    old_date: currentMeeting.scheduled_date,
    new_date: newDate,
    reason,
  });

  return data;
};

/**
 * Cancel meeting
 */
export const cancelMeeting = async (
  meetingId: string,
  reason: string,
  cancelledBy: string
): Promise<ScheduledMeeting> => {
  const { data, error } = await supabase
    .from('scheduled_meetings')
    .update({
      status: 'cancelled',
      admin_notes: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) {
    console.error('Error cancelling meeting:', error);
    throw new Error(error.message);
  }

  // Log the cancellation
  await logMeetingAction(meetingId, 'cancelled', cancelledBy, { reason });

  return data;
};

// ============================================
// MEETING LOGS
// ============================================

/**
 * Log meeting action
 */
export const logMeetingAction = async (
  meetingId: string,
  action: string,
  performedBy: string,
  data?: any
): Promise<void> => {
  const { error } = await supabase.from('meeting_logs').insert([
    {
      meeting_id: meetingId,
      action,
      performed_by: performedBy,
      new_values: data,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error('Error logging meeting action:', error);
  }
};

/**
 * Get meeting logs
 */
export const getMeetingLogs = async (meetingId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('meeting_logs')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching meeting logs:', error);
    return [];
  }

  return data || [];
};

// ============================================
// VIEWS
// ============================================

/**
 * Get student's upcoming meetings (using view)
 */
export const getStudentUpcomingMeetings = async (studentId: string): Promise<any[]> => {
  try {
    // First, get the meeting bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('meeting_bookings')
      .select(`
        id,
        meeting_date,
        time_slot_id,
        teacher_slot_id,
        teacher_id,
        notes,
        notes_link,
        resource_link,
        payment_amount,
        payment_status,
        approval_status,
        status,
        meeting_link,
        created_at
      `)
      .eq('student_id', studentId)
      .in('status', ['paid', 'approved'])
      .gte('meeting_date', new Date().toISOString().split('T')[0])
      .order('meeting_date', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching student meetings:', bookingsError);
      return [];
    }

    if (!bookings || bookings.length === 0) {
      console.log('No upcoming meetings found for student:', studentId);
      return [];
    }

    // Get all unique IDs for batch fetching
    const timeSlotIds = [...new Set(bookings.map(b => b.time_slot_id))];
    const teacherSlotIds = [...new Set(bookings.map(b => b.teacher_slot_id))];
    const teacherIds = [...new Set(bookings.map(b => b.teacher_id))];

    // Batch fetch time slots
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('id, slot_name, start_time, end_time')
      .in('id', timeSlotIds);

    // Batch fetch teacher slot details
    const { data: slotDetails } = await supabase
      .from('teacher_slot_availability')
      .select('id, topic, description')
      .in('id', teacherSlotIds);

    // Batch fetch teacher profiles using clerk_user_id
    const { data: teacherProfiles } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', teacherIds);

    // Create lookup maps for O(1) access
    const timeSlotsMap = new Map(timeSlots?.map(ts => [ts.id, ts]) || []);
    const slotDetailsMap = new Map(slotDetails?.map(sd => [sd.id, sd]) || []);
    const teacherProfilesMap = new Map(teacherProfiles?.map(tp => [tp.clerk_user_id, tp]) || []);

    // Transform the data using the maps
    const transformedData = bookings.map((booking: any) => {
      const timeSlot = timeSlotsMap.get(booking.time_slot_id);
      const teacherProfile = teacherProfilesMap.get(booking.teacher_id);
      const slotDetail = slotDetailsMap.get(booking.teacher_slot_id);

      return {
        id: booking.id,
        meeting_date: booking.meeting_date, // Fixed: was scheduled_date
        start_time: timeSlot?.start_time || '',
        end_time: timeSlot?.end_time || '',
        course_name: slotDetail?.topic || 'One-on-One Meeting',
        course_price: booking.payment_amount || 0,
        teacher_name: teacherProfile?.full_name || 'Unknown',
        teacher_email: teacherProfile?.email || '',
        meeting_link: booking.meeting_link,
        meeting_platform: 'google_meet',
        status: booking.approval_status === 'approved' ? 'assigned' : 'pending_assignment',
        payment_status: 'completed',
        payment_amount: booking.payment_amount || 0,
        notes: booking.notes,
        notes_link: booking.notes_link || null,
        resource_link: booking.resource_link || null,
        topic: slotDetail?.topic || '',
        description: slotDetail?.description || '',
        created_at: booking.created_at,
      };
    });

    console.log(`✅ Found ${transformedData.length} upcoming meetings for student (optimized with batch queries)`);
    return transformedData;
  } catch (err) {
    console.error('Exception fetching student meetings:', err);
    return [];
  }
};

/**
 * Get teacher's upcoming meetings (using view)
 */
export const getTeacherUpcomingMeetings = async (teacherId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('teacher_upcoming_meetings')
    .select('*')
    .eq('teacher_id', teacherId);

  if (error) {
    console.error('Error fetching teacher meetings from view:', error);
    // Fallback to direct query if view doesn't exist
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('meeting_bookings')
      .select(`
        id,
        student_name,
        student_email,
        student_phone,
        meeting_date,
        time_slot_id,
        teacher_slot_id,
        notes,
        notes_link,
        payment_amount,
        payment_status,
        approval_status,
        attendance,
        meeting_link,
        time_slots:time_slot_id (
          slot_name,
          start_time,
          end_time
        ),
        teacher_slot:teacher_slot_id (
          topic,
          description,
          is_free
        )
      `)
      .eq('teacher_id', teacherId)
      .order('meeting_date', { ascending: true });
    
    if (fallbackError) {
      console.error('Error fetching teacher meetings (fallback):', fallbackError);
      return [];
    }
    
    // Transform the data to match expected format
    return (fallbackData || []).map((booking: any) => {
      const timeSlot = Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots;
      const teacherSlot = Array.isArray(booking.teacher_slot) ? booking.teacher_slot[0] : booking.teacher_slot;
      return {
        ...booking,
        time_slot_start: timeSlot?.start_time || '',
        time_slot_end: timeSlot?.end_time || '',
        slot_name: timeSlot?.slot_name || '',
        preferred_date: booking.meeting_date,
        topic: teacherSlot?.topic || null,
        description: teacherSlot?.description || null,
        is_free: teacherSlot?.is_free || false,
        amount_paid: booking.payment_amount || 0,
        attendance_status: booking.attendance
      };
    });
  }

  return data || [];
};

/**
 * Get pending meetings for admin (using view)
 */
export const getPendingMeetingsForAdmin = async (): Promise<any[]> => {
  // Get meeting bookings that are waiting for admin approval
  const { data, error } = await supabase
    .from('meeting_bookings')
    .select(`
      id,
      student_name,
      student_email,
      student_phone,
      meeting_date,
      time_slot_id,
      teacher_slot_id,
      notes,
      payment_amount,
      payment_status,
      approval_status,
      created_at,
      updated_at,
      status,
      time_slots:time_slot_id (
        id,
        slot_name,
        start_time,
        end_time,
        duration_minutes
      ),
      teacher_slot:teacher_slot_id (
        id,
        teacher_id,
        date,
        topic,
        description,
        is_free,
        profiles (
          clerk_user_id,
          full_name,
          email
        )
      )
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending bookings:', error);
    return [];
  }

  // Transform the data to include teacher info
  const transformedData = (data || []).map((booking: any) => {
    const teacherSlot = Array.isArray(booking.teacher_slot) ? booking.teacher_slot[0] : booking.teacher_slot;
    const teacher = teacherSlot?.profiles;
    const timeSlot = Array.isArray(booking.time_slots) ? booking.time_slots[0] : booking.time_slots;
    return {
      id: booking.id,
      student_name: booking.student_name,
      student_email: booking.student_email,
      student_phone: booking.student_phone,
      meeting_date: booking.meeting_date,
      time_slot_start: timeSlot?.start_time || '',
      time_slot_end: timeSlot?.end_time || '',
      time_slot_name: timeSlot?.slot_name || '',
      notes: booking.notes,
      payment_amount: booking.payment_amount,
      payment_status: booking.payment_status,
      approval_status: booking.approval_status,
      created_at: booking.created_at,
      status: booking.status,
      teacher_id: teacher?.clerk_user_id || null,
      teacher_name: teacher?.full_name || null,
      teacher_email: teacher?.email || null,
      teacher_slot_id: booking.teacher_slot_id,
      topic: teacherSlot?.topic || null,
      description: teacherSlot?.description || null,
      is_free: teacherSlot?.is_free || false
    };
  });

  return transformedData;
};
