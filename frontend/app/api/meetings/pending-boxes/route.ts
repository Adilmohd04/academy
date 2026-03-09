import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all slots that have pending bookings (approved OR pending)
    const { data: bookings, error: bookingsError } = await supabase
      .from('meeting_bookings')
      .select(`
        id,
        student_name,
        student_email,
        student_phone,
        notes,
        teacher_slot_id,
        approval_status,
        payment_status,
        meeting_link,
        created_at
      `)
      .in('approval_status', ['pending', 'approved'])
      .in('payment_status', ['paid', 'free'])
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json([]);
    }

    // Get slot IDs
    const slotIds = [...new Set(bookings.map(b => b.teacher_slot_id))];

    // Get slots with their details - ONLY UPCOMING (today or future)
    const today = new Date().toISOString().split('T')[0];
    const { data: slots, error: slotsError } = await supabase
      .from('teacher_slot_availability')
      .select(`
        id,
        date,
        max_capacity,
        current_bookings,
        is_unlimited,
        deadline_utc,
        teacher_id,
        topic,
        description,
        is_free,
        time_slots!time_slot_id (
          slot_name,
          start_time,
          end_time
        )
      `)
      .in('id', slotIds)
      .gte('date', today);

    if (slotsError) {
      console.error('Error fetching slots:', slotsError);
      return NextResponse.json({ error: slotsError.message }, { status: 500 });
    }

    // Get teacher profiles
    const teacherIds = [...new Set(slots?.map(s => s.teacher_id) || [])];
    const { data: teachers } = await supabase
      .from('profiles')
      .select('clerk_user_id, full_name, email')
      .in('clerk_user_id', teacherIds);

    const teachersMap = new Map(teachers?.map(t => [t.clerk_user_id, t]) || []);
    const slotsMap = new Map(slots?.map(s => [s.id, s]) || []);

    // Group bookings by slot
    const slotBoxes = Array.from(
      bookings.reduce((acc, booking) => {
        const slotId = booking.teacher_slot_id;
        if (!acc.has(slotId)) {
          acc.set(slotId, []);
        }
        acc.get(slotId)!.push(booking);
        return acc;
      }, new Map<string, typeof bookings>())
    ).map(([slotId, slotBookings]) => {
      const slot = slotsMap.get(slotId);
      if (!slot) return null;

      const teacher = teachersMap.get(slot.teacher_id);
      const timeSlot = Array.isArray(slot.time_slots) ? slot.time_slots[0] : slot.time_slots;
      
      // Check if box is closed (deadline passed OR capacity full)
      const deadline = slot.deadline_utc ? new Date(slot.deadline_utc) : null;
      const now = new Date();
      const isDeadlinePassed = deadline ? now >= deadline : false;
      const isCapacityFull = !slot.is_unlimited && (slot.current_bookings >= slot.max_capacity);
      const isClosed = isDeadlinePassed || isCapacityFull;

      // Check if meeting date has passed (MISSED)
      const meetingDate = new Date(slot.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      meetingDate.setHours(0, 0, 0, 0);
      const isMissed = meetingDate < today;

      // Check if already has meeting link
      const hasMeetingLink = slotBookings.some(b => b.meeting_link);
      const existingMeetingLink = slotBookings.find(b => b.meeting_link)?.meeting_link || null;

      // Count pending vs approved
      const pendingCount = slotBookings.filter(b => b.approval_status === 'pending').length;
      const approvedCount = slotBookings.filter(b => b.approval_status === 'approved').length;
      
      // ACTUAL bookings = number of students in this box (not database column)
      const actualBookings = slotBookings.length;

      return {
        slot_id: slotId,
        teacher_name: teacher?.full_name || 'Unknown Teacher',
        teacher_email: teacher?.email || '',
        meeting_date: slot.date,
        start_time: timeSlot?.start_time || '',
        end_time: timeSlot?.end_time || '',
        slot_name: timeSlot?.slot_name || '',
        topic: slot.topic || '',
        description: slot.description || '',
        is_free_slot: slot.is_free || false,
        max_capacity: slot.max_capacity,
        is_unlimited: slot.is_unlimited,
        booking_deadline: slot.deadline_utc || '',
        current_bookings: actualBookings,
        pending_count: pendingCount,
        approved_count: approvedCount,
        is_closed: isClosed,
        is_capacity_full: isCapacityFull,
        is_deadline_passed: isDeadlinePassed,
        is_missed: isMissed,
        meeting_link: existingMeetingLink,
        has_meeting_link: hasMeetingLink,
        students: slotBookings.map(b => ({
          booking_id: b.id,
          name: b.student_name,
          email: b.student_email,
          phone: b.student_phone || '',
          notes: b.notes || '',
          approval_status: b.approval_status,
          payment_status: b.payment_status,
          created_at: b.created_at
        }))
      };
    }).filter(Boolean);

    console.log(`Found ${slotBoxes.length} boxes with pending/approved bookings`);
    return NextResponse.json(slotBoxes);
  } catch (error) {
    console.error('Error in pending-boxes API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending boxes' },
      { status: 500 }
    );
  }
}
