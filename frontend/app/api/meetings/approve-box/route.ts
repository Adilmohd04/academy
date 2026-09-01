import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const { slot_id, meeting_link } = await request.json();

    if (typeof slot_id !== 'string' || !slot_id.trim() || typeof meeting_link !== 'string' || !meeting_link.trim()) {
      return NextResponse.json(
        { error: 'Missing slot_id or meeting_link' },
        { status: 400 }
      );
    }

    let approvedMeetingLink: string;
    try {
      const parsed = new URL(meeting_link.trim());
      const isLocalDevelopmentUrl =
        process.env.NODE_ENV !== 'production' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');

      if (parsed.protocol !== 'https:' && !(isLocalDevelopmentUrl && parsed.protocol === 'http:')) {
        throw new Error('Meeting link must use HTTPS');
      }
      approvedMeetingLink = parsed.toString();
    } catch {
      return NextResponse.json(
        { error: 'Provide a valid HTTPS meeting link.' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    // Update all bookings for this slot to approved with meeting link
    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({
        status: 'approved',
        approval_status: 'approved',
        meeting_link: approvedMeetingLink,
        approval_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('teacher_slot_id', slot_id.trim())
      .eq('approval_status', 'pending')
      .in('payment_status', ['paid', 'free'])
      .select();

    if (error) {
      console.error('Error approving box:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.length) {
      return NextResponse.json(
        { error: 'No pending paid or free bookings were found for this slot.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, approved_count: data.length });
  } catch (error) {
    console.error('Error in approve-box API:', error);
    return NextResponse.json(
      { error: 'Failed to approve box' },
      { status: 500 }
    );
  }
}
