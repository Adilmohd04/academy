import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';
import { hasAccessResponse, requireStudentExamAccess } from '@/lib/server/examAccess';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function GET(
  _request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authorization = await requireRole(['student']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const examAccess = await requireStudentExamAccess(
      authorization.actor.userId,
      params.examId,
    );
    if (hasAccessResponse(examAccess)) {
      return examAccess.response;
    }

    const exam = await studentExamService.getExamForStudent(
      params.examId,
      authorization.actor.userId,
    );
    return NextResponse.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exam' },
      { status: 500 }
    );
  }
}
