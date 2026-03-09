import { supabase } from '../../../config/database';
// Fetch meeting request by ID
export async function getMeetingRequestById(id: string): Promise<any> {
  const { data, error } = await supabase
    .from('meeting_requests')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// Fetch time slot by ID
export async function getTimeSlotById(id: string): Promise<any> {
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}
/**
 * Payment Service
 * 
 * Database operations for payment records and Razorpay integration
 */


// ============================================
// INTERFACES
// ============================================

export interface PaymentRecord {
  id: string;
  meeting_request_id?: string;
  course_id?: string;
  student_clerk_id?: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string;
  payment_email?: string;
  payment_contact?: string;
  payment_data?: any;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRecordInput {
  meeting_request_id?: string;
  course_id?: string;
  student_clerk_id?: string;
  razorpay_order_id: string;
  amount: number;
  currency?: string;
  status?: string;
}

export interface UpdatePaymentInput {
  razorpay_payment_id: string;
  razorpay_signature: string;
  payment_method?: string;
  payment_email?: string;
  payment_contact?: string;
  payment_data?: any;
  status?: string;
}

// ============================================
// PAYMENT RECORDS
// ============================================

/**
 * Create payment record (when Razorpay order is created)
 */
export const createPaymentRecord = async (data: CreatePaymentRecordInput): Promise<PaymentRecord> => {
  const { data: payment, error } = await supabase
    .from('payment_records')
    .insert([
      {
        ...data,
        currency: data.currency || 'INR',
        status: data.status || 'created',
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating payment record:', error);
    throw new Error(error.message);
  }

  return payment;
};

/**
 * Get payment record by ID
 */
export const getPaymentRecordById = async (id: string): Promise<PaymentRecord | null> => {
  // Fetch payment record WITHOUT FK joins (no FK constraints exist)
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching payment record:', error);
    return null;
  }

  // Manually fetch meeting_request data if meeting_request_id exists
  if (data && data.meeting_request_id) {
    const { data: meetingRequest } = await supabase
      .from('meeting_requests')
      .select('id, student_name, student_email, student_phone, preferred_date, notes, teacher_slot_id, time_slot_id')
      .eq('id', data.meeting_request_id)
      .single();
    
    if (meetingRequest) {
      // Manually fetch time_slot data
      if (meetingRequest.time_slot_id) {
        const { data: timeSlot } = await supabase
          .from('time_slots')
          .select('id, slot_name, start_time, end_time, duration_minutes')
          .eq('id', meetingRequest.time_slot_id)
          .single();
        (meetingRequest as any).time_slot = timeSlot || null;
      }
      
      // Fetch topic and description from teacher_slot_availability
      if (meetingRequest.teacher_slot_id) {
        const { data: slotData } = await supabase
          .from('teacher_slot_availability')
          .select('topic, description')
          .eq('id', meetingRequest.teacher_slot_id)
          .single();
        if (slotData) {
          (meetingRequest as any).topic = slotData.topic;
          (meetingRequest as any).description = slotData.description;
        }
      }
      
      (data as any).meeting_request = meetingRequest;
    }
  }

  return data;
};

/**
 * Get payment record by Razorpay order ID
 */
export const getPaymentByOrderId = async (orderId: string): Promise<PaymentRecord | null> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .single();

  if (error) {
    console.error('Error fetching payment by order ID:', error);
    return null;
  }

  return data;
};

/**
 * Get payment record by meeting request ID
 */
export const getPaymentByMeetingRequestId = async (requestId: string): Promise<PaymentRecord | null> => {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('meeting_request_id', requestId)
    .single();

  if (error) {
    console.error('Error fetching payment by meeting request:', error);
    return null;
  }

  return data;
};

/**
 * Update payment record after successful payment
 */
export const updatePaymentRecord = async (
  orderId: string,
  updateData: UpdatePaymentInput
): Promise<PaymentRecord> => {
  const { data, error } = await supabase
    .from('payment_records')
    .update({
      razorpay_payment_id: updateData.razorpay_payment_id,
      razorpay_signature: updateData.razorpay_signature,
      payment_method: updateData.payment_method,
      payment_email: updateData.payment_email,
      payment_contact: updateData.payment_contact,
      payment_data: updateData.payment_data,
      status: updateData.status || 'captured',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_order_id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment record:', error);
    throw new Error(error.message);
  }

  return data;
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (orderId: string, status: string): Promise<PaymentRecord> => {
  // Update payment record
  const { data, error } = await supabase
    .from('payment_records')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('razorpay_order_id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment status:', error);
    throw new Error(error.message);
  }

  // If payment failed or was cancelled, also update the related meeting_request status
  if (data && data.meeting_request_id && (status === 'failed' || status === 'cancelled')) {
    try {
      // Import here to avoid circular dependency
      const meetingService = await import('./meetingService');
      await meetingService.updateMeetingRequestStatus(data.meeting_request_id, status);
    } catch (err) {
      console.error('Error updating meeting_request status after payment failure/cancel:', err);
    }
  }

  return data;
};

/**
 * Get all payments for a student
 */
export const getStudentPayments = async (studentId: string): Promise<any[]> => {
  // Fetch payment records for this student via meeting_requests join
  // (payment_records table doesn't have student_clerk_id column)
  const { data: meetingReqs } = await supabase
    .from('meeting_requests')
    .select('id')
    .eq('student_id', studentId);

  const mrIds = (meetingReqs || []).map(mr => mr.id);
  let data: any[] | null = [];
  let error: any = null;

  if (mrIds.length > 0) {
    const result = await supabase
      .from('payment_records')
      .select('*')
      .in('meeting_request_id', mrIds)
      .order('created_at', { ascending: false });
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('Error fetching student payments:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Enrich with meeting request data
  const meetingRequestIds = data.map(p => p.meeting_request_id).filter(Boolean);
  let meetingRequestsMap: Record<string, any> = {};
  if (meetingRequestIds.length > 0) {
    const { data: meetingRequests } = await supabase
      .from('meeting_requests')
      .select('id, student_id, student_name, student_email, preferred_date, time_slot_id')
      .in('id', meetingRequestIds);
    if (meetingRequests) {
      meetingRequests.forEach(mr => { meetingRequestsMap[mr.id] = mr; });
    }
  }

  return data.map(payment => ({
    ...payment,
    meeting_request: payment.meeting_request_id ? meetingRequestsMap[payment.meeting_request_id] || null : null,
  }));
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (): Promise<any> => {
  // Total revenue
  const { data: totalData, error: totalError } = await supabase
    .from('payment_records')
    .select('amount')
    .eq('status', 'captured');

  if (totalError) {
    console.error('Error fetching payment stats:', totalError);
    throw new Error(totalError.message);
  }

  const totalRevenue = totalData?.reduce((sum, record) => sum + parseFloat(record.amount.toString()), 0) || 0;
  const totalPayments = totalData?.length || 0;

  // Today's revenue
  const today = new Date().toISOString().split('T')[0];
  const { data: todayData } = await supabase
    .from('payment_records')
    .select('amount')
    .eq('status', 'captured')
    .gte('paid_at', today);

  const todayRevenue = todayData?.reduce((sum, record) => sum + parseFloat(record.amount.toString()), 0) || 0;

  // Pending payments
  const { data: pendingData } = await supabase
    .from('payment_records')
    .select('*')
    .eq('status', 'created');

  const pendingPayments = pendingData?.length || 0;

  return {
    totalRevenue,
    totalPayments,
    todayRevenue,
    pendingPayments,
  };
};
