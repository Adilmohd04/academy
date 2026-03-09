import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}