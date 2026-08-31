import { NextRequest, NextResponse } from 'next/server';
import studentExamService from '@/backend/src/modules/student/services/studentExamService';
import {
  hasAccessResponse,
  requireQuestionForExam,
  requireStudentSubmissionAccess,
} from '@/lib/server/examAccess';
import { isAuthorizationFailure, requireRole } from '@/lib/server/authorization';

export async function POST(req: NextRequest) {
  try {
    const authorization = await requireRole(['student']);
    if (isAuthorizationFailure(authorization)) {
      return authorization.response;
    }

    const data = (await req.json()) as {
      submission_id?: unknown;
      question_id?: unknown;
      student_answer?: string;
      selected_option_id?: string;
      uploaded_file_url?: string;
    };
    if (typeof data.submission_id !== 'string' || typeof data.question_id !== 'string') {
      return NextResponse.json(
        { error: 'submission_id and question_id are required' },
        { status: 400 },
      );
    }

    const submissionAccess = await requireStudentSubmissionAccess(
      authorization.actor.profileId,
      data.submission_id,
    );
    if (hasAccessResponse(submissionAccess)) {
      return submissionAccess.response;
    }

    const questionAccess = await requireQuestionForExam(
      submissionAccess.value.examId,
      data.question_id,
    );
    if (hasAccessResponse(questionAccess)) {
      return questionAccess.response;
    }

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
