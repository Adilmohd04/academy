import { NextResponse } from 'next/server';

import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';
import {
  hasResourceInputError,
  parseOptionalParentId,
  parseResourceInput,
} from '@/lib/server/resourceValidation';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export const dynamic = 'force-dynamic';

type ResourceRecord = {
  created_by: string | null;
  [key: string]: unknown;
};

type ProfileRecord = {
  clerk_user_id: string;
  full_name: string | null;
};

/**
 * The resource list is scoped from the authenticated database role, never a
 * role query parameter supplied by the browser.  Old callers may still send
 * ?role=..., but it is intentionally ignored.
 */
export async function GET() {
  try {
    const authorization = await requireRole(['admin', 'teacher', 'student']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (authorization.actor.role === 'teacher') {
      query = query.eq('created_by', authorization.actor.userId);
    } else if (authorization.actor.role === 'student') {
      query = query.eq('status', 'approved');
    }

    const { data, error } = await query;
    if (error) {
      console.error('Unable to fetch resources:', error);
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
    }

    const resources = (data || []) as ResourceRecord[];
    const creatorIds = Array.from(new Set(
      resources
        .map((resource) => resource.created_by)
        .filter((creatorId): creatorId is string => Boolean(creatorId)),
    ));

    // resources.created_by is a Clerk ID rather than a foreign key. Hydrate
    // display names explicitly instead of relying on a nonexistent relation.
    let names = new Map<string, string | null>();
    if (creatorIds.length) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('clerk_user_id, full_name')
        .in('clerk_user_id', creatorIds);

      if (profilesError) {
        console.warn('Unable to hydrate resource creator names:', profilesError);
      } else {
        names = new Map(
          ((profiles || []) as ProfileRecord[]).map((profile) => [
            profile.clerk_user_id,
            profile.full_name,
          ]),
        );
      }
    }

    return NextResponse.json(
      resources.map((resource) => ({
        ...resource,
        profiles: resource.created_by
          ? { full_name: names.get(resource.created_by) || null }
          : null,
      })),
    );
  } catch (error) {
    console.error('Resource list failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authorization = await requireRole(['admin', 'teacher']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
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

    const parentId = parseOptionalParentId(body);
    if (parentId === undefined) {
      return NextResponse.json({ error: 'Invalid parent resource' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('resources')
        .select('id, created_by, type')
        .eq('id', parentId)
        .maybeSingle();

      if (parentError) {
        console.error('Unable to verify resource parent:', parentError);
        return NextResponse.json({ error: 'Unable to create resource' }, { status: 500 });
      }

      if (!parent || parent.type !== 'folder') {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 400 });
      }

      if (
        authorization.actor.role !== 'admin' &&
        parent.created_by !== authorization.actor.userId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('resources')
      .insert({
        ...parsed.value,
        parent_id: parentId,
        // Never accept an owner or approval status from the caller.
        created_by: authorization.actor.userId,
        status: authorization.actor.role === 'admin' ? 'approved' : 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Unable to create resource:', error);
      return NextResponse.json({ error: 'Failed to create resource' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Resource creation failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
