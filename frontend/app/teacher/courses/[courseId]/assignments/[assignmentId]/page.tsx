'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Assignment {
  id: string;
  title: string;
  content_url?: string; // Instructions
  assignment_type: 'audio' | 'video' | 'document' | 'pdf';
  deadline?: string;
  is_published: boolean;
}

interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  submission_url?: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'graded';
}

export default function AssignmentViewPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;
  const assignmentId = params.assignmentId as string;
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && assignmentId) {
      void fetchData();
    }
  }, [courseId, assignmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const headers = { Authorization: `Bearer ${token}` };

      // The course builder stores assignment activities as lessons.  The old
      // page called a non-existent `/teacher/lessons/:id` endpoint and then
      // looked for a separate legacy assignment record, so every builder
      // link landed on an empty state.  Use the canonical lesson-based
      // submissions endpoint instead and select this lesson from its payload.
      const response = await fetch(
        `${API}/api/teacher/courses/${courseId}/assignment-submissions`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Unable to load assignment submissions.');
      }

      const data = await response.json();
      const lesson = (data.assignments || []).find(
        (item: any) => item.lesson_id === assignmentId
      );

      if (!lesson) {
        setAssignment(null);
        setSubmissions([]);
        return;
      }

      setAssignment({
        id: lesson.lesson_id,
        title: lesson.title || 'Assignment',
        content_url: lesson.instructions || lesson.description || undefined,
        assignment_type: lesson.assignment_type || 'document',
        deadline: lesson.deadline || undefined,
        is_published: lesson.is_published !== false,
      });

      const assignmentSubmissions: Submission[] = (
        (data.submissions || [])
          .filter((submission: any) => submission.lesson_id === assignmentId)
          .map((submission: any) => ({
            ...submission,
            submission_url: submission.file_url || submission.link_url || undefined,
            status: submission.status === 'graded' ? 'graded' : 'pending',
          }))
      );
      setSubmissions(assignmentSubmissions);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const res = await fetch(
        `${API}/api/teacher/courses/${courseId}/submissions/${submissionId}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ grade, feedback })
        }
      );

      if (res.ok) {
        fetchData(); // Refresh submissions
      }
    } catch (error) {
      console.error('Error grading submission:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Assignment Not Found</h2>
          <p className="text-gray-600 mb-6">The assignment you're looking for doesn't exist.</p>
          <Link
            href={`/teacher/courses/${courseId}/builder`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course Builder
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/teacher/courses/${courseId}/builder`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course Builder
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className={`px-3 py-1 rounded-full font-medium ${
                  assignment.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {assignment.is_published ? '✓ Published' : 'Draft'}
                </span>
                {assignment.deadline && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(assignment.deadline).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
                <p className="text-sm text-gray-600">Total Submissions</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-600">Pending Review</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{gradedCount}</p>
                <p className="text-sm text-gray-600">Graded</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {assignment.content_url && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{assignment.content_url}</p>
          </div>
        )}

        {/* Submissions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Student Submissions</h2>
          </div>
          
          {submissions.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <div key={submission.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{submission.student_name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          submission.status === 'graded' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {submission.status === 'graded' ? '✓ Graded' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Submitted: {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                      {submission.submission_url ? (
                        <a
                          href={submission.submission_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          View Submission
                        </a>
                      ) : (
                        <p className="text-sm text-gray-500">Text submission</p>
                      )}
                      {submission.grade !== undefined && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">Grade: {submission.grade}/100</p>
                          {submission.feedback && (
                            <p className="text-sm text-gray-600 mt-1">{submission.feedback}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
