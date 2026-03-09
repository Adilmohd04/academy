'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { Upload, FileText, ArrowLeft, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_points: number;
  attachments?: string[];
}

interface Submission {
  id: string;
  submitted_at: string;
  content: string;
  attachments?: string[];
  grade?: number;
  feedback?: string;
}

export default function SubmitAssignmentPage() {
  const { userId } = useAuth();
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (userId && assignmentId) {
      fetchAssignment();
      fetchSubmission();
    }
  }, [userId, assignmentId]);

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignmentId}`, {
        headers: { 'Authorization': `Bearer ${userId}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignment(data);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmission = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignmentId}/submission`, {
        headers: { 'Authorization': `Bearer ${userId}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSubmission(data);
          setContent(data.content || '');
        }
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach(file => formData.append('files', file));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userId}` },
        body: formData
      });

      if (res.ok) {
        alert('Assignment submitted successfully!');
        router.back();
      } else {
        alert('Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
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
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-700">Assignment not found</h2>
      </div>
    );
  }

  const dueDate = new Date(assignment.due_date);
  const now = new Date();
  const isOverdue = dueDate < now;
  const isSubmitted = !!submission;
  const isGraded = submission?.grade !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-purple-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Course
        </button>

        {/* Assignment Details */}
        <IslamicCard className="p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{assignment.title}</h1>
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>
                  <Clock className="w-4 h-4" />
                  <span>Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2 text-purple-600">
                  <FileText className="w-4 h-4" />
                  <span>{assignment.max_points} points</span>
                </div>
              </div>
            </div>

            {isSubmitted && (
              <div className={`px-4 py-2 rounded-lg font-semibold ${
                isGraded
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {isGraded ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Graded: {submission.grade}/{assignment.max_points}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Submitted
                  </div>
                )}
              </div>
            )}
          </div>

          {isOverdue && !isSubmitted && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">This assignment is overdue</p>
                <p className="text-sm text-red-600">Late submissions may receive reduced credit</p>
              </div>
            </div>
          )}

          <div className="prose max-w-none mb-6">
            <p className="text-slate-700 whitespace-pre-wrap">{assignment.description}</p>
          </div>

          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="border-t border-slate-200 pt-4">
              <h3 className="font-semibold text-slate-800 mb-3">Assignment Materials</h3>
              <div className="space-y-2">
                {assignment.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Attachment {idx + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </IslamicCard>

        {/* Graded Feedback */}
        {isGraded && submission?.feedback && (
          <IslamicCard className="p-6 mb-6 bg-gradient-to-br from-green-50 to-emerald-50">
            <h2 className="text-xl font-bold text-green-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              Teacher Feedback
            </h2>
            <div className="bg-white rounded-lg p-4">
              <p className="text-slate-700 whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          </IslamicCard>
        )}

        {/* Submission Form */}
        {!isGraded && (
          <IslamicCard className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {isSubmitted ? 'Update Submission' : 'Submit Assignment'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Your Response
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your response here..."
                  rows={10}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Attachments (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOC, DOCX, images up to 10MB
                    </p>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <FileText className="w-4 h-4" />
                        <span>{file.name}</span>
                        <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isSubmitted && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You already submitted this assignment on{' '}
                    {new Date(submission.submitted_at).toLocaleString()}. Submitting again will update your submission.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isSubmitted ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </IslamicCard>
        )}

        {/* Previous Submission View */}
        {isGraded && submission && (
          <IslamicCard className="p-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Your Submission</h2>
            <div className="bg-slate-50 rounded-lg p-6">
              <p className="text-sm text-slate-500 mb-4">
                Submitted on {new Date(submission.submitted_at).toLocaleString()}
              </p>
              <div className="prose max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">{submission.content}</p>
              </div>

              {submission.attachments && submission.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {submission.attachments.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Attachment {idx + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </IslamicCard>
        )}
      </div>
    </div>
  );
}
