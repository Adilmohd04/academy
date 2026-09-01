import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { NextRequest, NextResponse } from 'next/server';



export async function POST(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const body = await request.json();
    const { slot_id, is_free, meeting_price } = body;

    console.log('📝 Updating slot pricing:', { slot_id, is_free, meeting_price });

    if (!slot_id) {
      return NextResponse.json(
        { error: 'Missing required field: slot_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Build update object based on what's provided
    const updateData: any = {};
    if (is_free !== undefined) {
      updateData.is_free = is_free;
    }
    if (meeting_price !== undefined) {
      updateData.meeting_price = meeting_price;
    }

    // Update slot pricing in teacher_slot_availability table
    const { data, error } = await supabase
      .from('teacher_slot_availability')
      .update(updateData)
      .eq('id', slot_id)
      .select();

    if (error) {
      console.error('❌ Error updating slot pricing:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('✅ Slot pricing updated successfully:', data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in slot pricing API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
