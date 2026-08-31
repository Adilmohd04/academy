/**
 * Payment Service
 * Handles Razorpay payment processing and receipt generation
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { supabase } from '../../../config/database';
import { checkPrerequisites } from './prerequisiteService';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export class StudentPaymentError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'StudentPaymentError';
  }
}

const paymentSignatureMatches = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean => {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!secret || !razorpaySignature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const supplied = Buffer.from(razorpaySignature, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return supplied.length === expectedBuffer.length && crypto.timingSafeEqual(supplied, expectedBuffer);
};

const ensurePaidCourseEnrollment = async (studentId: string, payment: any) => {
  const { data: existingEnrollment, error: lookupError } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', payment.course_id)
    .limit(1);

  if (lookupError) {
    throw new StudentPaymentError('Unable to confirm course enrollment', 500);
  }

  if (existingEnrollment?.[0]) {
    return existingEnrollment[0];
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .insert({
      student_id: studentId,
      course_id: payment.course_id,
      status: 'active',
      payment_status: 'completed',
      enrolled_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (!enrollmentError) {
    return enrollment;
  }

  // A repeated payment callback can race with the first successful callback.
  // Resolve the unique enrollment rather than issuing a second course access.
  const { data: racedEnrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', payment.course_id)
    .limit(1);

  if (racedEnrollment?.[0]) {
    return racedEnrollment[0];
  }

  console.error('Error creating course enrollment after payment:', enrollmentError);
  throw new StudentPaymentError('Payment completed, but enrollment could not be finalized', 500);
};

/**
 * Create a Razorpay order for course enrollment
 */
export async function createPaymentOrder(studentId: string, courseId: string) {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new StudentPaymentError('Payments are temporarily unavailable', 503);
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price, approval_status, status, is_published, enrollment_limit')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new StudentPaymentError('Course not found', 404);
    }

    if (
      course.approval_status !== 'approved' ||
      (course.status !== 'published' && course.is_published !== true)
    ) {
      throw new StudentPaymentError('This course is not available for enrollment', 403);
    }

    const courseAmount = Number(course.price);
    if (!Number.isFinite(courseAmount) || courseAmount <= 0) {
      throw new StudentPaymentError('This course does not require a payment order', 400);
    }

    // Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('clerk_user_id', studentId)
      .maybeSingle();

    const enrollmentIdentityAliases = [studentId, profile?.id].filter(Boolean);
    const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .in('student_id', enrollmentIdentityAliases)
      .limit(1);

    if (existingEnrollmentError) {
      throw new StudentPaymentError('Unable to validate course enrollment', 500);
    }

    if ((existingEnrollment ?? []).length > 0) {
      throw new StudentPaymentError('You are already enrolled in this course', 409);
    }

    // Gate prerequisites here, before any money is taken. Deliberately not
    // repeated after payment: a student who has already paid must not be left
    // holding a charge with no enrollment, and reaching the post-payment path
    // at all requires a valid Razorpay signature.
    const prerequisites = await checkPrerequisites(courseId, studentId);
    if (!prerequisites.satisfied) {
      throw new StudentPaymentError(
        `You must complete the following course(s) before enrolling: ${prerequisites.missing
          .map((course) => course.title)
          .join(', ')}`,
        403,
      );
    }

    const enrollmentLimit = Number(course.enrollment_limit || 0);
    if (Number.isFinite(enrollmentLimit) && enrollmentLimit > 0) {
      const { count, error: capacityError } = await supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'active');

      if (capacityError) {
        throw new StudentPaymentError('Unable to validate course capacity', 500);
      }

      if ((count || 0) >= enrollmentLimit) {
        throw new StudentPaymentError('This course is full', 409);
      }
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(courseAmount * 100), // Convert to paise
      currency: 'INR',
      receipt: `course_${courseId.substring(0, 8)}_${Date.now()}`,
      notes: {
        course_id: courseId,
        course_title: course.title,
        student_clerk_id: studentId,
        student_name: profile?.full_name || 'Student',
        student_email: profile?.email || '',
        payment_type: 'course_enrollment'
      }
    });

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('student_payments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        amount: courseAmount,
        currency: 'INR',
        razorpay_order_id: order.id,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Failed to create payment record');
    }

    return {
      success: true,
      order_id: order.id,
      payment_id: payment.id,
      amount: courseAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID
    };
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
}

/**
 * Verify and confirm Razorpay payment
 */
export async function confirmPayment(
  studentId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
) {
  try {
    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from('student_payments')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingPaymentError || !existingPayment) {
      // Do not reveal whether another student owns the order.
      throw new StudentPaymentError('Payment order not found', 404);
    }

    if (!paymentSignatureMatches(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new StudentPaymentError('Invalid payment signature', 400);
    }

    if (existingPayment.status === 'completed') {
      if (existingPayment.razorpay_payment_id !== razorpayPaymentId) {
        throw new StudentPaymentError('This payment order was already verified with a different payment', 409);
      }

      const enrollment = await ensurePaidCourseEnrollment(studentId, existingPayment);
      return { success: true, payment: existingPayment, enrollment };
    }

    if (!['pending'].includes(existingPayment.status)) {
      throw new StudentPaymentError('This payment order can no longer be verified', 409);
    }

    // Update only the authenticated owner's pending record. This makes a
    // valid signature insufficient to mutate another student's order.
    const { data: payment, error: updateError } = await supabase
      .from('student_payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        payment_method: 'razorpay'
      })
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment:', updateError);
      // A retry may have completed the order immediately before this update.
      const { data: racedPayment } = await supabase
        .from('student_payments')
        .select('*')
        .eq('razorpay_order_id', razorpayOrderId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (racedPayment?.status === 'completed' && racedPayment.razorpay_payment_id === razorpayPaymentId) {
        const enrollment = await ensurePaidCourseEnrollment(studentId, racedPayment);
        return { success: true, payment: racedPayment, enrollment };
      }

      throw new StudentPaymentError('Failed to update payment status', 500);
    }

    const enrollment = await ensurePaidCourseEnrollment(studentId, payment);

    return {
      success: true,
      payment,
      enrollment,
    };
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw error;
  }
}

