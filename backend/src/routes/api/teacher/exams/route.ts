import { NextRequest, NextResponse } from 'next/server';
import { examManagementService } from '@/backend/src/modules/teacher/services/examManagementService';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-clerk-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const exam = await examManagementService.createFinalExam(data, userId);
    return NextResponse.json(exam);
  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create exam' },
      { status: 500 }
    );
  }
}
