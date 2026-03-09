/**
 * Admin Payment Controller
 * Handles payment verification and management
 */

import { Request, Response } from 'express';
import { supabase } from '../../../config/database';

/**
 * Get all payments with filters
 * GET /api/admin/payments
 */
export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      search, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Step 1: Fetch payments with basic course info (no FK joins for profiles)
    let query = supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          course_image_url
        ),
        enrollments (
          id,
          payment_verified,
          student_id
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by date range
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    
    query = query.range(from, to);

    const { data: payments, error, count } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return res.status(500).json({ error: 'Failed to fetch payments' });
    }

    // Step 2: Get student profiles for enrollments
    // student_id in enrollments is clerk_user_id (text), NOT profiles.id (UUID)
    const clerkUserIds = [...new Set(
      (payments || [])
        .flatMap((p: any) => (p.enrollments || []).map((e: any) => e.student_id))
        .filter(Boolean)
    )];

    let profilesMap: Record<string, any> = {};
    if (clerkUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, clerk_user_id, full_name, email')
        .in('clerk_user_id', clerkUserIds);
      
      if (profiles) {
        profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
          acc[p.clerk_user_id] = p;
          return acc;
        }, {});
      }
    }

    // Step 3: Attach profile data to enrollments
    const paymentsWithProfiles = (payments || []).map((payment: any) => {
      const enrollmentsWithProfiles = (payment.enrollments || []).map((enrollment: any) => ({
        ...enrollment,
        profiles: profilesMap[enrollment.student_id] || null
      }));
      return {
        ...payment,
        enrollments: enrollmentsWithProfiles
      };
    });

    // Search filter (client-side for simplicity)
    let filteredPayments = paymentsWithProfiles;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredPayments = filteredPayments.filter((p: any) => 
        p.courses?.title?.toLowerCase().includes(searchLower) ||
        p.enrollments?.[0]?.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        p.enrollments?.[0]?.profiles?.email?.toLowerCase().includes(searchLower) ||
        p.razorpay_payment_id?.toLowerCase().includes(searchLower)
      );
    }

    // Calculate stats
    const stats = await calculatePaymentStats();

    res.json({
      success: true,
      payments: filteredPayments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      },
      stats
    });
  } catch (error: any) {
    console.error('Error in getAllPayments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get payment by ID
 * GET /api/admin/payments/:paymentId
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

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
          payment_verified,
          payment_verified_at,
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

    // Step 3: Get student profiles for enrollments
    const studentIds = (payment.enrollments || [])
      .map((e: any) => e.student_id)
      .filter(Boolean);

    let studentProfilesMap: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, clerk_id')
        .in('id', studentIds);
      
      if (profiles) {
        studentProfilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    // Step 4: Build response with profiles attached
    const paymentWithProfiles = {
      ...payment,
      courses: payment.courses ? {
        ...payment.courses,
        profiles: teacherProfile
      } : null,
      enrollments: (payment.enrollments || []).map((enrollment: any) => ({
        ...enrollment,
        profiles: studentProfilesMap[enrollment.student_id] || null
      }))
    };

    res.json({ success: true, payment: paymentWithProfiles });
  } catch (error: any) {
    console.error('Error in getPaymentById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify payment manually
 * POST /api/admin/payments/:paymentId/verify
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const adminClerkId = (req as any).auth?.userId;

    // Get admin profile
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', adminClerkId)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Admin profile not found' });
    }

    // Update enrollment verification
    const { data: payment } = await supabase
      .from('payments')
      .select('id, enrollments(id)')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.enrollments && payment.enrollments.length > 0) {
      const enrollmentId = (payment.enrollments as any)[0].id;
      
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({
          payment_verified: true,
          payment_verified_by: adminProfile.id,
          payment_verified_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (updateError) {
        console.error('Error updating enrollment:', updateError);
        return res.status(500).json({ error: 'Failed to verify payment' });
      }
    }

    res.json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error: any) {
    console.error('Error in verifyPayment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refund payment
 * POST /api/admin/payments/:paymentId/refund
 */
export const refundPayment = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    // Get current payment data
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('payment_data')
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Update payment status to refunded
    const updatedPaymentData = {
      ...(payment.payment_data || {}),
      refund_reason: reason || 'Admin refund',
      refunded_at: new Date().toISOString()
    };

    const { error: paymentError } = await supabase
      .from('payments')
      .update({ 
        status: 'failed',
        payment_data: updatedPaymentData
      })
      .eq('id', paymentId);

    if (paymentError) {
      console.error('Error updating payment:', paymentError);
      return res.status(500).json({ error: 'Failed to refund payment' });
    }

    // Cancel enrollment
    const { error: enrollmentError } = await supabase
      .from('enrollments')
      .update({ payment_status: 'refunded' })
      .eq('payment_id', paymentId);

    if (enrollmentError) {
      console.error('Error updating enrollment:', enrollmentError);
    }

    res.json({
      success: true,
      message: 'Payment refunded successfully'
    });
  } catch (error: any) {
    console.error('Error in refundPayment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Calculate payment statistics
 */
async function calculatePaymentStats() {
  try {
    // Total revenue (successful payments)
    const { data: successPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'success')
      .not('course_id', 'is', null);

    const totalRevenue = successPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

    // Pending payments count
    const { count: pendingCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Failed payments count
    const { count: failedCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'success')
      .not('course_id', 'is', null)
      .gte('created_at', today.toISOString());

    const todayRevenue = todayPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;

    return {
      totalRevenue,
      pendingCount: pendingCount || 0,
      failedCount: failedCount || 0,
      todayRevenue
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {
      totalRevenue: 0,
      pendingCount: 0,
      failedCount: 0,
      todayRevenue: 0
    };
  }
}
