import { NextResponse } from 'next/server';

import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import {
  hasResourceInputError,
  parseResourceInput,
} from '@/lib/server/resourceValidation';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type ResourceOwner = {
  created_by: string | null;
};

export async function PUT(
  request: Request,
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = parseResourceInput(body);
    if (hasResourceInputError(parsed)) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: resource, error: lookupError } = await supabase
      .from('resources')
      // created_by is the resource ownership field, not user_id.
      .select('created_by')
      .eq('id', resourceId)
      .maybeSingle();

    if (lookupError) {
      console.error('Unable to look up resource for update:', lookupError);
      return NextResponse.json({ error: 'Unable to update resource' }, { status: 500 });
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

    // The owner predicate is repeated in the write to prevent a TOCTOU race.
    // Only validated, editable fields are included in parsed.value.
    let updateQuery = supabase
      .from('resources')
      .update(parsed.value)
      .eq('id', resourceId);

    if (authorization.actor.role !== 'admin') {
      updateQuery = updateQuery.eq('created_by', authorization.actor.userId);
    }

    const { data, error } = await updateQuery
      .select()
      .maybeSingle();

    if (error) {
      console.error('Unable to update resource:', error);
      return NextResponse.json({ error: 'Failed to update resource' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Resource update failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
