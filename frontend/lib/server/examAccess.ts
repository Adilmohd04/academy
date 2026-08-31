import 'server-only';

import { NextResponse } from 'next/server';

import type { AuthorizedActor } from '@/lib/server/authorization';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin';

type AccessResult<T> =
  | { value: T }
  | { response: NextResponse };

type CourseRecord = {
  teacher_id: string | null;
};

type ExamRecord = {
  id: string;
  course_id: string;
};

type SubmissionRecord = {
  id: string;
  exam_id: string;
  student_id: string;
  submission_status: string;
};

export const hasAccessResponse = <T>(
  result: AccessResult<T>,
): result is { response: NextResponse } => 'response' in result;

const unauthorizedCourseResponse = () =>
  NextResponse.json({ error: 'Course not found' }, { status: 404 });

/**
 * Courses created before the profile migration can reference either the
 * profile UUID or the Clerk user ID. Accept both while still requiring that
 * the authenticated teacher owns the course.
 */
export async function requireTeacherCourseAccess(
  actor: AuthorizedActor,
  courseId: string,
): Promise<AccessResult<undefined>> {
  if (actor.role === 'admin') {
    return { value: undefined };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('courses')
    .select('teacher_id')
    .eq('id', courseId)
    .maybeSingle();

  if (error) {
    console.error('Unable to check course ownership for final exam:', error);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  const course = data as CourseRecord | null;
  if (
    !course ||
    (course.teacher_id !== actor.profileId && course.teacher_id !== actor.userId)
  ) {
    return { response: unauthorizedCourseResponse() };
  }

  return { value: undefined };
}

export async function requireTeacherExamAccess(
  actor: AuthorizedActor,
  examId: string,
): Promise<AccessResult<{ courseId: string }>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('final_exams')
    .select('id, course_id')
    .eq('id', examId)
    .maybeSingle();

  if (error) {
    console.error('Unable to check final exam access:', error);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  const exam = data as ExamRecord | null;
  if (!exam) {
    return { response: NextResponse.json({ error: 'Exam not found' }, { status: 404 }) };
  }

  const courseAccess = await requireTeacherCourseAccess(actor, exam.course_id);
  if (hasAccessResponse(courseAccess)) {
    return courseAccess;
  }

  return { value: { courseId: exam.course_id } };
}

export async function requireStudentExamAccess(
  studentId: string,
  examId: string,
): Promise<AccessResult<{ courseId: string }>> {
  const supabase = getSupabaseAdminClient();
  const { data: examData, error: examError } = await supabase
    .from('final_exams')
    .select('id, course_id')
    .eq('id', examId)
    .eq('is_published', true)
    .maybeSingle();

  if (examError) {
    console.error('Unable to check final exam availability:', examError);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  const exam = examData as ExamRecord | null;
  if (!exam) {
    return { response: NextResponse.json({ error: 'Exam not found' }, { status: 404 }) };
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('course_id', exam.course_id)
    .eq('student_id', studentId)
    .maybeSingle();

  if (enrollmentError) {
    console.error('Unable to check final exam enrollment:', enrollmentError);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  if (!enrollment) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { value: { courseId: exam.course_id } };
}

export async function requireStudentSubmissionAccess(
  studentProfileId: string,
  submissionId: string,
): Promise<AccessResult<{ examId: string }>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('final_exam_submissions')
    .select('id, exam_id, student_id, submission_status')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) {
    console.error('Unable to check final exam submission ownership:', error);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  const submission = data as SubmissionRecord | null;
  // Final-exam attempts are a legacy UUID-backed resource.  Unlike
  // enrollments (which use Clerk IDs), their migration stores profiles.id.
  // Always compare it with the server-resolved profile ID, never a value from
  // the client or a Clerk ID supplied in a request body/header.
  if (!submission || submission.student_id !== studentProfileId) {
    return { response: NextResponse.json({ error: 'Submission not found' }, { status: 404 }) };
  }

  if (submission.submission_status !== 'in_progress') {
    return {
      response: NextResponse.json(
        { error: 'This exam attempt is no longer editable' },
        { status: 409 },
      ),
    };
  }

  return { value: { examId: submission.exam_id } };
}

export async function requireQuestionForExam(
  examId: string,
  questionId: string,
): Promise<AccessResult<undefined>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from('final_exam_questions')
    .select('id')
    .eq('id', questionId)
    .eq('exam_id', examId)
    .maybeSingle();

  if (error) {
    console.error('Unable to check final exam question:', error);
    return {
      response: NextResponse.json(
        { error: 'Unable to authorize this request' },
        { status: 500 },
      ),
    };
  }

  if (!data) {
    return { response: NextResponse.json({ error: 'Question not found' }, { status: 404 }) };
  }

  return { value: undefined };
}
