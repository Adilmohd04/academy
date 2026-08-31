'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Users, TrendingUp, Award, BookOpen, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

interface Student {
  student_id: string;
  student_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  enrolled_at: string;
  progress_percentage: number;
  last_accessed?: string;
  completed_lessons: number;
  total_lessons: number;
  quiz_average?: number;
  assignment_average?: number;
}

interface CourseStats {
  total_students: number;
  average_progress: number;
  completed_students: number;
  average_quiz_score?: number;
  average_assignment_score?: number;
  total_lessons: number;
}

export default function TeacherCourseDashboard() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/courses/${courseId}/enrollments`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'Failed to fetch enrollments');
      }

      const data = await response.json();
      setStudents(data.students || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setError(error instanceof Error ? error.message : 'Could not load the course dashboard.');
    } finally {
      setLoading(false);
    }
  }, [courseId, getToken]);

  useEffect(() => {
    if (courseId) void fetchEnrollments();
  }, [courseId, fetchEnrollments]);

  if (loading) return <IslamicLoader />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Course dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button onClick={() => void fetchEnrollments()} className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Course Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage students and track progress</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-emerald-600" />
                <span className="text-3xl font-bold text-gray-900">{stats.total_students}</span>
              </div>
              <p className="text-gray-600 font-medium">Total Students</p>
              <p className="text-sm text-emerald-600 mt-1">
                {stats.completed_students} completed
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <span className="text-3xl font-bold text-gray-900">{stats.average_progress}%</span>
              </div>
              <p className="text-gray-600 font-medium">Avg Progress</p>
              <p className="text-sm text-gray-500 mt-1">{stats.total_lessons} total lessons</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-8 h-8 text-purple-600" />
                <span className="text-3xl font-bold text-gray-900">
                  {stats.average_quiz_score || 0}%
                </span>
              </div>
              <p className="text-gray-600 font-medium">Avg Quiz Score</p>
              <p className="text-sm text-gray-500 mt-1">All quizzes</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-100 p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 text-amber-600" />
                <span className="text-3xl font-bold text-gray-900">
                  {stats.average_assignment_score || 0}%
                </span>
              </div>
              <p className="text-gray-600 font-medium">Avg Assignment</p>
              <p className="text-sm text-gray-500 mt-1">All submissions</p>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Enrolled Students</h2>
          </div>

          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No students enrolled yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lessons
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quiz Avg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment Avg
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.student_name || [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student'}
                          </div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${student.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {student.progress_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          {student.completed_lessons} / {student.total_lessons}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          (student.quiz_average || 0) >= 70 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {student.quiz_average ? `${student.quiz_average}%` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          (student.assignment_average || 0) >= 70 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {student.assignment_average ? `${student.assignment_average}%` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {student.last_accessed
                            ? new Date(student.last_accessed).toLocaleDateString()
                            : 'Never'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => router.push(`/teacher/courses/${courseId}/students/${student.student_id}`)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
