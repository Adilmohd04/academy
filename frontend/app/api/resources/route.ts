import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdminClient();

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const clerkUserId = user.id;

    // Get the profile ID from Clerk user ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileId = profileData.id;

    let query = supabase
      .from('resources')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    // If admin, they can see everything (or filter by status in UI)
    if (role === 'admin') {
      // No extra filter needed
    } 
    // If teacher, they see their own uploads
    else if (role === 'teacher') {
      query = query.eq('created_by', clerkUserId);
    }
    // If student (or others), they only see approved resources
    else {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, type, url, category, parent_id } = body;
    const userRole = user.publicMetadata?.role as string;

    // Admins are auto-approved, others are pending
    const status = userRole === 'admin' ? 'approved' : 'pending';

    const { data, error } = await supabase
      .from('resources')
      .insert([
        {
          title,
          description: description || '',
          type,
          url,
          category: category || 'General',
          status,
          created_by: user.id,
          parent_id: parent_id || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating resource:', error);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
