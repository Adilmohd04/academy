import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';
import { hasAccessResponse, requireStudentSubmissionAccess } from '@/lib/server/examAccess';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function POST(req: NextRequest) {
  try {
    const authorization = await requireRole(['student']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const data = (await req.json()) as { submission_id?: unknown };
    if (typeof data.submission_id !== 'string') {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
    }

    const submissionAccess = await requireStudentSubmissionAccess(
      authorization.actor.profileId,
      data.submission_id,
    );
    if (hasAccessResponse(submissionAccess)) {
      return submissionAccess.response;
    }

    const result = await studentExamService.submitExam(data.submission_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit exam' },
      { status: 500 }
    );
  }
}
