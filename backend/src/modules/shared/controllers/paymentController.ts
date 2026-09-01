/**
 * Payment Controller


































































































































































































































































































































































































































































































































/**
 * Payment Controller
 * 
 * Handles HTTP requests for payments and Razorpay integration
 */

import { Request, Response } from 'express';
import * as paymentService from '../services/paymentService';
import * as meetingService from '../services/meetingService';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase } from '../../../config/database';
import * as courseNotifications from '../../../services/courseNotificationService';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const moneyAmount = (value: unknown): number | null => {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

const actorIdentityAliases = async (userId: string): Promise<Set<string>> => {
  const aliases = new Set<string>([userId]);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, clerk_user_id')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Unable to resolve payment actor profile:', error);
    return aliases;
  }

  if (data?.id) aliases.add(data.id);
  if (data?.clerk_user_id) aliases.add(data.clerk_user_id);
  return aliases;
};

const ownsMeetingRequest = async (meetingRequest: any, userId: string): Promise<boolean> => {
  const aliases = await actorIdentityAliases(userId);
  return Boolean(meetingRequest?.student_id && aliases.has(meetingRequest.student_id));
};

const canAccessPayment = async (payment: any, userId: string, role?: string): Promise<boolean> => {
  if (role === 'admin') return true;

  if (payment?.meeting_request_id) {
    const request = await meetingService.getMeetingRequestById(payment.meeting_request_id);
    return ownsMeetingRequest(request, userId);
  }

  const aliases = await actorIdentityAliases(userId);

  // Newer course orders retain their server-derived owner before an
  // enrollment exists.  This is important because the order must be
  // verifiable by its purchaser, not by an arbitrary authenticated user who
  // knows an order id.  Keep the enrollment lookup below for older records.
  const recordedOwner = payment?.student_clerk_id || payment?.payment_data?.student_clerk_id;
  if (recordedOwner && aliases.has(recordedOwner)) {
    return true;
  }

  // Course payments may also be recorded through a legacy enrollment
  // relation. Resolve the current actor to either supported enrollment
  // identity form.
  if (payment?.id) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('payment_id', payment.id)
      .limit(1);

    if (error) {
      console.error('Unable to resolve payment enrollment ownership:', error);
      return false;
    }

    return (data ?? []).some((enrollment: any) => aliases.has(enrollment.student_id));
  }

  return false;
};

const safePaymentForClient = (payment: any) => {
  const {
    razorpay_signature: _signature,
    payment_data: _paymentData,
    payment_email: _paymentEmail,
    payment_contact: _paymentContact,
    ...safePayment
  } = payment || {};

  return safePayment;
};

const validRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean => {
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const received = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
};

// ============================================
// RAZORPAY INTEGRATION
// ============================================

