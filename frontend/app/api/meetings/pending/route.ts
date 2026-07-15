import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();

    // Fetch pending meeting bookings with teacher slot details
    const { data: requests, error: requestsError } = await supabase
      .from('meeting_bookings')
      .select(`
        *,
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
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching meeting requests:', requestsError);
      return NextResponse.json({ error: requestsError.message }, { status: 400 });
    }

    // Fetch student and teacher details separately
    const studentIds = Array.from(new Set(requests?.map((request: any) => request.student_id) || []));
    const teacherIds = Array.from(new Set(requests?.map((request: any) => request.teacher_id) || []));

    const [studentsRes, teachersRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', studentIds),
      supabase
        .from('profiles')
        .select('clerk_user_id, full_name, email')
        .in('clerk_user_id', teacherIds),
    ]);

    // Create lookup maps
    const studentsMap = new Map(
      studentsRes.data?.map((s: any) => [s.clerk_user_id, s]) || []
    );
    const teachersMap = new Map(
      teachersRes.data?.map((t: any) => [t.clerk_user_id, t]) || []
    );

    // Enrich requests with user details and slot information
    const enrichedRequests = (requests || []).map((request: any) => {
      const slotData = request.teacher_slot_availability;
      const timeSlot = slotData?.time_slots;
      
      return {
        id: request.id,
        student_id: request.student_id,
        teacher_id: request.teacher_id,
        teacher_slot_id: request.teacher_slot_id,
        student_name: request.student_name || studentsMap.get(request.student_id)?.full_name || 'Unknown Student',
        student_email: request.student_email || studentsMap.get(request.student_id)?.email || '',
        teacher_name: teachersMap.get(request.teacher_id)?.full_name || 'Unknown Teacher',
        teacher_email: teachersMap.get(request.teacher_id)?.email || '',
        status: request.approval_status || 'pending',
        created_at: request.created_at,
        notes: request.notes || '',
        // Add meeting date/time info from teacher_slot_availability and time_slots
        meeting_date: request.meeting_date || slotData?.date || null,
        start_time: timeSlot?.start_time || null,
        end_time: timeSlot?.end_time || null,
        topic: slotData?.topic || 'General Meeting',
        is_free: slotData?.is_free || false,
        payment_status: request.payment_status || 'pending',
        amount: request.payment_amount || 0,
      };
    });

    return NextResponse.json(enrichedRequests);
  } catch (error) {
    console.error('Error in pending meetings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id and status' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('meeting_bookings')
      .update({ 
        approval_status: status,
        rejection_reason: notes || null,
        approval_date: status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating meeting request:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in pending meetings PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
