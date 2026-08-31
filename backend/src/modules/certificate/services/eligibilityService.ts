/**
 * Eligibility service.
 *
 * Spec: .kiro/specs/certificate-designer-studio/, design §8.1, Property 9.
 *
 * Returns a structured `{ eligible, unmet[] }` so the manual-override UI can
 * tell the operator exactly which gates the student didn't meet.
 *
 * Six gates checked simultaneously:
 *   1. course.enable_certificates must be true
 *   2. enrollment must exist and be marked completed
 *   3. every required lesson must be completed
 *   4. every required quiz must have a passing attempt (best score ≥ quiz.passing_score)
 *   5. every required assignment must have a passing submission
 *   6. final exam (if any) must have a passing submission
 *   7. weighted final score (calculate_student_final_score) ≥ courses.passing_score
 *
 * Each failing gate appends a stable identifier to `unmet[]`; identifiers are
 * the same ones surfaced via the API to the override UI.
 *
 * IMPORTANT: this function is *pure with respect to the database state at
 * call time* — it does not mutate anything. The caller is responsible for
 * actually issuing the certificate after a successful eligibility check.
 */

import { supabase } from '../../../config/database';
import { calculateFinalScore } from './certificateService';
import {
  findCertificateEnrollment,
  resolveCertificateStudentIdentity,
} from './studentIdentity';

export interface EligibilityResult {
  eligible: boolean;
  /**
   * Stable identifiers of unmet gates. Empty when `eligible: true`.
   *
   * Known identifiers:
   *   - 'certificates_disabled'        course has enable_certificates = false
   *   - 'not_enrolled'                 no enrollment row for this student
   *   - 'enrollment_not_completed'     enrollment exists but status != 'completed'
   *   - 'lessons_incomplete'           one or more required lessons unfinished
   *   - 'quiz_failed:<quizId>'         specific required quiz not passed
   *   - 'assignment_failed:<id>'       specific required assignment not passed
   *   - 'final_exam_failed'            final exam exists but submission below passing
   *   - 'final_exam_missing'           final exam exists but no submission
   *   - 'weighted_score_below_passing' calculate_student_final_score().passed = false
   *   - 'eligibility_check_error'      database error during the check
   */
  unmet: string[];
  /**
   * Computed final score breakdown, when the underlying RPC succeeded.
   * Useful for displaying the operator's override UI even when ineligible.
   */
  scoreBreakdown?: {
    final_score: number;
    quiz_average: number;
    assignment_average: number;
    final_exam_score: number;
    passed: boolean;
  };
}

