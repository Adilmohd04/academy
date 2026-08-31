import { NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function GET() {
  try {
    const authorization = await requireRole(['student']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const exams = await studentExamService.getAvailableExams(
      authorization.actor.userId,
      authorization.actor.profileId,
    );
    return NextResponse.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}
