import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all meetings with payment status 'paid'
    const { data: meetings, error } = await supabase
      .from('meeting_bookings')
      .select(`
        id,
        meeting_date,
        payment_amount,
        payment_status,
        approval_status,
        created_at,
        student_name,
        student_email,
        teacher_id,
        teacher_slot_availability!teacher_slot_id (
          date,
          topic,
          is_free,
          time_slots!time_slot_id (
            start_time,
            end_time
          )
        )
      `)
      .eq('payment_status', 'paid')
      .order('meeting_date', { ascending: false });

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch teacher names
    const teacherIds = [...new Set(meetings?.map((m: any) => m.teacher_id) || [])];
    const { data: teachers } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', teacherIds);

    const teachersMap = new Map(teachers?.map(t => [t.clerk_user_id, t]) || []);

    // Transform data to include teacher info and time slot details
    const transformedMeetings = meetings?.map((meeting: any) => {
      const teacher = teachersMap.get(meeting.teacher_id);
      const slot = meeting.teacher_slot_availability;
      const timeSlot = slot?.time_slots;

      return {
        id: meeting.id,
        student_name: meeting.student_name,
        student_email: meeting.student_email,
        teacher_name: teacher?.full_name || 'Unknown',
        teacher_email: teacher?.email || '',
        meeting_date: slot?.date || meeting.meeting_date,
        start_time: timeSlot?.start_time || '',
        end_time: timeSlot?.end_time || '',
        topic: slot?.topic || '',
        payment_amount: meeting.payment_amount || 0,
        payment_status: meeting.payment_status,
        approval_status: meeting.approval_status,
        created_at: meeting.created_at
      };
    }) || [];

    return NextResponse.json(transformedMeetings);
  } catch (error) {
    console.error('Error in all-meetings API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}