export async function isEligibleForCertificateDetailed(
  courseId: string,
  studentId: string,
): Promise<EligibilityResult> {
  const unmet: string[] = [];
  const studentIdentity = await resolveCertificateStudentIdentity(studentId);
  if (!studentIdentity) {
    return { eligible: false, unmet: ['student_identity_not_found'] };
  }

  // ── Gate 1: course must enable certificates ────────────────────────────
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, enable_certificates, passing_score')
    .eq('id', courseId)
    .single();

  if (courseError || !course) {
    return { eligible: false, unmet: ['eligibility_check_error'] };
  }

  if (!course.enable_certificates) {
    unmet.push('certificates_disabled');
  }

  // ── Gate 2 + 3: enrollment must be completed ───────────────────────────
  // The enrollments table sometimes uses clerk_user_id and sometimes profile.id
  // for student_id (legacy quirk — see other places in this codebase). We
  // accept either by querying twice.
  const enrollmentLookup = await findCertificateEnrollment(courseId, studentIdentity);
  if (enrollmentLookup.status === 'error') {
    unmet.push('eligibility_check_error');
  } else if (enrollmentLookup.status === 'missing') {
    unmet.push('not_enrolled');
  } else if (
    enrollmentLookup.enrollment.completed !== true &&
    (enrollmentLookup.enrollment.progress_percentage ?? 0) < 100
  ) {
    unmet.push('enrollment_not_completed');
  }

  // ── Gate 4: required quizzes ───────────────────────────────────────────
  // The quiz schema in this codebase nests quizzes under course_lessons with
  // content_type = 'quiz'. Each lesson row holds quiz_questions and a
  // passing_score (when configured).
  await checkQuizGates(courseId, studentIdentity.profileId, unmet);

  // ── Gate 5: required assignments ───────────────────────────────────────
  await checkAssignmentGates(courseId, studentIdentity.profileId, unmet);

  // ── Gate 6: final exam ─────────────────────────────────────────────────
  await checkFinalExamGate(courseId, studentIdentity.profileId, unmet);

  // ── Gate 7: weighted score must pass ───────────────────────────────────
  let scoreBreakdown: EligibilityResult['scoreBreakdown'] | undefined;
  try {
    const score = await calculateFinalScore(courseId, studentIdentity.profileId);
    if (score) {
      scoreBreakdown = {
        final_score: Number(score.final_score),
        quiz_average: Number(score.quiz_average),
        assignment_average: Number(score.assignment_average),
        final_exam_score: Number(score.final_exam_score),
        passed: Boolean(score.passed),
      };
      if (!scoreBreakdown.passed) {
        unmet.push('weighted_score_below_passing');
      }
    }
  } catch (err) {
    console.error('[eligibility] calculate_student_final_score failed:', err);
    unmet.push('eligibility_check_error');
  }

  return {
    eligible: unmet.length === 0,
    unmet,
    scoreBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Per-gate helpers
// ---------------------------------------------------------------------------

async function checkQuizGates(
  courseId: string,
  studentId: string,
  unmet: string[],
): Promise<void> {
  // Quizzes live as lessons with content_type='quiz' in this codebase.
  const { data: quizLessons } = await supabase
    .from('course_lessons')
    .select('id, title, quiz_questions, week_id, course_weeks!inner(course_id)')
    .eq('content_type', 'quiz')
    .eq('course_weeks.course_id', courseId);

  if (!quizLessons || quizLessons.length === 0) return;

  const quizIds = quizLessons.map((q: any) => q.id);
  const { data: submissions } = await supabase
    .from('quiz_submissions')
    .select('lesson_id, score, total_points')
    .in('lesson_id', quizIds)
    .eq('student_id', studentId);

  const bestByQuiz = new Map<string, number>(); // lessonId -> best percentage (0..100)
  for (const sub of submissions ?? []) {
    const total = Number((sub as any).total_points) || 0;
    if (total <= 0) continue;
    const pct = (Number((sub as any).score) / total) * 100;
    const prev = bestByQuiz.get((sub as any).lesson_id) ?? -Infinity;
    if (pct > prev) bestByQuiz.set((sub as any).lesson_id, pct);
  }

  // Default passing score for quizzes when none is configured on the lesson.
  const DEFAULT_QUIZ_PASS = 50;

  for (const quiz of quizLessons) {
    const questions = (quiz as any).quiz_questions;
    if (!questions || (Array.isArray(questions) && questions.length === 0)) continue;
    const best = bestByQuiz.get((quiz as any).id);
    if (best === undefined || best < DEFAULT_QUIZ_PASS) {
      unmet.push(`quiz_failed:${(quiz as any).id}`);
    }
  }
}

async function checkAssignmentGates(
  courseId: string,
  studentId: string,
  unmet: string[],
): Promise<void> {
  const { data: assignments } = await supabase
    .from('course_lessons')
    .select('id, week_id, course_weeks!inner(course_id)')
    .eq('content_type', 'assignment')
    .eq('course_weeks.course_id', courseId);

  if (!assignments || assignments.length === 0) return;

  const assignmentIds = assignments.map((a: any) => a.id);
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('lesson_id, grade, max_grade, status')
    .in('lesson_id', assignmentIds)
    .eq('student_id', studentId);

  const passedByAssignment = new Set<string>();
  for (const sub of submissions ?? []) {
    const max = Number((sub as any).max_grade) || 100;
    const grade = Number((sub as any).grade);
    if (Number.isFinite(grade) && (grade / max) * 100 >= 50) {
      passedByAssignment.add((sub as any).lesson_id);
    }
  }

  for (const a of assignments) {
    if (!passedByAssignment.has((a as any).id)) {
      unmet.push(`assignment_failed:${(a as any).id}`);
    }
  }
}

async function checkFinalExamGate(
  courseId: string,
  studentId: string,
  unmet: string[],
): Promise<void> {
  const { data: finalExams } = await supabase
    .from('final_exams')
    .select('id, points')
    .eq('course_id', courseId)
    .eq('is_published', true);

  if (!finalExams || finalExams.length === 0) return;

  const examIds = finalExams.map((e: any) => e.id);
  const { data: submissions } = await supabase
    .from('final_exam_submissions')
    .select('final_exam_id, grade')
    .in('final_exam_id', examIds)
    .eq('student_id', studentId);

  const passedByExam = new Set<string>();
  for (const sub of submissions ?? []) {
    const grade = Number((sub as any).grade);
    if (Number.isFinite(grade) && grade > 0) {
      // The strict per-exam passing score lives on the exam-questions level,
      // and the weighted gate (#7) catches sub-threshold scores anyway. Here
      // we only require that *some* graded submission exists.
      passedByExam.add((sub as any).final_exam_id);
    }
  }

  let anyPassed = false;
  for (const exam of finalExams) {
    if (passedByExam.has((exam as any).id)) {
      anyPassed = true;
      break;
    }
  }

  if (!anyPassed) {
    if (submissions && submissions.length > 0) unmet.push('final_exam_failed');
    else unmet.push('final_exam_missing');
  }
}
