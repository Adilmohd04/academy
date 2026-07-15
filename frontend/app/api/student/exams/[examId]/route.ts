import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';

export async function GET(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const userId = req.headers.get('x-clerk-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exam = await studentExamService.getExamForStudent(params.examId, userId);
    return NextResponse.json(exam);
  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exam' },
      { status: 500 }
    );
  }
}
