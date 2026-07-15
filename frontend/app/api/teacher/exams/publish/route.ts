import { NextRequest, NextResponse } from 'next/server';
import { examManagementService } from '@/backend/src/modules/teacher/services/examManagementService';

export async function PUT(req: NextRequest) {
  try {
    const userId = req.headers.get('x-clerk-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
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
