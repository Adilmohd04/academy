import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // Fetch all meeting bookings with teacher slot details
    const { data: requests, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get student and teacher profiles for each request
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (req: any) => {
        // Fetch student profile
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('clerk_user_id', req.student_id)
          .single();

        // Fetch teacher profile
        const { data: teacherProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('clerk_user_id', req.teacher_id)
          .single();

        // Format the meeting data
        const slotData = req.teacher_slot_availability;
        const timeSlot = slotData?.time_slots;
        
        return {
          id: req.id,
          student_id: req.student_id,
          teacher_id: req.teacher_id,
          student_name: req.student_name || 'Unknown',
          student_email: req.student_email || '',
          teacher_name: teacherProfile?.full_name || 'Unknown',
          teacher_email: teacherProfile?.email || '',
          status: req.approval_status || 'pending',
          meeting_date: req.meeting_date || slotData?.date || null,
          meeting_time: timeSlot?.start_time && timeSlot?.end_time 
            ? `${formatTime(timeSlot.start_time)} - ${formatTime(timeSlot.end_time)}`
            : null,
          payment_status: req.payment_status || 'pending',
          amount: req.payment_amount || 0,
          created_at: req.created_at,
          notes: req.notes || '',
          topic: slotData?.topic || 'General Meeting',
        };
      })
    );

    return NextResponse.json(enrichedRequests);
  } catch (error) {
    console.error('Error in /api/meetings/all:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatTime(time: string): string {
  if (!time) return '';
  
  // Handle HH:MM:SS format
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  
  return `${formattedHour}:${minutes} ${ampm}`;
}