/**
 * Create Razorpay order
 * POST /api/payments/create-order
 */
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { meeting_request_id, course_id } = req.body || {};
    const userId = (req as any).auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (
      (typeof course_id !== 'string' && typeof course_id !== 'undefined') ||
      (typeof meeting_request_id !== 'string' && typeof meeting_request_id !== 'undefined') ||
      Boolean(course_id) === Boolean(meeting_request_id)
    ) {
      return res.status(400).json({
        error: 'Provide exactly one valid meeting_request_id or course_id',
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials are not configured');
      return res.status(503).json({ error: 'Payments are temporarily unavailable' });
    }

    let notes: any = {};
    let receiptPrefix = 'rcpt';
    let shortId = '';
    let amount: number;

    // Handle course enrollment payments
    if (course_id) {
      // Verify course exists
      const { data: course, error } = await supabase
        .from('courses')
        .select('id, title, price, teacher_id, approval_status, status, is_published, enrollment_limit')
        .eq('id', course_id)
        .single();

      if (error || !course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      if (
        course.approval_status !== 'approved' ||
        (course.status !== 'published' && course.is_published !== true)
      ) {
        return res.status(403).json({ error: 'This course is not available for enrollment' });
      }

      const identityAliases = [...await actorIdentityAliases(userId)];
      const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', course_id)
        .in('student_id', identityAliases)
        .limit(1);

      if (existingEnrollmentError) {
        console.error('Unable to check existing course enrollment:', existingEnrollmentError);
        return res.status(500).json({ error: 'Unable to validate course enrollment' });
      }

      if ((existingEnrollment ?? []).length > 0) {
        return res.status(409).json({ error: 'You are already enrolled in this course' });
      }

      const enrollmentLimit = Number(course.enrollment_limit || 0);
      if (Number.isFinite(enrollmentLimit) && enrollmentLimit > 0) {
        const { count, error: capacityError } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', course_id)
          .eq('status', 'active');

        if (capacityError) {
          console.error('Unable to check course capacity:', capacityError);
          return res.status(500).json({ error: 'Unable to validate course capacity' });
        }

        if ((count || 0) >= enrollmentLimit) {
          return res.status(409).json({ error: 'This course is full' });
        }
      }

      const courseAmount = moneyAmount(course.price);
      if (courseAmount === null || courseAmount <= 0) {
        return res.status(400).json({ error: 'This course does not require a payment order' });
      }
      amount = courseAmount;

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('clerk_user_id', userId)
        .single();

      notes = {
        course_id,
        course_title: course.title,
        student_clerk_id: userId,
        student_name: profile?.full_name || 'Student',
        student_email: profile?.email || '',
        payment_type: 'course_enrollment'
      };

      receiptPrefix = 'course';
      shortId = course_id.substring(0, 8);
    } 
    // Handle meeting request payments
    else if (meeting_request_id) {
      // Verify meeting request exists
      const meetingRequest = await meetingService.getMeetingRequestById(meeting_request_id);
      if (!meetingRequest) {
        return res.status(404).json({ error: 'Meeting request not found' });
      }
      if (!await ownsMeetingRequest(meetingRequest, userId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // The request amount was resolved from server-side slot/pricing rules
      // at creation time. Never accept a browser-provided amount here.
      const meetingAmount = moneyAmount(meetingRequest.amount);
      if (meetingAmount === null || meetingAmount <= 0) {
        return res.status(400).json({ error: 'This meeting does not require a payment order' });
      }
      amount = meetingAmount;

      notes = {
        meeting_request_id,
        student_name: meetingRequest.student_name,
        student_email: meetingRequest.student_email,
        payment_type: 'meeting_booking'
      };

      receiptPrefix = 'meet';
      shortId = meeting_request_id.substring(0, 8);
    } else {
      return res.status(400).json({ 
        error: 'Either meeting_request_id or course_id is required' 
      });
    }

    // Create Razorpay order
    const timestamp = Date.now().toString().substring(7); // Last 6 digits
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise (smallest currency unit)
      currency: 'INR',
      receipt: `${receiptPrefix}_${shortId}_${timestamp}`, // Max 40 chars
      notes
    };

    const order = await razorpay.orders.create(options);

    // Create payment record in database
    const paymentData: any = {
      razorpay_order_id: order.id,
      amount,
      currency: 'INR',
      status: 'pending',
    };

    if (course_id) {
      // These bindings originate only from the server-side course lookup.
      // They let verification prove ownership before an enrollment has been
      // created and prevent a browser from swapping in another course ID.
      paymentData.course_id = course_id;
      paymentData.student_clerk_id = userId;
      paymentData.payment_data = {
        source: 'course_enrollment',
        course_id,
        student_clerk_id: userId,
      };
    }

    if (meeting_request_id) {
      paymentData.meeting_request_id = meeting_request_id;
    }

    const payment = await paymentService.createPaymentRecord(paymentData);

    res.status(201).json({
      success: true,
      order_id: order.id,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || '',
      payment_record_id: payment.id,
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
};

/**
 * Verify Razorpay payment
 * POST /api/payments/verify
 */
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      meeting_request_id,
      course_id,
      payment_method,
      payment_email,
      payment_contact,
    } = req.body || {};
    
    const userId = (req as any).auth?.userId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        success: false,
        error: 'Payment verification details are required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const existingPayment = await paymentService.getPaymentByOrderId(razorpay_order_id);
    if (!existingPayment) {
      return res.status(404).json({ success: false, error: 'Payment order not found' });
    }
    if (!await canAccessPayment(existingPayment, userId, (req as any).auth?.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    const storedCourseId = existingPayment.course_id || existingPayment.payment_data?.course_id;
    const storedMeetingRequestId = existingPayment.meeting_request_id;

    // The resource being paid for is bound at order creation. Never let a
    // client switch an order from one meeting/course to another at verify
    // time, even if it has a valid signature for the original order.
    if (storedMeetingRequestId) {
      if (
        course_id ||
        (meeting_request_id && meeting_request_id !== storedMeetingRequestId)
      ) {
        return res.status(400).json({ success: false, error: 'Payment order does not match this meeting request' });
      }
    } else if (storedCourseId) {
      if (
        meeting_request_id ||
        (course_id && course_id !== storedCourseId)
      ) {
        return res.status(400).json({ success: false, error: 'Payment order does not match this course' });
      }
    } else {
      // There is no safe way to infer a resource for legacy, unbound orders.
      // Reject rather than trusting a course_id supplied by the browser.
      return res.status(409).json({
        success: false,
        error: 'This payment order is missing its server-side purchase binding',
      });
    }

    if (storedMeetingRequestId) {
      const request = await meetingService.getMeetingRequestById(storedMeetingRequestId);
      const expectedAmount = moneyAmount(request?.amount);
      if (expectedAmount === null || Math.abs(Number(existingPayment.amount) - expectedAmount) > 0.001) {
        return res.status(409).json({
          success: false,
          error: 'This payment order no longer matches the server-calculated meeting price',
        });
      }
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not configured');
      return res.status(503).json({ success: false, error: 'Payments are temporarily unavailable' });
    }

    if (!validRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid payment signature. Payment verification failed.' 
      });
    }

    const terminalFailureStatuses = new Set(['failed', 'refunded', 'cancelled']);
    if (terminalFailureStatuses.has(String(existingPayment.status || '').toLowerCase())) {
      return res.status(409).json({
        success: false,
        error: 'This payment order can no longer be verified',
      });
    }

    const alreadyVerified = ['success', 'captured'].includes(String(existingPayment.status || '').toLowerCase()) &&
      Boolean(existingPayment.razorpay_payment_id);

    if (alreadyVerified && existingPayment.razorpay_payment_id !== razorpay_payment_id) {
      return res.status(409).json({
        success: false,
        error: 'This payment order was already verified with a different payment',
      });
    }

    // Store only known server metadata. Do not persist arbitrary browser
    // request bodies next to a payment record.
    const verificationMetadata = {
      source: storedCourseId ? 'course_enrollment' : 'meeting_booking',
      ...(storedCourseId ? { course_id: storedCourseId, student_clerk_id: userId } : {}),
      ...(storedMeetingRequestId ? { meeting_request_id: storedMeetingRequestId } : {}),
    };

    const payment = alreadyVerified
      ? existingPayment
      : await paymentService.updatePaymentRecord(razorpay_order_id, {
          razorpay_payment_id,
          razorpay_signature,
          payment_method: typeof payment_method === 'string' ? payment_method.slice(0, 64) : undefined,
          payment_email: typeof payment_email === 'string' ? payment_email.slice(0, 255) : undefined,
          payment_contact: typeof payment_contact === 'string' ? payment_contact.slice(0, 32) : undefined,
          payment_data: verificationMetadata,
          status: 'success',
        });

    // Handle course enrollment
    if (storedCourseId) {
      const enrollmentCourseId = storedCourseId;
      
      try {
        console.log('🔄 Creating enrollment for course:', enrollmentCourseId);
        
        const aliases = [...await actorIdentityAliases(userId)];
        const { data: existingEnrollments, error: enrollmentLookupError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', enrollmentCourseId)
          .in('student_id', aliases)
          .limit(1);

        if (enrollmentLookupError) {
          throw enrollmentLookupError;
        }

        let enrollment = existingEnrollments?.[0] || null;
        if (!enrollment) {
          const { data: createdEnrollment, error: enrollError } = await supabase
            .from('enrollments')
            .insert({
              // Enrollments use Clerk IDs in the active course/student flow.
              student_id: userId,
              course_id: enrollmentCourseId,
              status: 'active',
              payment_status: 'completed',
              payment_id: payment.id,
              enrolled_at: new Date().toISOString()
            })
            .select()
            .single();

          if (enrollError) {
            // A simultaneous verify retry may have just inserted the same
            // enrollment. Re-read before treating it as a real failure.
            const { data: racedEnrollments } = await supabase
              .from('enrollments')
              .select('*')
              .eq('course_id', enrollmentCourseId)
              .in('student_id', aliases)
              .limit(1);
            enrollment = racedEnrollments?.[0] || null;
            if (!enrollment) {
              throw enrollError;
            }
          } else {
            enrollment = createdEnrollment;
          }
        }

        console.log('✅ Enrollment created successfully:', enrollment.id);

        // Send enrollment confirmation email (fire-and-forget)
        try {
          const { data: studentProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('clerk_user_id', userId)
            .single();

          const { data: courseInfo } = await supabase
            .from('courses')
            .select('title')
            .eq('id', enrollmentCourseId)
            .single();

          if (studentProfile?.email && courseInfo?.title) {
            courseNotifications.notifyEnrollmentConfirmation(
              studentProfile.email,
              studentProfile.full_name || 'Student',
              courseInfo.title,
              enrollmentCourseId
            );
          }
        } catch (emailErr) {
          console.error('⚠️ Failed to send enrollment email after payment:', emailErr);
        }

        return res.status(200).json({
          success: true,
          message: 'Payment verified and enrollment completed successfully',
          payment,
          enrollment
        });
      } catch (error: any) {
        console.error('❌ Error creating enrollment:', error);
        // Payment succeeded but enrollment failed - return partial success
        return res.status(200).json({
          success: true,
          warning: 'Payment successful but enrollment failed. Please contact support.',
          payment,
          enrollment_error: error.message
        });
      }
    }
    
    // Handle meeting booking (existing logic)
    if (storedMeetingRequestId) {
      const meetingReqId = storedMeetingRequestId;
      
      if (!meetingReqId) {
        return res.status(400).json({
          success: false,
          error: 'Meeting request ID is required for meeting bookings'
        });
      }
      
      let bookingCreated = false;
      let booking = null;
      let bookingError = null;
      
      try {
        // Insert into meeting_bookings for admin approval/box logic
        console.log('🔄 Attempting to create booking for payment:', payment.id);
        console.log('🔄 Meeting request ID:', meetingReqId);
        booking = await meetingService.insertMeetingBooking(meetingReqId, payment.id);
        bookingCreated = true;
        console.log('✅ Booking created successfully:', booking.id);
      } catch (error: any) {
        bookingError = error;
        console.error('❌ Failed to create booking after successful payment:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        console.error('Meeting request ID:', meetingReqId);
        console.error('Payment ID:', payment.id);
        console.error('Full error:', JSON.stringify(error, null, 2));
      }

      // Only mark as 'paid' if booking was created successfully
      if (bookingCreated) {
        await meetingService.updateMeetingRequestStatus(meetingReqId, 'paid');
        console.log('✅ Meeting request marked as paid');
      } else {
        // If booking failed, mark as failed so student can retry
        await meetingService.updateMeetingRequestStatus(meetingReqId, 'failed');
        console.error('❌ Booking creation failed, marking meeting request as failed');
        
        // Return a proper error response with payment details
        return res.status(500).json({
          success: false,
          error: 'Booking creation failed after payment was successful',
          message: 'Your payment was received but we could not create the booking. Please contact support.',
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          booking_error: bookingError?.message || 'Unknown error',
          support_message: `Payment ID: ${razorpay_payment_id}. Please save this for reference.`
        });
      }

      // Try to create scheduled meeting (optional - booking already exists)
      let scheduledMeeting = null;
      try {
        scheduledMeeting = await meetingService.createScheduledMeeting(
          meetingReqId,
          payment.id
        );
        console.log('✅ Scheduled meeting created:', scheduledMeeting?.id);
      } catch (scheduledError: any) {
        console.warn('⚠️  Could not create scheduled_meeting record (booking already exists):', scheduledError.message);
        // Don't fail the whole payment - the booking exists which is what matters
      }

      return res.json({
        success: true,
        payment,
        meeting: scheduledMeeting,
        booking,
        message: 'Payment verified successfully. Your meeting has been scheduled and sent for admin approval!',
      });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    
    // Try to mark the meeting request as failed if we have the order_id
    const { razorpay_order_id } = req.body;
    if (razorpay_order_id) {
      try {
        const paymentRecord = await paymentService.getPaymentByOrderId(razorpay_order_id);
        if (paymentRecord && paymentRecord.meeting_request_id) {
          await meetingService.updateMeetingRequestStatus(paymentRecord.meeting_request_id, 'failed');
        }
      } catch (updateError) {
        console.error('Error updating meeting request status to failed:', updateError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to verify payment' 
    });
  }
};

/**
 * Handle Razorpay webhook
 * POST /api/payments/webhook
 */
export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = req.body;

    // Verify webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(webhookBody))
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = webhookBody;

    switch (event) {
      case 'payment.captured':
        // Payment successful
        await paymentService.updatePaymentStatus(payload.payment.entity.order_id, 'captured');
        break;

      case 'payment.failed':
        // Payment failed
        await paymentService.updatePaymentStatus(payload.payment.entity.order_id, 'failed');
        break;

      case 'payment.refunded':
        // Payment refunded
        await paymentService.updatePaymentStatus(payload.payment.entity.order_id, 'refunded');
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: error.message || 'Webhook handling failed' });
  }
};

// ============================================
// PAYMENT RECORDS
// ============================================

/**
 * Get payment record by ID
 * GET /api/payments/:id
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const payment = await paymentService.getPaymentRecordById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!await canAccessPayment(payment, userId, (req as any).auth?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(safePaymentForClient(payment));
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment' });
  }
};

/**
 * Get student's payment history
 * GET /api/payments/student/history
 */
export const getStudentPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payments = await paymentService.getStudentPayments(userId);
    res.json(payments);
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment history' });
  }
};

/**
 * Get payment statistics (Admin only)
 * GET /api/payments/stats
 */
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const stats = await paymentService.getPaymentStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch payment statistics' });
  }
};

