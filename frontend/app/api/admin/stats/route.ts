import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdminClient();

export async function GET(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    // Keep the compact meeting metrics consumed by the main admin home while
    // also returning the complete shape used by /admin/dashboard. This avoids
    // a second, missing dashboard stats endpoint and keeps both views in sync.
    const [
      totalCoursesResult,
      publishedCoursesResult,
      totalStudentsResult,
      successfulPaymentsResult,
      pendingApprovalsResult,
    ] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('payments').select('amount').eq('status', 'success'),
      supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending_approval'),
    ]);

    const totalCourses = totalCoursesResult.count || 0;
    const publishedCourses = publishedCoursesResult.count || 0;
    const totalRevenue = (successfulPaymentsResult.data || []).reduce(
      (sum: number, payment: { amount?: number | string | null }) => sum + Number(payment.amount || 0),
      0,
    );

    // Get slots that have pending bookings (pending boxes)
    const { data: pendingSlots, error: slotsError } = await supabase
      .from('teacher_slot_availability')
      .select(`
        id,
        date
      `)
      .gte('date', new Date().toISOString().split('T')[0]);

    if (slotsError) {
      console.error('Error fetching pending slots:', slotsError);
    }

    // Get pending bookings
    const slotIds = pendingSlots?.map(s => s.id) || [];
    let pendingBoxCount = 0;
    
    if (slotIds.length > 0) {
      const { data: pendingBookings, error: bookingsError } = await supabase
        .from('meeting_bookings')
        .select('teacher_slot_id')
        .in('teacher_slot_id', slotIds)
        .eq('approval_status', 'pending')
        .eq('payment_status', 'paid');

      if (bookingsError) {
        console.error('Error fetching pending bookings:', bookingsError);
      }

      // Count unique slots with pending bookings (number of boxes)
      const uniqueSlots = new Set(pendingBookings?.map(b => b.teacher_slot_id) || []);
      pendingBoxCount = uniqueSlots.size;
    }

    // Get count of total time slots
    const { count: slotsCount } = await supabase
      .from('teacher_slot_availability')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      pending: pendingBoxCount,
      total_slots: slotsCount || 0,
      stats: {
        totalCourses,
        publishedCourses,
        draftCourses: Math.max(0, totalCourses - publishedCourses),
        totalStudents: totalStudentsResult.count || 0,
        totalRevenue,
        pendingApprovals: pendingApprovalsResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
