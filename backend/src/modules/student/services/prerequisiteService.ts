/**
 * Canonical course prerequisite gate.
 *
 * Three enrollment paths previously disagreed about prerequisites:
 *   - routes/enrollments.ts      enforced them, but only for free courses
 *   - courseEnrollmentService    selected prerequisite_courses and ignored it
 *   - paymentService             had no prerequisite logic at all
 *
 * The practical result was that paying for a course bypassed the gate. All
 * three now route through checkPrerequisites() so the rule lives in one place.
 *
 * Source of truth is `courses.prerequisite_courses` — the array the teacher
 * course builder actually writes. The legacy `course_prerequisites` join table
 * is created by migrations but written by nothing, so it is deliberately not
 * consulted; reading it is what made the browse-page check always pass.
 */

import { supabase } from '../../../config/database';
import { resolveCertificateStudentIdentity } from '../../certificate/services/studentIdentity';

/** Postgres: relation does not exist. */
const UNDEFINED_TABLE = '42P01';
/** Postgres: invalid text representation (Clerk text ID against a UUID column). */
const INVALID_TEXT_REPRESENTATION = '22P02';

export interface PrerequisiteResult {
  satisfied: boolean;
  /** Courses the student still needs. Empty when `satisfied` is true. */
  missing: Array<{ id: string; title: string }>;
}

export class PrerequisiteCheckError extends Error {}

/**
 * Installations disagree on how a finished enrollment is recorded: some set
 * `status = 'completed'`, others a `completed` boolean, others only a progress
 * figure. 001_create_course_management_system.sql even notes that `completed`
 * may not exist. Accept any of them rather than referencing a column that may
 * be absent — a WHERE clause on a missing column errors and would block every
 * enrollment.
 */
function isCompletedEnrollment(enrollment: any): boolean {
  if (!enrollment) return false;
  if (enrollment.status === 'completed') return true;
  if (enrollment.completed === true) return true;
  const progress = Number(enrollment.progress_percentage ?? enrollment.progress);
  return Number.isFinite(progress) && progress >= 100;
}

/**
 * Pure core of the gate, split out so the satisfaction rule is testable
 * without a database. A prerequisite is satisfied when the student completed
 * the named course *or* any course sharing its equivalence group.
 */
export function resolveMissingPrerequisites(
  requiredCourseIds: string[],
  acceptableByRequired: Map<string, Set<string>>,
  completedCourseIds: Set<string>,
): string[] {
  return requiredCourseIds.filter((requiredId) => {
    const acceptable = acceptableByRequired.get(requiredId) ?? new Set([requiredId]);
    for (const candidate of acceptable) {
      if (completedCourseIds.has(candidate)) return false;
    }
    return true;
  });
}

/**
 * Expand each required course into the set of courses that satisfy it.
 *
 * Equivalence is modelled as a shared `group_key` rather than pairwise links,
 * so "Python Fundamentals 2024 Batch" and "Python Fundamentals Weekend" both
 * satisfy a "Python Fundamentals" prerequisite without needing transitive
 * closure over pairs.
 *
 * Degrades to identity-only mapping when the table is absent, so enrollment
 * keeps working before 20260729_course_equivalences.sql is applied.
 */
async function buildEquivalenceMap(
  requiredCourseIds: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>(
    requiredCourseIds.map((id) => [id, new Set([id])]),
  );

  const { data: ownGroups, error: ownError } = await supabase
    .from('course_equivalences')
    .select('course_id, group_key')
    .in('course_id', requiredCourseIds);

  if (ownError) {
    if ((ownError as any).code === UNDEFINED_TABLE) return map;
    throw new PrerequisiteCheckError('Unable to resolve course equivalences');
  }

  const groupKeys = [...new Set((ownGroups ?? []).map((row: any) => row.group_key).filter(Boolean))];
  if (groupKeys.length === 0) return map;

  const { data: members, error: memberError } = await supabase
    .from('course_equivalences')
    .select('course_id, group_key')
    .in('group_key', groupKeys);

  if (memberError) {
    throw new PrerequisiteCheckError('Unable to resolve course equivalences');
  }

  const membersByGroup = new Map<string, string[]>();
  for (const row of members ?? []) {
    const bucket = membersByGroup.get((row as any).group_key) ?? [];
    bucket.push((row as any).course_id);
    membersByGroup.set((row as any).group_key, bucket);
  }

  for (const row of ownGroups ?? []) {
    const acceptable = map.get((row as any).course_id);
    if (!acceptable) continue;
    for (const memberId of membersByGroup.get((row as any).group_key) ?? []) {
      acceptable.add(memberId);
    }
  }

  return map;
}

/**
 * Enrollment rows key students by Clerk ID in some installs and profiles.id in
 * others. Query both aliases, tolerating the type error a Clerk ID produces
 * against a UUID column.
 */
async function findCompletedCourseIds(
  studentAliases: string[],
  candidateCourseIds: string[],
): Promise<Set<string>> {
  const completed = new Set<string>();

  for (const studentId of studentAliases) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', studentId)
      .in('course_id', candidateCourseIds);

    if (error) {
      if ((error as any).code === INVALID_TEXT_REPRESENTATION) continue;
      throw new PrerequisiteCheckError('Unable to verify completed prerequisite courses');
    }

    for (const enrollment of data ?? []) {
      if (isCompletedEnrollment(enrollment)) completed.add((enrollment as any).course_id);
    }
  }

  return completed;
}

/**
 * Throws PrerequisiteCheckError on infrastructure failure so the gate fails
 * closed — callers must not treat an unreadable database as "satisfied".
 *
 * @param studentIdentifier Clerk user ID or profiles.id; both are resolved.
 */
export async function checkPrerequisites(
  courseId: string,
  studentIdentifier: string,
): Promise<PrerequisiteResult> {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('prerequisite_courses')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    throw new PrerequisiteCheckError('Unable to load course prerequisites');
  }

  const requiredCourseIds = [
    ...new Set(
      (Array.isArray(course?.prerequisite_courses) ? course!.prerequisite_courses : [])
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];

  if (requiredCourseIds.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const identity = await resolveCertificateStudentIdentity(studentIdentifier);
  // An unresolvable student cannot have completed anything; fail closed rather
  // than silently waving the gate through.
  const studentAliases = identity
    ? [...new Set([identity.clerkUserId, identity.profileId])]
    : [studentIdentifier];

  const acceptableByRequired = await buildEquivalenceMap(requiredCourseIds);
  const candidateCourseIds = [
    ...new Set([...acceptableByRequired.values()].flatMap((set) => [...set])),
  ];

  const completedCourseIds = await findCompletedCourseIds(studentAliases, candidateCourseIds);
  const missingIds = resolveMissingPrerequisites(
    requiredCourseIds,
    acceptableByRequired,
    completedCourseIds,
  );

  if (missingIds.length === 0) {
    return { satisfied: true, missing: [] };
  }

  const { data: missingCourses } = await supabase
    .from('courses')
    .select('id, title')
    .in('id', missingIds);

  const titleById = new Map((missingCourses ?? []).map((row: any) => [row.id, row.title]));

  return {
    satisfied: false,
    missing: missingIds.map((id) => ({ id, title: titleById.get(id) || 'Unknown course' })),
  };
}

/** Shared 403 payload so all three enrollment paths report this identically. */
export function prerequisiteErrorPayload(missing: PrerequisiteResult['missing']) {
  const titles = missing.map((course) => course.title).join(', ');
  return {
    error: 'Prerequisites not met',
    message: `You must complete the following course(s) before enrolling: ${titles}`,
    missing_prerequisites: missing,
  };
}