/**
 * Get payment history for a student
 * Queries from payment_records table (for meeting payments)
 * and student_payments table (for course payments)
 */
export async function getPaymentHistory(studentId: string) {
  try {
    // First get the profile ID from clerk_user_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', studentId)
      .single();

    // Query meeting payments from payment_records via meeting_requests join
    // (payment_records doesn't have user_id or student_clerk_id columns)
    const { data: meetingReqs } = await supabase
      .from('meeting_requests')
      .select('id')
      .eq('student_id', studentId);

    const mrIds = (meetingReqs || []).map(r => r.id);
    let meetingPayments: any[] | null = null;
    let meetingError: any = null;

    if (mrIds.length > 0) {
      const result = await supabase
        .from('payment_records')
        .select(`
          id,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          currency,
          status,
          created_at,
          meeting_request_id
        `)
        .in('meeting_request_id', mrIds)
        .order('created_at', { ascending: false });
      meetingPayments = result.data;
      meetingError = result.error;
    }

    if (meetingError) {
      console.error('Error fetching meeting payments:', meetingError);
    }

    // Enrich meeting payments with request/teacher info
    let transformedMeetingPayments: any[] = [];
    if (meetingPayments && meetingPayments.length > 0) {
      const requestIds = meetingPayments.map(p => p.meeting_request_id).filter(Boolean);
      let requestMap: Record<string, any> = {};
      if (requestIds.length > 0) {
        const { data: requests } = await supabase
          .from('meeting_requests')
          .select('id, topic, preferred_date, slot_id')
          .in('id', requestIds);
        if (requests) {
          // Get slot IDs and teacher info
          const slotIds = requests.map(r => r.slot_id).filter(Boolean);
          let teacherMap: Record<string, string> = {};
          if (slotIds.length > 0) {
            const { data: slots } = await supabase
              .from('teacher_slot_availability')
              .select('id, teacher_id')
              .in('id', slotIds);
            if (slots) {
              const teacherIds = [...new Set(slots.map(s => s.teacher_id).filter(Boolean))];
              if (teacherIds.length > 0) {
                const { data: profiles } = await supabase
                  .from('profiles')
                  .select('clerk_user_id, full_name')
                  .in('clerk_user_id', teacherIds);
                if (profiles) {
                  const profileMap = new Map(profiles.map(p => [p.clerk_user_id, p.full_name]));
                  slots.forEach(s => {
                    teacherMap[s.id] = profileMap.get(s.teacher_id) || '';
                  });
                }
              }
            }
          }
          requests.forEach(r => {
            requestMap[r.id] = { ...r, teacher_name: teacherMap[r.slot_id] || null };
          });
        }
      }

      transformedMeetingPayments = meetingPayments.map((p: any) => {
        const req = requestMap[p.meeting_request_id];
        return {
          id: p.id,
          type: 'meeting',
          title: req?.topic || 'Meeting Session',
          teacher_name: req?.teacher_name || null,
          date: req?.preferred_date || null,
          amount: p.amount,
          currency: p.currency || 'INR',
          status: p.status,
          razorpay_order_id: p.razorpay_order_id,
          razorpay_payment_id: p.razorpay_payment_id,
          created_at: p.created_at
        };
      });
    }

    // Query course payments from student_payments (if exists)
    const { data: coursePayments, error: courseError } = await supabase
      .from('student_payments')
      .select(`
        *,
        courses (
          id,
          title,
          description
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (courseError) {
      console.error('Error fetching course payments:', courseError);
      // Continue even if this fails - table might not exist
    }

    // Transform course payments
    const transformedCoursePayments = (coursePayments || []).map((p: any) => ({
      id: p.id,
      type: 'course',
      title: p.courses?.title || 'Course Enrollment',
      course_id: p.course_id,
      amount: p.amount,
      currency: p.currency || 'INR',
      status: p.status,
      razorpay_order_id: p.razorpay_order_id,
      razorpay_payment_id: p.razorpay_payment_id,
      created_at: p.created_at
    }));

    // Combine and sort by date
    const allPayments = [...transformedMeetingPayments, ...transformedCoursePayments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allPayments;
  } catch (error) {
    console.error('Error in getPaymentHistory:', error);
    throw error;
  }
}

/**
 * Generate payment slip data
 */
export async function generatePaymentSlipData(paymentId: string, studentId: string) {
  try {
    const { data: payment, error } = await supabase
      .from('student_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('student_id', studentId)
      .single();

    if (error || !payment) {
      console.error('Error fetching payment:', error);
      throw new Error('Payment not found');
    }

    // Get course info
    let courseTitle = 'N/A';
    if (payment.course_id) {
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', payment.course_id)
        .maybeSingle();
      courseTitle = course?.title || 'N/A';
    }

    // Get student info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('clerk_user_id', studentId)
      .maybeSingle();

    return {
      payment_id: payment.id,
      student_name: profile?.full_name || 'N/A',
      student_email: profile?.email || 'N/A',
      course_title: courseTitle,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.payment_method,
      status: payment.status,
      created_at: payment.created_at,
      completed_at: payment.completed_at,
      transaction_id: payment.razorpay_payment_id || payment.razorpay_order_id
    };
  } catch (error) {
    console.error('Error generating payment slip:', error);
    throw error;
  }
}
