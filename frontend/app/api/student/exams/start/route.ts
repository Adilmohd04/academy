import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';
import { hasAccessResponse, requireStudentExamAccess } from '@/lib/server/examAccess';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function POST(req: NextRequest) {
  try {
    const authorization = await requireRole(['student']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const data = (await req.json()) as { exam_id?: unknown };
    if (typeof data.exam_id !== 'string') {
      return NextResponse.json({ error: 'exam_id is required' }, { status: 400 });
    }

    const examAccess = await requireStudentExamAccess(
      authorization.actor.userId,
      data.exam_id,
    );
    if (hasAccessResponse(examAccess)) {
      return examAccess.response;
    }

    const result = await studentExamService.startExamAttempt({
      exam_id: data.exam_id,
      // final_exam_submissions.student_id is a profiles.id UUID in the
      // supported final-exam schema; the profile was resolved from Clerk on
      // the server above.
      student_id: authorization.actor.profileId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error starting exam:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start exam' },
      { status: 500 }
    );
  }
}
