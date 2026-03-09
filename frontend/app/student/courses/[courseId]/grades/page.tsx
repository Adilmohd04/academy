'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Award, CheckCircle, XCircle, FileText, ClipboardCheck, 
  TrendingUp, Calendar, Download, ExternalLink, AlertCircle
} from 'lucide-react';

interface WeekGrade {
  week_number: number;
  week_title: string;
  quiz_score?: number;
  quiz_max_score?: number;
  quiz_percentage?: number;
  quiz_submitted_at?: string;
  quiz_comment?: string;
  assignment_score?: number;
  assignment_max_score?: number;
  assignment_percentage?: number;
  assignment_submitted_at?: string;
  assignment_comment?: string;
  assignment_status?: string;
}

interface GradesData {
  weeks: WeekGrade[];
  quiz_average: number;
  assignment_average: number;
  internal_score?: number;
  total_score?: number;
  certificate_eligible: boolean;
  min_score_for_certificate: number;
}

export default function StudentGradesPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;

  const [grades, setGrades] = useState<GradesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrades();
  }, [courseId]);

  const fetchGrades = async () => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/grades`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setGrades(data);
      }
    } catch (error) {
      console.error('Error fetching grades:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your grades...</p>
        </div>
      </div>
    );
  }

  if (!grades) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Failed to load grades</p>
        </div>
      </div>
    );
  }

  const scoreNeeded = grades.min_score_for_certificate - (grades.total_score || grades.internal_score || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Grades</h1>
              <p className="text-slate-600">Track your progress and performance</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardCheck className="w-8 h-8" />
              <h3 className="text-lg font-semibold">Quiz Average</h3>
            </div>
            <p className="text-4xl font-bold">{grades.quiz_average.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8" />
              <h3 className="text-lg font-semibold">Assignment Avg</h3>
            </div>
            <p className="text-4xl font-bold">{grades.assignment_average.toFixed(1)}%</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8" />
              <h3 className="text-lg font-semibold">Internal Score</h3>
            </div>
            <p className="text-4xl font-bold">{(grades.internal_score || 0).toFixed(1)}%</p>
          </div>

          <div className={`bg-gradient-to-br rounded-xl shadow-lg p-6 text-white ${
            grades.certificate_eligible ? 'from-emerald-500 to-emerald-600' : 'from-orange-500 to-orange-600'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8" />
              <h3 className="text-lg font-semibold">Certificate</h3>
            </div>
            {grades.certificate_eligible ? (
              <p className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                Eligible!
              </p>
            ) : (
              <p className="text-sm font-medium">
                Need {scoreNeeded.toFixed(1)}% more
              </p>
            )}
          </div>
        </div>

        {/* Week-wise Grades Table */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Week-wise Performance</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Week</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Quiz Score</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Quiz Comments</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Assignment Score</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Assignment Feedback</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.weeks.map((week) => (
                  <tr key={week.week_number} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">Week {week.week_number}</div>
                      <div className="text-sm text-slate-600">{week.week_title}</div>
                    </td>

                    <td className="px-6 py-4">
                      {week.quiz_score !== undefined && week.quiz_score !== null && week.quiz_max_score ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">
                              {week.quiz_score}/{week.quiz_max_score}
                            </span>
                            <span className="text-sm text-slate-600">
                              ({week.quiz_percentage?.toFixed(0)}%)
                            </span>
                          </div>
                          {week.quiz_submitted_at && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(week.quiz_submitted_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : week.quiz_submitted_at ? (
                        <div>
                          <div className="font-bold text-blue-600">--</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(week.quiz_submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not attempted</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {week.quiz_comment ? (
                        <p className="text-sm text-slate-700 italic">&ldquo;{week.quiz_comment}&rdquo;</p>
                      ) : (
                        <span className="text-sm text-slate-400">No comments</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {week.assignment_score !== undefined && week.assignment_score !== null && week.assignment_max_score ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-600">
                              {week.assignment_score}/{week.assignment_max_score}
                            </span>
                            <span className="text-sm text-slate-600">
                              ({week.assignment_percentage?.toFixed(0)}%)
                            </span>
                          </div>
                          {week.assignment_submitted_at && (
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(week.assignment_submitted_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : week.assignment_submitted_at ? (
                        <div>
                          <div className="font-bold text-purple-600">--</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(week.assignment_submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Not submitted</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {week.assignment_comment ? (
                        <p className="text-sm text-slate-700 italic">&ldquo;{week.assignment_comment}&rdquo;</p>
                      ) : (
                        <span className="text-sm text-slate-400">No feedback</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {week.assignment_status ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          week.assignment_status === 'graded' 
                            ? 'bg-green-100 text-green-700'
                            : week.assignment_status === 'submitted'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {week.assignment_status}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}

                {grades.weeks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No grades available yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Certificate Info */}
        {!grades.certificate_eligible && (
          <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-orange-900 mb-1">Certificate Requirements</h3>
                <p className="text-sm text-orange-800">
                  You need a minimum score of <strong>{grades.min_score_for_certificate}%</strong> to be eligible for the certificate.
                  Your current score is <strong>{(grades.total_score || grades.internal_score || 0).toFixed(1)}%</strong>.
                  Keep working on your assignments and quizzes to improve your score!
                </p>
              </div>
            </div>
          </div>
        )}

        {grades.certificate_eligible && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-green-900 mb-1">Congratulations! 🎉</h3>
                <p className="text-sm text-green-800">
                  You are eligible to receive a certificate for this course. Complete all remaining coursework to claim your certificate.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
