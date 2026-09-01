import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';



export async function GET(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!teacherId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: slots, error } = await supabase
      .from('teacher_slot_availability')
      .select(`
        id,
        date,
        max_capacity,
        current_bookings,
        is_available,
        is_free,
        meeting_price,
        topic,
        notes,
        time_slots!time_slot_id (
          start_time,
          end_time
        ),
        meeting_bookings (
          payment_status,
          payment_amount
        )
      `)
      .eq('teacher_id', teacherId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching slots:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(slots || []);
  } catch (error) {
    console.error('Error in teacher-slots API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    );
  }
}
