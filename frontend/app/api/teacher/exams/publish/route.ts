import { NextRequest, NextResponse } from 'next/server';
import examManagementService from '@/backend/src/modules/teacher/services/examManagementService';
import { hasAccessResponse, requireTeacherExamAccess } from '@/lib/server/examAccess';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function PUT(req: NextRequest) {
  try {
    const authorization = await requireRole(['teacher', 'admin']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const data = (await req.json()) as {
      exam_id?: unknown;
      is_published?: unknown;
    };
    if (typeof data.exam_id !== 'string' || typeof data.is_published !== 'boolean') {
      return NextResponse.json(
        { error: 'exam_id and is_published are required' },
        { status: 400 },
      );
    }

    const examAccess = await requireTeacherExamAccess(
      authorization.actor,
      data.exam_id,
    );
    if (hasAccessResponse(examAccess)) {
      return examAccess.response;
    }

    const result = await examManagementService.togglePublishExam(
      data.exam_id,
      data.is_published
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error toggling publish:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle publish' },
      { status: 500 }
    );
  }
}
