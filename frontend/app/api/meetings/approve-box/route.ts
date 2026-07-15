import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {
  try {
    const { slot_id, meeting_link } = await request.json();

    if (!slot_id || !meeting_link) {
      return NextResponse.json(
        { error: 'Missing slot_id or meeting_link' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Update all bookings for this slot to approved with meeting link
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({
        approval_status: 'approved',
        meeting_link: meeting_link,
        approval_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('teacher_slot_id', slot_id)
      .eq('approval_status', 'pending')
      .eq('payment_status', 'paid')
      .select();

    if (error) {
      console.error('Error approving box:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, approved_count: data?.length || 0 });
  } catch (error) {
    console.error('Error in approve-box API:', error);
    return NextResponse.json(
      { error: 'Failed to approve box' },
      { status: 500 }
    );
  }
}
