import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

export type AcademyRole = 'admin' | 'teacher' | 'student';

type ProfileRole = {
  id: string;
  role: AcademyRole | null;
};

export type AuthorizedActor = {
  userId: string;
  profileId: string;
  role: AcademyRole;
};

type AuthorizationSuccess = {
  actor: AuthorizedActor;
};

type AuthorizationFailure = {
  response: NextResponse;
};

export type AuthorizationResult = AuthorizationSuccess | AuthorizationFailure;

const academyRoles: readonly AcademyRole[] = ['admin', 'teacher', 'student'];

const isAcademyRole = (role: string | null): role is AcademyRole =>
  Boolean(role && academyRoles.includes(role as AcademyRole));

/**
 * Authenticates the Clerk session and resolves the current role from the
 * application profile. Roles in the database are used for authorization so a
 * stale browser session or Clerk metadata update cannot grant an old role.
 */
export async function requireRole(
  allowedRoles: readonly AcademyRole[],
): Promise<AuthorizationResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Unable to resolve the authenticated user role:', error);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  const profile = data as ProfileRole | null;
  if (!profile || !isAcademyRole(profile.role) || !allowedRoles.includes(profile.role)) {
    return {
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return {
    actor: {
      userId,
      profileId: profile.id,
      role: profile.role,
    },
  };
}

export const isAuthorizationFailure = (
  result: AuthorizationResult,
): result is AuthorizationFailure => 'response' in result;
