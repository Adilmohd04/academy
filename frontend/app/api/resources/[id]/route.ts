import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';


const supabase = getSupabaseAdminClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const userRole = user.publicMetadata?.role as string;

    // Check if resource exists and who owns it
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Allow delete if admin or owner
    if (userRole !== 'admin' && resource.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting resource:', error);
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
