import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { NextRequest, NextResponse } from 'next/server';



export async function DELETE(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const body = await request.json();
    const userId = body.user_id || body.clerk_user_id || body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Delete user from profiles table (cascade should handle related records)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('clerk_user_id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE user API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
