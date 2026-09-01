'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Users, Search, ChevronDown, ChevronUp,
  Award, TrendingUp, Calendar, Save, Calculator,
  CheckCircle, XCircle, AlertCircle, Eye
} from 'lucide-react';
import StudentDetailModal from './StudentDetailModal';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface StudentGrade {
  id: string;
  student_id: string;
  name: string;
  email: string;
  phone?: string;
  enrolled_at: string;
  progress: number;
  completed: boolean;
  quiz_average: number | null;
  assignment_average: number | null;
  final_exam_score: number | null;
  total_average: number | null;
  certificate_issued: boolean;
}

interface GradingPolicy {
  quiz_weight: number;
  assignment_weight: number;
  final_exam_weight: number;
  min_score_for_certificate: number;
}

export default function CourseStudentsPage() {
  const router = useRouter();
  const params = useParams();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;

  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [gradingPolicy, setGradingPolicy] = useState<GradingPolicy>({
    quiz_weight: 20,
    assignment_weight: 20,
    final_exam_weight: 60,
    min_score_for_certificate: 60
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');

  useEffect(() => {
    if (!courseId) return;
    void fetchStudents();
    void fetchGradingPolicy();
  }, [courseId]);

  const fetchStudents = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const response = await fetch(
        `${API}/api/teacher/courses/${courseId}/students`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Students data:', data);
        setStudents(data.students || data || []);
      } else {
        console.error('Failed to fetch students:', response.status);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGradingPolicy = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const response = await fetch(
        `${API}/api/teacher/courses/${courseId}/grading-policy`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.policy) {
          setGradingPolicy(data.policy);
        }
      }
    } catch (error) {
      console.error('Error fetching grading policy:', error);
    }
  };

  const calculateInternalScores = async () => {
    if (!confirm('Calculate internal scores for all students? This will compute the average of all quiz and assignment scores.')) {
      return;
    }

    setCalculating(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const response = await fetch(
        `${API}/api/teacher/courses/${courseId}/calculate-internal-scores`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        await fetchStudents();
        alert('Internal scores calculated successfully!');
      } else {
        alert('Failed to calculate internal scores');
      }
    } catch (error) {
      alert('Failed to calculate internal scores');
    } finally {
      setCalculating(false);
    }
  };

  const saveGradingPolicy = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const response = await fetch(
        `${API}/api/teacher/courses/${courseId}/grading-policy`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gradingPolicy),
        }
      );

      if (response.ok) {
        alert('Grading policy saved successfully!');
      } else {
        alert('Failed to save grading policy');
      }
    } catch (error) {
      alert('Failed to save grading policy');
    }
  };

  const filteredStudents = students.filter((student) =>
    (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading student grades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            Student Grades & Progress
          </h1>
          <p className="text-gray-600">Track and manage student performance across all weeks</p>
        </div>

        {/* Grading Policy Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-purple-600" />
            Grading Policy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradingPolicy.quiz_weight}
                onChange={(e) =>
                  setGradingPolicy({
                    ...gradingPolicy,
                    quiz_weight: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradingPolicy.assignment_weight}
                onChange={(e) =>
                  setGradingPolicy({
                    ...gradingPolicy,
                    assignment_weight: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Final Exam Weight (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradingPolicy.final_exam_weight}
                onChange={(e) =>
                  setGradingPolicy({
                    ...gradingPolicy,
                    final_exam_weight: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Score for Certificate
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradingPolicy.min_score_for_certificate}
                onChange={(e) =>
                  setGradingPolicy({
                    ...gradingPolicy,
                    min_score_for_certificate: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={saveGradingPolicy}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Policy
            </button>
            <button
              onClick={calculateInternalScores}
              disabled={calculating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              {calculating ? 'Calculating...' : 'Calculate Internal Scores'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Total: {gradingPolicy.quiz_weight + gradingPolicy.assignment_weight + gradingPolicy.final_exam_weight}% 
            {gradingPolicy.quiz_weight + gradingPolicy.assignment_weight + gradingPolicy.final_exam_weight !== 100 && (
              <span className="text-red-600 ml-2">⚠️ Weights should add up to 100%</span>
            )}
          </p>
        </div>

        {/* Search and Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{students.length}</div>
                <div className="text-gray-600">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {students.filter(s => s.certificate_issued).length}
                </div>
                <div className="text-gray-600">Certified</div>
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'No students enrolled in this course yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div
                key={student.student_id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Student Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setExpandedStudent(
                      expandedStudent === student.student_id ? null : student.student_id
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {student.name}
                        </h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Progress</div>
                        <div className="text-lg font-bold text-blue-600">
                          {student.progress}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Quiz Avg</div>
                        <div className="text-lg font-bold text-green-600">
                          {student.quiz_average !== null ? student.quiz_average.toFixed(1) : 'N/A'}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Assignment Avg</div>
                        <div className="text-lg font-bold text-purple-600">
                          {student.assignment_average !== null ? student.assignment_average.toFixed(1) : 'N/A'}%
                        </div>
                      </div>
                      {student.total_average !== null && (
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Total Avg</div>
                          <div className="text-lg font-bold text-indigo-600">
                            {student.total_average.toFixed(1)}%
                          </div>
                        </div>
                      )}
                      <div>
                        {student.certificate_issued ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      {expandedStudent === student.student_id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Student Details */}
                {expandedStudent === student.student_id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Student Information */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          Student Information
                        </h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Email:</span>
                            <span className="font-medium text-gray-900">{student.email}</span>
                          </div>
                          {student.phone && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Phone:</span>
                              <span className="font-medium text-gray-900">{student.phone}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Enrolled:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(student.enrolled_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium ${student.completed ? 'text-green-600' : 'text-blue-600'}`}>
                              {student.completed ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Summary */}
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                          Performance Summary
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Quiz Average:</span>
                              <span className="font-bold text-blue-600">
                                {student.quiz_average !== null ? `${student.quiz_average.toFixed(1)}%` : 'No data'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Assignment Average:</span>
                              <span className="font-bold text-purple-600">
                                {student.assignment_average !== null ? `${student.assignment_average.toFixed(1)}%` : 'No data'}
                              </span>
                            </div>
                          </div>
                          {student.final_exam_score !== null && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Final Exam:</span>
                                <span className="font-bold text-indigo-600">
                                  {student.final_exam_score.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                          {student.total_average !== null && (
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex justify-between text-sm">
                                <span className="font-semibold text-gray-900">Total Average:</span>
                                <span className="font-bold text-lg text-indigo-600">
                                  {student.total_average.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Certificate Status */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-semibold text-gray-900 mb-1">Certificate Status</h5>
                          <p className="text-sm text-gray-600">
                            Minimum score required: {gradingPolicy.min_score_for_certificate}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {student.certificate_issued ? (
                            <>
                              <Award className="w-6 h-6 text-green-600" />
                              <span className="font-semibold text-green-600 text-lg">Certificate Issued</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-6 h-6 text-orange-600" />
                              <span className="font-semibold text-orange-600 text-lg">
                                {student.total_average !== null 
                                  ? `${student.total_average.toFixed(1)}% / ${gradingPolicy.min_score_for_certificate}%`
                                  : 'Not yet graded'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View Detailed Tracking Button */}
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentId(student.student_id);
                          setSelectedStudentName(student.name);
                          setDetailModalOpen(true);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 font-medium shadow-md hover:shadow-lg transition-all"
                      >
                        <Eye className="w-5 h-5" />
                        View Detailed Tracking (Quizzes & Assignments)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Student Detail Modal */}
        {selectedStudentId && (
          <StudentDetailModal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            studentId={selectedStudentId}
            courseId={courseId}
            studentName={selectedStudentName}
          />
        )}
      </div>
    </div>
  );
}
