import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabase = getSupabaseAdminClient();

export async function POST(request: NextRequest) {
  try {
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
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
          created_by: authorization.actor.profileId,
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
    const authorization = await requireRole(['admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
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
