import { NextRequest, NextResponse } from 'next/server';
import examManagementService from '@/backend/src/modules/teacher/services/examManagementService';
import { hasAccessResponse, requireTeacherCourseAccess } from '@/lib/server/examAccess';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function GET(
  _request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const authorization = await requireRole(['teacher', 'admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const courseAccess = await requireTeacherCourseAccess(
      authorization.actor,
      params.courseId,
    );
    if (hasAccessResponse(courseAccess)) {
      return courseAccess.response;
    }

    const exam = await examManagementService.getFinalExamByCourseId(params.courseId);
    return NextResponse.json(exam || {});
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exam' },
      { status: 500 }
    );
  }
}
