/**
 * Payment Receipt Controller
 * Handles receipt generation and retrieval
 */

import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

/**
 * Get payment receipt data
 * GET /api/payments/:paymentId/receipt
 */
export const getPaymentReceipt = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).auth?.userId;

    // Step 1: Fetch payment without FK profile joins
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          price,
          course_image_url,
          teacher_id
        ),
        enrollments (
          id,
          enrolled_at,
          student_id
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Step 2: Get teacher profile for course
    let teacherProfile = null;
    if (payment.courses?.teacher_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', payment.courses.teacher_id)
        .single();
      teacherProfile = profile;
    }

    // Step 3: Get student profile for enrollment
    const enrollment = (payment.enrollments as any)?.[0];
    let studentProfile = null;
    if (enrollment?.student_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, clerk_id')
        .eq('id', enrollment.student_id)
        .single();
      studentProfile = profile;
    }

    // Verify user access (student can only see their own receipts)
    if (studentProfile?.clerk_id !== userId) {
      // Check if admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('clerk_id', userId)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Generate receipt number if not exists
    let receiptNumber = payment.receipt_number;
    if (!receiptNumber) {
      receiptNumber = `RCPT-${new Date(payment.created_at).getFullYear()}${String(new Date(payment.created_at).getMonth() + 1).padStart(2, '0')}${String(new Date(payment.created_at).getDate()).padStart(2, '0')}-${payment.id.substring(0, 8).toUpperCase()}`;
      
      await supabase
        .from('payments')
        .update({ receipt_number: receiptNumber })
        .eq('id', paymentId);
    }

    const receiptData = {
      receiptNumber,
      date: payment.created_at,
      student: {
        name: studentProfile?.full_name || 'Student',
        email: studentProfile?.email || ''
      },
      course: {
        title: (payment.courses as any)?.title || 'Course',
        instructor: teacherProfile?.full_name || 'Instructor'
      },
      payment: {
        amount: payment.amount,
        currency: payment.currency,
        method: payment.payment_method || 'Card',
        transactionId: payment.razorpay_payment_id,
        status: payment.status
      }
    };

    res.json({
      success: true,
      receipt: receiptData
    });
  } catch (error: any) {
    console.error('Error in getPaymentReceipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get student's payment history
 * GET /api/student/payments
 */
export const getStudentPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get all payment_records for this student
    // payment_records doesn't have student_clerk_id column directly.
    // For meeting payments: join through meeting_requests.
    // For course payments: join through enrollments.
    
    // 1. Get meeting requests by this student
    const { data: meetingRequests } = await supabase
      .from('meeting_requests')
      .select('id')
      .eq('student_id', userId);

    const meetingRequestIds = (meetingRequests || []).map(mr => mr.id);

    // 2. Get payment records linked to those meeting requests
    let payments: any[] = [];
    if (meetingRequestIds.length > 0) {
      const { data: meetingPayments, error: mpError } = await supabase
        .from('payment_records')
        .select('*')
        .in('meeting_request_id', meetingRequestIds)
        .order('created_at', { ascending: false });
      if (!mpError && meetingPayments) payments = meetingPayments;
    }

    // 3. Also get course enrollment payments (from enrollments table)
    const { data: enrollmentPayments } = await supabase
      .from('enrollments')
      .select('id, course_id, enrolled_at, payment_status, payment_id')
      .eq('student_id', userId)
      .not('payment_id', 'is', null);

    // Merge course payments as payment-like records
    if (enrollmentPayments) {
      for (const ep of enrollmentPayments) {
        if (ep.payment_id) {
          const { data: pr } = await supabase
            .from('payment_records')
            .select('*')
            .eq('id', ep.payment_id)
            .single();
          if (pr && !payments.find(p => p.id === pr.id)) {
            payments.push({ ...pr, course_id: ep.course_id });
          }
        }
      }
    }

    // Sort combined payments by date
    payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const paymentsError = null;

    if (paymentsError) {
      console.error('Error fetching payment records:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    // Enrich with course and meeting request details
    const enrichedPayments = [];
    for (const payment of (payments || [])) {
      let courseInfo = null;
      let meetingInfo: any = null;

      if (payment.course_id) {
        const { data: course } = await supabase
          .from('courses')
          .select('id, title, course_image_url')
          .eq('id', payment.course_id)
          .single();
        courseInfo = course;
      }

      if (payment.meeting_request_id) {
        const { data: meetingReq } = await supabase
          .from('meeting_requests')
          .select('id, preferred_date, time_slot_id, teacher_slot_id')
          .eq('id', payment.meeting_request_id)
          .single();
        if (meetingReq) {
          meetingInfo = { ...meetingReq } as any;
          // Fetch topic from slot
          if ((meetingReq as any).teacher_slot_id) {
            const { data: slot } = await supabase
              .from('teacher_slot_availability')
              .select('topic, description')
              .eq('id', (meetingReq as any).teacher_slot_id)
              .single();
            if (slot) {
              meetingInfo.topic = slot.topic;
              meetingInfo.description = slot.description;
            }
          }
          // Fetch time slot name
          if ((meetingReq as any).time_slot_id) {
            const { data: ts } = await supabase
              .from('time_slots')
              .select('slot_name, start_time, end_time')
              .eq('id', (meetingReq as any).time_slot_id)
              .single();
            if (ts) {
              meetingInfo.time_slot = ts;
            }
          }
        }
      }

      enrichedPayments.push({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        status: payment.status,
        created_at: payment.created_at,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        payment_type: payment.course_id ? 'course_enrollment' : 'meeting_booking',
        course: courseInfo,
        meeting: meetingInfo,
      });
    }

    res.json({
      success: true,
      payments: enrichedPayments
    });
  } catch (error: any) {
    console.error('Error in getStudentPayments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