/**
 * Generate payment receipt (Future: PDF generation)
 * GET /api/payments/:id/receipt
 */
export const generatePaymentReceipt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const payment = await paymentService.getPaymentRecordById(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!await canAccessPayment(payment, userId, (req as any).auth?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch meeting request and slot info
    let studentName = '';
    let studentEmail = '';
    let studentPhone = '';
    let slotName = '';
    let slotTime = '';
    let topic = '';
    let description = '';
    if (payment.meeting_request_id) {
      const meetingRequest = await paymentService.getMeetingRequestById(payment.meeting_request_id);
      if (meetingRequest) {
        studentName = meetingRequest.student_name || '';
        studentEmail = meetingRequest.student_email || '';
        studentPhone = meetingRequest.student_phone || '';
        
        // Fetch topic and description from teacher_slot_availability
        if (meetingRequest.teacher_slot_id) {
          const { data: slotData } = await supabase
            .from('teacher_slot_availability')
            .select('topic, description')
            .eq('id', meetingRequest.teacher_slot_id)
            .single();
          
          if (slotData) {
            topic = slotData.topic || '';
            description = slotData.description || '';
          }
        }
        
        if (meetingRequest.time_slot_id) {
          const slot = await paymentService.getTimeSlotById(meetingRequest.time_slot_id);
          if (slot) {
            slotName = slot.slot_name || '';
            slotTime = `${slot.start_time || ''} - ${slot.end_time || ''}`;
          }
        }
      }
    }

    // Generate PDF receipt using pdfkit
    const PDFDocument = require('pdfkit');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payment-receipt-${id}.pdf`);
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Header
    doc.fillColor('black').fontSize(22).font('Helvetica-Bold').text('Islamic Academy Payment Receipt', { align: 'center' });
    doc.moveDown(1.5);

    // Payment Info Section
    doc.fontSize(12).font('Helvetica-Bold').text('Payment Details', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Receipt ID: ${id}`);
    doc.text(`Pay ID: ${payment.razorpay_payment_id || 'N/A'}`);
    doc.text(`Date: ${new Date(payment.created_at).toLocaleString()}`);
    // Payment records store the server-calculated major currency amount;
    // Razorpay receives the paise conversion separately when the order is
    // created. Do not divide a stored receipt amount a second time.
    doc.text(`Amount Paid: INR ${Number(payment.amount).toFixed(2)}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();

    // Meeting Info Section
    doc.font('Helvetica-Bold').text('Meeting Details', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.text(`Student Name: ${studentName}`);
    doc.text(`Student Email: ${studentEmail}`);
    doc.text(`Student Phone: ${studentPhone}`);
    if (slotName) {
      doc.text(`Slot: ${slotName}`);
      doc.text(`Time: ${slotTime}`);
    }
    doc.moveDown();

    // Islamic Topic Section
    if (topic) {
      doc.font('Helvetica-Bold').text('Islamic Learning Topic', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12).text(topic);
      if (description) {
        doc.font('Helvetica').fontSize(10).text(description, { width: 500 });
      }
      doc.moveDown();
    }

    // Footer
    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(12).fillColor('black').text('JazakAllah Khair for your payment!', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).fillColor('black').text('For any queries, contact support@yourislamicacademy.com', { align: 'center' });

    doc.end();
  } catch (error: any) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: error.message || 'Failed to generate receipt' });
  }
};
