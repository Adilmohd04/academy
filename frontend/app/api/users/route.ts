import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    // Create Supabase client with service role key
    const supabase = getSupabaseAdminClient();

    // Fetch all users from the profiles table
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json(users || []);
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
