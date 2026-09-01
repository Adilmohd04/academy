'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Award, BookOpen } from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

interface LessonProgress {
  week_title: string;
  week_order: number;
  lesson_id: string;
  lesson_title: string;
  content_type: string;
  lesson_order: number;
  is_completed: boolean;
  completed_at?: string;
}

interface QuizAttempt {
  lesson_title: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
}

interface Assignment {
  lesson_title: string;
  score?: number;
  status: string;
  submitted_at: string;
  graded_at?: string;
  feedback?: string;
}

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;
  const studentId = params.studentId as string;

  const [lessons, setLessons] = useState<LessonProgress[]>([]);
  const [quizzes, setQuizzes] = useState<QuizAttempt[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && studentId) void fetchStudentDetails();
  }, [courseId, studentId, getToken]);

  const fetchStudentDetails = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/courses/${courseId}/students/${studentId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch student details');

      const data = await response.json();
      setLessons(data.lessons || []);
      setQuizzes(data.quizzes || []);
      setAssignments(data.assignments || []);
    } catch (error) {
      console.error('Error fetching student details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <IslamicLoader />;

  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.week_title]) {
      acc[lesson.week_title] = [];
    }
    acc[lesson.week_title].push(lesson);
    return acc;
  }, {} as Record<string, LessonProgress[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link
          href={`/teacher/courses/${courseId}/dashboard`}
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Progress Details</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lesson Progress */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Lesson Progress</h2>
              </div>

              <div className="p-6 space-y-4">
                {Object.entries(groupedLessons).map(([weekTitle, weekLessons]) => (
                  <div key={weekTitle} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                    <h3 className="font-bold text-gray-900 mb-3">{weekTitle}</h3>
                    <div className="space-y-2">
                      {weekLessons.map((lesson) => (
                        <div
                          key={lesson.lesson_id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            lesson.is_completed ? 'bg-emerald-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {lesson.is_completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{lesson.lesson_title}</p>
                              <p className="text-xs text-gray-500 capitalize">{lesson.content_type}</p>
                            </div>
                          </div>
                          {lesson.completed_at && (
                            <span className="text-xs text-gray-500">
                              {new Date(lesson.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Assignments</h2>
              </div>

              <div className="p-6">
                {assignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No assignments submitted</p>
                ) : (
                  <div className="space-y-3">
                    {assignments.map((assignment, index) => (
                      <div
                        key={index}
                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="font-medium text-gray-900">{assignment.lesson_title}</h3>
                          </div>
                          {assignment.status === 'graded' && assignment.score !== undefined && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold">
                              {assignment.score}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Submitted: {new Date(assignment.submitted_at).toLocaleDateString()}</span>
                          {assignment.graded_at && (
                            <span>Graded: {new Date(assignment.graded_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        {assignment.feedback && (
                          <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">{assignment.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quiz Results */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-100 overflow-hidden sticky top-6">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Quiz Results</h2>
              </div>

              <div className="p-6">
                {quizzes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No quizzes taken</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {quizzes.map((quiz, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 ${
                          quiz.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 text-sm">{quiz.lesson_title}</h3>
                          {quiz.passed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-semibold ${quiz.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                            Score: {quiz.score}%
                          </span>
                          <span className="text-gray-600">Attempt #{quiz.attempt_number}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(quiz.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
