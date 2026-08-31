import { supabase } from '../../../config/database';

/**
 * Certificate records and enrollments use a Clerk user ID, while the legacy
 * grading tables and calculate_student_final_score RPC use profiles.id UUIDs.
 * Resolve both server-side from either identifier before crossing that
 * boundary.
 */
export interface CertificateStudentIdentity {
  clerkUserId: string;
  profileId: string;
}

export type CertificateEnrollmentLookup =
  | { status: 'found'; enrollment: any }
  | { status: 'missing' }
  | { status: 'error' };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveCertificateStudentIdentity(
  identifier: string,
): Promise<CertificateStudentIdentity | null> {
  const normalized = identifier.trim();
  if (!normalized) return null;

  // Clerk IDs are text, so this lookup is always safe. Current portal routes
  // and the canonical certificates table use this as the stable student ID.
  const { data: byClerk, error: clerkError } = await supabase
    .from('profiles')
    .select('id, clerk_user_id')
    .eq('clerk_user_id', normalized)
    .maybeSingle();

  if (clerkError) {
    console.error('[certificate] failed to resolve student by Clerk ID:', clerkError);
    return null;
  }

  if (byClerk?.id && byClerk.clerk_user_id) {
    return { profileId: byClerk.id, clerkUserId: byClerk.clerk_user_id };
  }

  // Do not send a non-UUID Clerk ID to the profiles.id UUID column. This
  // fallback keeps final-exam grading hooks, which naturally hold profiles.id,
  // compatible with the canonical issuer.
  if (!UUID_PATTERN.test(normalized)) return null;

  const { data: byProfileId, error: profileError } = await supabase
    .from('profiles')
    .select('id, clerk_user_id')
    .eq('id', normalized)
    .maybeSingle();

  if (profileError) {
    console.error('[certificate] failed to resolve student by profile ID:', profileError);
    return null;
  }

  if (!byProfileId?.id || !byProfileId.clerk_user_id) return null;
  return { profileId: byProfileId.id, clerkUserId: byProfileId.clerk_user_id };
}

/**
 * Enrollment installations in the wild predate the Clerk migration. Query the
 * Clerk identity first, then the profile UUID fallback, without ever trusting
 * an identifier supplied by the browser as an authorization decision.
 */
export async function findCertificateEnrollment(
  courseId: string,
  identity: CertificateStudentIdentity,
): Promise<CertificateEnrollmentLookup> {
  const candidates = [...new Set([identity.clerkUserId, identity.profileId])];

  for (const studentId of candidates) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, student_id, completed, progress_percentage')
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      // A pre-Clerk UUID schema rejects a Clerk user ID before the profile-ID
      // fallback can run. That is expected compatibility behavior; all other
      // database failures must fail closed.
      if ((error as any).code === '22P02' && studentId === identity.clerkUserId) {
        continue;
      }
      console.error('[certificate] failed to resolve course enrollment:', error);
      return { status: 'error' };
    }

    if (data) return { status: 'found', enrollment: data };
  }

  return { status: 'missing' };
}
