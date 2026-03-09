'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download, CheckCircle, XCircle, Clock, FileText, User, Upload, Save } from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

interface Submission {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  submitted_at: string;
  file_url?: string;
  file_name?: string;
  text_submission?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
  graded_at?: string;
}

interface Assignment {
  id: string;
  title: string;
  max_score: number;
}

export default function GradeAssignmentsPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [gradeStatus, setGradeStatus] = useState<'graded' | 'returned'>('graded');
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  
  // Bulk Grading State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGrades, setBulkGrades] = useState<{ [key: string]: { score: number; feedback: string } }>({});

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignmentId}/submissions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      setSubmissions(data);

      // Initialize bulk grades
      const initialBulkGrades: any = {};
      data.forEach((s: Submission) => {
        initialBulkGrades[s.id] = { score: s.score || 0, feedback: s.feedback || '' };
      });
      setBulkGrades(initialBulkGrades);

      if (data.length > 0) {
        setAssignment({
          id: assignmentId,
          title: 'Assignment',
          max_score: 100
        });
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setScore(submission.score || 0);
    setFeedback(submission.feedback || '');
    setGradeStatus(submission.status === 'returned' ? 'returned' : 'graded');
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;

    setGrading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/submissions/${selectedSubmission.id}/grade`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ score, feedback, status: gradeStatus })
        }
      );

      if (!response.ok) throw new Error('Failed to grade submission');

      alert('Submission graded successfully!');
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Failed to grade submission. Please try again.');
    } finally {
      setGrading(false);
    }
  };

  const handleBulkGradeChange = (id: string, field: 'score' | 'feedback', value: any) => {
    setBulkGrades(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const saveBulkGrades = async () => {
    setGrading(true);
    try {
      const gradesToSave = Object.entries(bulkGrades).map(([id, data]) => ({
        id,
        score: data.score,
        feedback: data.feedback
      }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/bulk-grade`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ grades: gradesToSave })
        }
      );

      if (!response.ok) throw new Error('Failed to save bulk grades');

      alert('All grades saved successfully!');
      setShowBulkModal(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error saving bulk grades:', error);
      alert('Failed to save grades');
    } finally {
      setGrading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/assignments/${assignmentId}/export`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to export grades');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grades-${assignmentId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting grades:', error);
      alert('Failed to export grades');
    }
  };

  if (loading) return <IslamicLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Grade Assignments</h1>
            <p className="text-gray-600 mt-1">{submissions.length} submissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Bulk Grade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-1 space-y-3">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-100 p-4">
              <h2 className="font-bold text-gray-900 mb-4">Submissions</h2>
              
              {submissions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No submissions yet</p>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {submissions.map((submission) => (
                    <button
                      key={submission.id}
                      onClick={() => handleSelectSubmission(submission)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        selectedSubmission?.id === submission.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-600" />
                          <p className="font-medium text-gray-900">
                            {submission.first_name} {submission.last_name}
                          </p>
                        </div>
                        {submission.status === 'graded' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : submission.status === 'returned' ? (
                          <XCircle className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                      {submission.score !== undefined && (
                        <p className="text-sm font-semibold text-emerald-600 mt-1">
                          Score: {submission.score}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grading Panel */}
          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden">
                {/* Student Info */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                  <h2 className="text-xl font-bold text-white">
                    {selectedSubmission.first_name} {selectedSubmission.last_name}
                  </h2>
                  <p className="text-white/80 text-sm">{selectedSubmission.email}</p>
                  <p className="text-white/80 text-sm mt-1">
                    Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Submitted File */}
                  {selectedSubmission.file_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Submitted File
                      </label>
                      <a
                        href={selectedSubmission.file_url}
                        download={selectedSubmission.file_name}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                      >
                        <Download className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {selectedSubmission.file_name}
                        </span>
                      </a>
                    </div>
                  )}

                  {/* Text Submission */}
                  {selectedSubmission.text_submission && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Submission
                      </label>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-wrap text-gray-700">
                        {selectedSubmission.text_submission}
                      </div>
                    </div>
                  )}

                  {/* Score Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Score (out of {assignment?.max_score || 100})
                    </label>
                    <input
                      type="number"
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      min="0"
                      max={assignment?.max_score || 100}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide feedback to the student..."
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none min-h-[150px] resize-none"
                    />
                  </div>

                  {/* Grade Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setGradeStatus('graded')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                          gradeStatus === 'graded'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Accept & Grade
                      </button>
                      <button
                        onClick={() => setGradeStatus('returned')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                          gradeStatus === 'returned'
                            ? 'bg-amber-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Return for Revision
                      </button>
                    </div>
                  </div>

                  {/* Submit Grade */}
                  <button
                    onClick={handleGrade}
                    disabled={grading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {grading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Submit Grade
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 p-12 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Select a submission to grade
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Grading Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Bulk Grading</h2>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 font-semibold text-gray-600">Student</th>
                    <th className="pb-3 font-semibold text-gray-600">Status</th>
                    <th className="pb-3 font-semibold text-gray-600 w-32">Score</th>
                    <th className="pb-3 font-semibold text-gray-600">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.map((submission) => (
                    <tr key={submission.id}>
                      <td className="py-4">
                        <div className="font-medium text-gray-900">
                          {submission.first_name} {submission.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{submission.email}</div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'graded' ? 'bg-emerald-100 text-emerald-700' :
                          submission.status === 'returned' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {submission.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <input
                          type="number"
                          value={bulkGrades[submission.id]?.score || 0}
                          onChange={(e) => handleBulkGradeChange(submission.id, 'score', Number(e.target.value))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-4">
                        <input
                          type="text"
                          value={bulkGrades[submission.id]?.feedback || ''}
                          onChange={(e) => handleBulkGradeChange(submission.id, 'feedback', e.target.value)}
                          placeholder="Feedback..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveBulkGrades}
                disabled={grading}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {grading ? 'Saving...' : 'Save All Grades'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
