import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-clerk-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const exams = await studentExamService.getAvailableExams(userId);
    return NextResponse.json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}
