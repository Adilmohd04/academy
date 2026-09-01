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
    const { teacher_id, is_free } = body;

    console.log('📝 Updating teacher free status:', { teacher_id, is_free, type: typeof is_free });

    if (!teacher_id || is_free === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: teacher_id and is_free' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // First, verify the current value
    const { data: before } = await supabase
      .from('profiles')
      .select('clerk_user_id, email, is_free')
      .eq('clerk_user_id', teacher_id)
      .single();
    
    console.log('📊 Before update:', before);

    // Update teacher free status in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_free })
      .eq('clerk_user_id', teacher_id)
      .select();

    if (error) {
      console.error('❌ Error updating teacher free status in profiles:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ALSO update teacher_pricing table (if record exists)
    const { error: pricingError } = await supabase
      .from('teacher_pricing')
      .update({ 
        is_free,
        price_per_meeting: is_free ? 0 : 100,
        notes: is_free ? 'FREE meeting offer' : 'Default pricing'
      })
      .eq('teacher_id', teacher_id);

    if (pricingError) {
      console.log('⚠️ Note: teacher_pricing update failed (may not exist):', pricingError.message);
      // Don't fail the request if teacher_pricing doesn't exist
    } else {
      console.log('✅ Also updated teacher_pricing table');
    }

    // Verify the update
    const { data: after } = await supabase
      .from('profiles')
      .select('clerk_user_id, email, is_free')
      .eq('clerk_user_id', teacher_id)
      .single();
    
    console.log('📊 After update:', after);
    console.log('✅ Teacher free status updated successfully:', data);
    
    return NextResponse.json({ success: true, data, before, after });
  } catch (error) {
    console.error('Error in teacher free API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
