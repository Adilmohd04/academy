import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch time slots with teacher information
    const { data: slots, error } = await supabase
      .from('teacher_slot_availability')
      .select(`
        *,
        profiles!teacher_slot_availability_teacher_id_fkey (
          clerk_user_id,
          full_name,
          email
        )
      `)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching time slots:', error);
      return NextResponse.json([]);
    }

    // Format the data
    const formattedSlots = (slots || []).map((slot: any) => {
      const teacher = slot.profiles;
      return {
        id: slot.id,
        teacher_id: slot.teacher_id,
        teacher_name: teacher?.full_name || 'Unknown Teacher',
        teacher_email: teacher?.email || '',
        date: slot.date,
        start_time: slot.start_time || '',
        end_time: slot.end_time || '',
        day_of_week: slot.day_of_week || '',
        status: slot.is_available ? 'available' : 'unavailable',
        max_capacity: slot.max_capacity || 1,
        current_bookings: slot.current_bookings || 0,
        is_free: slot.is_free || false,
        topic: slot.topic || '',
        description: slot.description || '',
        created_at: slot.created_at,
      };
    });

    return NextResponse.json(formattedSlots);
  } catch (error) {
    console.error('Error in time slots API:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('teacher_slot_availability')
      .insert([body])
      .select();

    if (error) {
      console.error('Error creating time slot:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in time slots POST:', error);
    return NextResponse.json({ error: 'Failed to create time slot' }, { status: 500 });
  }
}
