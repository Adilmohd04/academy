import { NextResponse } from 'next/server';

import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type ResourceOwner = {
  created_by: string | null;
};

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const authorization = await requireRole(['admin', 'teacher']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const resourceId = params.id?.trim();
    if (!resourceId) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: resource, error: lookupError } = await supabase
      .from('resources')
      // created_by is the actual schema field. user_id never existed here.
      .select('created_by')
      .eq('id', resourceId)
      .maybeSingle();

    if (lookupError) {
      console.error('Unable to look up resource for deletion:', lookupError);
      return NextResponse.json({ error: 'Unable to delete resource' }, { status: 500 });
    }

    const owner = resource as ResourceOwner | null;
    if (!owner) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (
      authorization.actor.role !== 'admin' &&
      owner.created_by !== authorization.actor.userId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Repeat the owner condition in the mutation so a race cannot turn a
    // successful ownership check into a delete of another teacher's resource.
    let deleteQuery = supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (authorization.actor.role !== 'admin') {
      deleteQuery = deleteQuery.eq('created_by', authorization.actor.userId);
    }

    const { data: deleted, error } = await deleteQuery
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Unable to delete resource:', error);
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resource deletion failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
