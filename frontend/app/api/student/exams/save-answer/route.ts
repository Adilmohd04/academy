import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-clerk-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const result = await studentExamService.saveAnswer({
      submission_id: data.submission_id,
      question_id: data.question_id,
      student_answer: data.student_answer,
      selected_option_id: data.selected_option_id,
      uploaded_file_url: data.uploaded_file_url
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving answer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save answer' },
      { status: 500 }
    );
  }
}
