'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, AlertCircle, Download, X } from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

interface Assignment {
  id: string;
  lesson_id: string;
  title: string;
  description: string;
  instructions?: string;
  due_date?: string;
  max_score: number;
  allowed_file_types?: string[];
  max_file_size_mb?: number;
}

interface Submission {
  id: string;
  submitted_at: string;
  file_url?: string;
  file_name?: string;
  text_submission?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
  graded_at?: string;
}

export default function AssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [textSubmission, setTextSubmission] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignment();
  }, [lessonId]);

  const fetchAssignment = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}/assignment`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch assignment');

      const data = await response.json();
      setAssignment(data.assignment);
      setSubmission(data.submission);

      if (data.submission?.text_submission) {
        setTextSubmission(data.submission.text_submission);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (assignment?.allowed_file_types && assignment.allowed_file_types.length > 0) {
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      if (!assignment.allowed_file_types.includes(fileExtension)) {
        alert(`Please upload a file of type: ${assignment.allowed_file_types.join(', ')}`);
        return;
      }
    }

    // Validate file size
    const maxSize = (assignment?.max_file_size_mb || 10) * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      alert(`File size must be less than ${assignment?.max_file_size_mb || 10}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file && !textSubmission.trim()) {
      alert('Please provide a file or text submission');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('textSubmission', textSubmission);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}/assignment/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Failed to submit assignment');

      const data = await response.json();
      setSubmission(data.submission);
      setFile(null);
      alert('Assignment submitted successfully!');
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();
  const canSubmit = !submission || submission.status === 'returned';

  if (loading) return <IslamicLoader />;
  if (!assignment) return <div className="text-center py-20">Assignment not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <Link
          href={`/student/courses/${courseId}/player`}
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Course
        </Link>

        {/* Assignment Details */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-6">
            <h1 className="text-3xl font-bold text-white mb-2">{assignment.title}</h1>
            {assignment.due_date && (
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
                isOverdue ? 'bg-red-500/20' : 'bg-white/20'
              }`}>
                <Clock className="w-4 h-4 text-white" />
                <span className="text-white text-sm">
                  Due: {new Date(assignment.due_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700 leading-relaxed">{assignment.description}</p>
            </div>

            {assignment.instructions && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Instructions
                </h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {assignment.instructions}
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 text-sm text-gray-600 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="font-medium">Max Score:</span>
                <span>{assignment.max_score} points</span>
              </div>
              {assignment.allowed_file_types && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Allowed Files:</span>
                  <span>{assignment.allowed_file_types.join(', ')}</span>
                </div>
              )}
              {assignment.max_file_size_mb && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Max Size:</span>
                  <span>{assignment.max_file_size_mb}MB</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submission Status */}
        {submission && (
          <div className={`mb-6 p-6 rounded-2xl border-2 ${
            submission.status === 'graded'
              ? 'bg-emerald-50 border-emerald-200'
              : submission.status === 'returned'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {submission.status === 'graded' ? 'Graded' : submission.status === 'returned' ? 'Returned - Resubmit' : 'Submitted'}
                </h3>
                <p className="text-sm text-gray-600">
                  Submitted: {new Date(submission.submitted_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {submission.status === 'graded' && submission.score !== undefined && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="text-2xl font-bold text-gray-900">
                      {submission.score}/{assignment.max_score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {Math.round((submission.score / assignment.max_score) * 100)}%
                  </p>
                </div>
              )}
            </div>

            {submission.file_name && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Submitted File:</p>
                <a
                  href={submission.file_url}
                  download={submission.file_name}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{submission.file_name}</span>
                </a>
              </div>
            )}

            {submission.text_submission && submission.status !== 'returned' && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Text Submission:</p>
                <div className="p-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
                  {submission.text_submission}
                </div>
              </div>
            )}

            {submission.feedback && (
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-2">Teacher Feedback:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}
          </div>
        )}

        {/* Submission Form */}
        {canSubmit && !isOverdue && (
          <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white">
                {submission?.status === 'returned' ? 'Resubmit Assignment' : 'Submit Assignment'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload File {assignment.allowed_file_types && `(${assignment.allowed_file_types.join(', ')})`}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept={assignment.allowed_file_types?.join(',')}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex flex-col items-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <span className="text-sm font-medium text-gray-900 mb-1">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500">
                      Max size: {assignment.max_file_size_mb || 10}MB
                    </span>
                  </label>
                  {file && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      <button
                        onClick={() => setFile(null)}
                        className="ml-2 text-gray-500 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Submission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Submission (Optional)
                </label>
                <textarea
                  value={textSubmission}
                  onChange={(e) => setTextSubmission(e.target.value)}
                  placeholder="Add notes, links, or written answers here..."
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none min-h-[200px] resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={uploading || (!file && !textSubmission.trim())}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Submit Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Overdue Message */}
        {isOverdue && !submission && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Assignment Overdue</h3>
            <p className="text-gray-600">
              The due date for this assignment has passed. Please contact your teacher if you need an extension.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
