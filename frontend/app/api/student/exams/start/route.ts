import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-clerk-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const result = await studentExamService.startExamAttempt({
      exam_id: data.exam_id,
      student_id: userId
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
