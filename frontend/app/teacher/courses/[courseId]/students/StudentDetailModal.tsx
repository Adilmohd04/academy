'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  X, FileText, CheckCircle, Clock, AlertCircle, XCircle,
  Calendar, TrendingUp, Award, BookOpen
} from 'lucide-react';

interface QuizAttempt {
  id: string;
  attempted_at: string;
  score: number;
  percentage: number;
  passed: boolean;
  status: string;
}

interface Quiz {
  quiz_id: string;
  quiz_title: string;
  deadline: string | null;
  max_attempts: number;
  total_questions: number;
  max_score: number;
  attempts: QuizAttempt[];
  best_score: number | null;
  attempts_count: number;
}

interface AssignmentSubmission {
  id: string;
  submitted_at: string;
  grade: number | null;
  percentage: number | null;
  feedback: string | null;
  status: string;
  submission_url: string | null;
}

interface Assignment {
  assignment_id: string;
  assignment_title: string;
  deadline: string | null;
  max_points: number;
  submission: AssignmentSubmission | null;
}

interface TrackingData {
  student: {
    id: string;
    name: string;
    email: string;
    enrolled_at: string;
    progress_percentage: number;
    completed: boolean;
  };
  quizzes: Quiz[];
  assignments: Assignment[];
  summary: {
    quiz_average: number | null;
    assignment_average: number | null;
    total_average: number | null;
    certificate_eligible: boolean;
    total_quizzes: number;
    completed_quizzes: number;
    total_assignments: number;
    submitted_assignments: number;
    graded_assignments: number;
  };
}

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  courseId: string;
  studentName: string;
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  studentId,
  courseId,
  studentName
}: StudentDetailModalProps) {
  const { userId } = useAuth();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'assignments' | 'summary'>('summary');

  useEffect(() => {
    if (isOpen && userId) {
      fetchTrackingData();
    }
  }, [isOpen, studentId, courseId, userId]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses/${courseId}/students/${studentId}/tracking`,
        {
          headers: {
            'x-clerk-user-id': userId || '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      } else {
        console.error('Failed to fetch tracking data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{studentName}</h2>
            <p className="text-purple-100 mt-1">Detailed Progress Tracking</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'summary'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Summary
              </div>
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'quizzes'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Quizzes ({trackingData?.summary.total_quizzes || 0})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'assignments'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Assignments ({trackingData?.summary.total_assignments || 0})
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : trackingData ? (
            <>
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 font-medium">Quiz Average</p>
                          <p className="text-3xl font-bold text-green-900 mt-1">
                            {trackingData.summary.quiz_average !== null
                              ? `${trackingData.summary.quiz_average.toFixed(1)}%`
                              : 'N/A'}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {trackingData.summary.completed_quizzes}/{trackingData.summary.total_quizzes} completed
                          </p>
                        </div>
                        <BookOpen className="w-10 h-10 text-green-600 opacity-20" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-700 font-medium">Assignment Average</p>
                          <p className="text-3xl font-bold text-purple-900 mt-1">
                            {trackingData.summary.assignment_average !== null
                              ? `${trackingData.summary.assignment_average.toFixed(1)}%`
                              : 'N/A'}
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            {trackingData.summary.graded_assignments}/{trackingData.summary.total_assignments} graded
                          </p>
                        </div>
                        <FileText className="w-10 h-10 text-purple-600 opacity-20" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 font-medium">Total Average</p>
                          <p className="text-3xl font-bold text-blue-900 mt-1">
                            {trackingData.summary.total_average !== null
                              ? `${trackingData.summary.total_average.toFixed(1)}%`
                              : 'N/A'}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {trackingData.summary.certificate_eligible ? (
                              <span className="flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                Certificate eligible
                              </span>
                            ) : (
                              'Not eligible for certificate'
                            )}
                          </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-blue-600 opacity-20" />
                      </div>
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Student Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{trackingData.student.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Enrolled:</span>
                        <span className="font-medium">
                          {new Date(trackingData.student.enrolled_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Progress:</span>
                        <span className="font-medium">{trackingData.student.progress_percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${trackingData.student.completed ? 'text-green-600' : 'text-blue-600'}`}>
                          {trackingData.student.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quizzes Tab */}
              {activeTab === 'quizzes' && (
                <div className="space-y-4">
                  {trackingData.quizzes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p>No quizzes available for this course yet.</p>
                    </div>
                  ) : (
                    trackingData.quizzes.map((quiz) => (
                      <div key={quiz.quiz_id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{quiz.quiz_title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>{quiz.total_questions} questions</span>
                              <span>Max score: {quiz.max_score}</span>
                              {quiz.deadline && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {new Date(quiz.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {quiz.best_score !== null ? (
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                              Best: {quiz.best_score.toFixed(1)}%
                            </div>
                          ) : (
                            <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                              MISSED
                            </div>
                          )}
                        </div>

                        {/* Quiz Attempts */}
                        {quiz.attempts.length === 0 ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-red-700 font-semibold">
                              <XCircle className="w-5 h-5" />
                              MISSED — Not Taken
                            </div>
                            <p className="text-xs text-red-500 mt-1">This quiz was not attempted. Score counts as 0%.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                              Attempts ({quiz.attempts_count}/{quiz.max_attempts})
                            </p>
                            <div className="space-y-2">
                              {quiz.attempts.map((attempt, index) => (
                                <div
                                  key={attempt.id}
                                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-medium text-sm">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                          {attempt.score} / {quiz.max_score}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          ({attempt.percentage.toFixed(1)}%)
                                        </span>
                                        {attempt.passed ? (
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <AlertCircle className="w-4 h-4 text-red-600" />
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(attempt.attempted_at).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    attempt.status === 'graded'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {attempt.status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Assignments Tab */}
              {activeTab === 'assignments' && (
                <div className="space-y-4">
                  {trackingData.assignments.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p>No assignments available for this course yet.</p>
                    </div>
                  ) : (
                    trackingData.assignments.map((assignment) => (
                      <div key={assignment.assignment_id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{assignment.assignment_title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>Max points: {assignment.max_points}</span>
                              {assignment.deadline && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Due: {new Date(assignment.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {assignment.submission?.grade !== null && (
                            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                              Grade: {assignment.submission.grade}/{assignment.max_points}
                            </div>
                          )}
                        </div>

                        {/* Submission */}
                        {!assignment.submission ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Not submitted yet</span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                Submitted on{' '}
                                {new Date(assignment.submission.submitted_at).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                assignment.submission.status === 'graded'
                                  ? 'bg-green-100 text-green-800'
                                  : assignment.submission.status === 'submitted'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {assignment.submission.status}
                              </div>
                            </div>

                            {assignment.submission.grade !== null && (
                              <div className="space-y-2">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-lg font-bold text-gray-900">
                                    {assignment.submission.grade} / {assignment.max_points}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    ({assignment.submission.percentage?.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${assignment.submission.percentage || 0}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {assignment.submission.feedback && (
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-gray-700 mb-1">Teacher Feedback:</p>
                                <p className="text-sm text-gray-900">{assignment.submission.feedback}</p>
                              </div>
                            )}

                            {assignment.submission.submission_url && (
                              <a
                                href={assignment.submission.submission_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                              >
                                <FileText className="w-4 h-4" />
                                View Submission
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Failed to load student tracking data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
