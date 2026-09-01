'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Users, CheckCircle, XCircle, Edit2, Save, X } from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface QuizAttempt {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  score: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
  answers: Array<{
    question_id: string;
    question_text: string;
    student_answer: string;
    correct_answer: string;
    is_correct: boolean;
    points_earned: number;
  }>;
}

export default function QuizReviewPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const quizId = params.quizId as string;

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [editingScore, setEditingScore] = useState(false);
  const [newScore, setNewScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = async (includeJson = false) => {
    const token = await getToken();
    if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
    return {
      ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    fetchAttempts();
  }, [quizId]);

  const fetchAttempts = async () => {
    try {
      const response = await fetch(
        `${API}/api/quizzes/${quizId}/attempts/all`,
        {
          headers: await getAuthHeaders()
        }
      );

      if (!response.ok) throw new Error('Failed to fetch attempts');

      const data = await response.json();
      setAttempts(data);
      if (data.length > 0) {
        setSelectedAttempt(data[0]);
        setNewScore(data[0].score);
      }
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAttempt = (attempt: QuizAttempt) => {
    setSelectedAttempt(attempt);
    setNewScore(attempt.score);
    setEditingScore(false);
  };

  const handleUpdateScore = async () => {
    if (!selectedAttempt) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API}/api/quiz-attempts/${selectedAttempt.id}/score`,
        {
          method: 'PUT',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({ score: newScore })
        }
      );

      if (!response.ok) throw new Error('Failed to update score');

      alert('Score updated successfully!');
      setEditingScore(false);
      fetchAttempts();
    } catch (error) {
      console.error('Error updating score:', error);
      alert('Failed to update score');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <IslamicLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quiz Review & Grading</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student Attempts List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-100 p-4">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Student Attempts ({attempts.length})
              </h2>

              {attempts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No attempts yet</p>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {attempts.map((attempt) => (
                    <button
                      key={attempt.id}
                      onClick={() => handleSelectAttempt(attempt)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        selectedAttempt?.id === attempt.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{attempt.student_name}</p>
                          <p className="text-xs text-gray-500">{attempt.student_email}</p>
                        </div>
                        {attempt.passed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className={`font-semibold ${attempt.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                          {attempt.score}%
                        </span>
                        <span className="text-gray-600">Attempt #{attempt.attempt_number}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(attempt.submitted_at).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attempt Details */}
          <div className="lg:col-span-2">
            {selectedAttempt ? (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedAttempt.student_name}</h2>
                      <p className="text-white/80 text-sm">{selectedAttempt.student_email}</p>
                    </div>
                    <div className="text-right">
                      {editingScore ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newScore}
                            onChange={(e) => setNewScore(Number(e.target.value))}
                            min="0"
                            max="100"
                            className="w-20 px-3 py-1 rounded-lg text-gray-900 text-center font-bold"
                          />
                          <button
                            onClick={handleUpdateScore}
                            disabled={saving}
                            className="p-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingScore(false);
                              setNewScore(selectedAttempt.score);
                            }}
                            className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingScore(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-50"
                        >
                          <span className="text-2xl font-bold">{selectedAttempt.score}%</span>
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Answers Review</h3>
                  
                  {selectedAttempt.answers.map((answer, index) => (
                    <div
                      key={answer.question_id}
                      className={`p-4 rounded-xl border-2 ${
                        answer.is_correct
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {answer.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            {index + 1}. {answer.question_text}
                          </p>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="font-medium">Student's answer:</span>{' '}
                              <span className={answer.is_correct ? 'text-emerald-700' : 'text-red-700'}>
                                {answer.student_answer}
                              </span>
                            </p>
                            {!answer.is_correct && (
                              <p>
                                <span className="font-medium">Correct answer:</span>{' '}
                                <span className="text-emerald-700">{answer.correct_answer}</span>
                              </p>
                            )}
                            <p className="text-gray-600">
                              Points: {answer.points_earned}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select an attempt to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
