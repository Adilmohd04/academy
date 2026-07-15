import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdminClient();

type AdminProfile = {
  id?: string;
  role: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('clerk_user_id', userId)
      .single();

    const profile = profileData as AdminProfile | null;

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, link, link_text } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const { data, error } = await ((supabase.from('announcements') as any)
      .insert([
        {
          title,
          content,
          link,
          link_text,
          created_by: profile.id,
          is_active: true,
        },
      ])
      .select()
      .single());

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('clerk_user_id', userId)
      .single();

    const profile = profileData as AdminProfile | null;

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
