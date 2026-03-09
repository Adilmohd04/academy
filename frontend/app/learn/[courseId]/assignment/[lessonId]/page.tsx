'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ClipboardList, Upload, CheckCircle, Loader2, FileText, Calendar } from 'lucide-react';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date?: string;
  max_points?: number;
}

interface Submission {
  id: string;
  content: string;
  submitted_at: string;
  grade?: number;
  feedback?: string;
}

export default function AssignmentPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const lessonId = params?.lessonId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userId && lessonId) {
      fetchAssignment();
    }
  }, [userId, lessonId]);

  const fetchAssignment = async () => {
    try {
      const [assignmentRes, submissionRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${lessonId}`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${lessonId}/submission`, {
          headers: { 'x-clerk-user-id': userId || '' }
        })
      ]);

      if (assignmentRes.ok) {
        const assignmentData = await assignmentRes.json();
        setAssignment(assignmentData);
      }

      if (submissionRes.ok) {
        const submissionData = await submissionRes.json();
        setSubmission(submissionData);
        setContent(submissionData.content || '');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${lessonId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ content, courseId })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmission(data);
        alert('Assignment submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <IslamicCard className="p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-700">Assignment not found</h2>
        </IslamicCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Assignment Details */}
        <IslamicCard className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{assignment.title}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                {assignment.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                {assignment.max_points && (
                  <span className="font-medium">Max Points: {assignment.max_points}</span>
                )}
              </div>
            </div>
          </div>

          <div className="prose max-w-none">
            <p className="text-slate-700">{assignment.description}</p>
          </div>
        </IslamicCard>

        {/* Submission Status */}
        {submission && (
          <IslamicCard className="p-6 mb-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Submitted</h3>
            </div>
            <p className="text-sm text-green-700">
              Submitted on {new Date(submission.submitted_at).toLocaleString()}
            </p>
            {submission.grade !== undefined && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="font-semibold text-green-900">Grade: {submission.grade}/{assignment.max_points}</p>
                {submission.feedback && (
                  <p className="text-sm text-green-800 mt-2">{submission.feedback}</p>
                )}
              </div>
            )}
          </IslamicCard>
        )}

        {/* Submission Form */}
        <IslamicCard className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Your Submission</h3>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!!submission}
            placeholder="Type your answer here..."
            className="w-full min-h-[300px] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
        </IslamicCard>

        {/* Actions */}
        <div className="flex justify-between">
          <IslamicButton
            variant="secondary"
            onClick={() => router.push(`/learn/${courseId}`)}
          >
            Back to Course
          </IslamicButton>
          {!submission && (
            <IslamicButton
              variant="primary"
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Assignment
                </>
              )}
            </IslamicButton>
          )}
        </div>
      </div>
    </div>
  );
}
