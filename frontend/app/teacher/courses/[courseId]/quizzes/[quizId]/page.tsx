'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Award, User } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Quiz {
  id: string;
  title: string;
  quiz_questions: QuizQuestion[];
  is_published: boolean;
  release_date?: string;
  deadline?: string;
  time_limit_minutes?: number;
  max_attempts?: number;
  show_answers_after_deadline?: boolean;
  show_correct_answers?: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'fill';
  options?: string[];
  correct_answer: string;
  marks: number;
}

interface Attempt {
  id: string;
  student_id: string;
  student_name: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string;
  score: number;
  points_earned: number;
  total_points: number;
  is_passed: boolean;
}

export default function QuizViewPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;
  const quizId = params.quizId as string;
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && quizId) {
      void fetchData();
    }
  }, [courseId, quizId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('Your sign-in session is unavailable. Please sign in again.');
      const headers = { Authorization: `Bearer ${token}` };

      // Quiz activities are course lessons, not records addressable through
      // `/teacher/lessons/:id`.  Load the course outline and canonical
      // teacher submissions feed, then select the requested lesson.  This
      // keeps existing builder links working without relying on the retired
      // quiz-attempt endpoint.
      const [weeksRes, submissionsRes] = await Promise.all([
        fetch(`${API}/api/courses/${courseId}/weeks`, { headers }),
        fetch(`${API}/api/teacher/courses/${courseId}/submissions`, { headers }),
      ]);

      if (!weeksRes.ok || !submissionsRes.ok) {
        throw new Error('Unable to load quiz results.');
      }

      const weeksPayload = await weeksRes.json();
      const weeks = Array.isArray(weeksPayload)
        ? weeksPayload
        : weeksPayload.data || [];
      const lesson = weeks
        .flatMap((week: any) => week.lessons || week.course_lessons || [])
        .find((item: any) => item.id === quizId && item.content_type === 'quiz');

      if (!lesson) {
        setQuiz(null);
        setAttempts([]);
        return;
      }

      const questions: QuizQuestion[] = Array.isArray(lesson.quiz_questions)
        ? lesson.quiz_questions.map((question: any, index: number) => ({
            id: question.id || `${lesson.id}-question-${index + 1}`,
            question: question.question || question.text || '',
            type: question.type === 'fill' || question.type === 'fill-in-blank'
              ? 'fill'
              : 'mcq',
            options: Array.isArray(question.options) ? question.options : [],
            correct_answer: question.correct_answer || question.correctAnswer || '',
            marks: Number(question.marks || question.points || 1),
          }))
        : [];

      setQuiz({
        id: lesson.id,
        title: lesson.title || 'Quiz',
        quiz_questions: questions,
        is_published: lesson.is_published !== false,
        release_date: lesson.release_date || undefined,
        deadline: lesson.deadline || undefined,
        time_limit_minutes: lesson.time_limit_minutes || undefined,
        max_attempts: lesson.max_attempts || undefined,
        show_answers_after_deadline: lesson.show_answers_after_deadline,
        show_correct_answers: lesson.show_correct_answers,
      });

      const submissionsPayload = await submissionsRes.json();
      const attemptNumbers = new Map<string, number>();
      const mappedAttempts: Attempt[] = (submissionsPayload.data || submissionsPayload || [])
        .filter((submission: any) =>
          submission.type === 'quiz' && submission.lesson_id === quizId
        )
        .map((submission: any) => {
          const currentAttempt = (attemptNumbers.get(submission.student_id) || 0) + 1;
          attemptNumbers.set(submission.student_id, currentAttempt);
          const pointsEarned = Number(submission.score || 0);
          const totalPoints = Number(submission.total_points || 0);
          const percentage = totalPoints > 0
            ? Math.round((pointsEarned / totalPoints) * 100)
            : Number(submission.grade || 0);

          return {
            id: submission.id,
            student_id: submission.student_id,
            student_name: submission.student_name || 'Student',
            attempt_number: currentAttempt,
            started_at: submission.started_at || submission.submitted_at,
            submitted_at: submission.submitted_at,
            score: percentage,
            points_earned: pointsEarned,
            total_points: totalPoints,
            is_passed: percentage >= 70,
          };
        });

      setAttempts(mappedAttempts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Not Found</h2>
          <p className="text-gray-600 mb-6">The quiz you're looking for doesn't exist.</p>
          <Link
            href={`/teacher/courses/${courseId}/builder`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course Builder
          </Link>
        </div>
      </div>
    );
  }

  const totalMarks = quiz.quiz_questions?.reduce((sum, q) => sum + q.marks, 0) || 0;
  const averageScore = attempts.length > 0 
    ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length 
    : 0;
  const passedCount = attempts.filter(a => a.is_passed).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/teacher/courses/${courseId}/builder`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course Builder
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className={`px-3 py-1 rounded-full font-medium ${
                  quiz.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {quiz.is_published ? '✓ Published' : 'Draft'}
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {totalMarks} marks
                </span>
                {quiz.time_limit_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {quiz.time_limit_minutes} min limit
                  </span>
                )}
                {quiz.deadline && (
                  <span className="flex items-center gap-1 text-red-600">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(quiz.deadline).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{attempts.length}</p>
                <p className="text-sm text-gray-600">Total Attempts</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{averageScore.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Average Score</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{passedCount}</p>
                <p className="text-sm text-gray-600">Passed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{attempts.length - passedCount}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Questions Preview */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Questions ({quiz.quiz_questions?.length || 0})</h2>
          </div>
          <div className="p-6 space-y-6">
            {quiz.quiz_questions?.map((q, index) => (
              <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold text-gray-900">Question {index + 1}</h4>
                  <span className="text-sm font-medium text-gray-600">{q.marks} marks</span>
                </div>
                <p className="text-gray-700 mb-3">{q.question}</p>
                {q.type === 'mcq' && q.options && (
                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg border ${
                          opt === q.correct_answer
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="text-sm">{opt}</span>
                        {opt === q.correct_answer && (
                          <span className="ml-2 text-xs text-green-700 font-medium">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {q.type === 'fill' && (
                  <div className="p-3 bg-green-50 border border-green-500 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Answer: {q.correct_answer}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Student Attempts */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Student Attempts</h2>
          </div>
          
          {attempts.length === 0 ? (
            <div className="p-12 text-center">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No attempts yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {attempts.map((attempt) => (
                <div key={attempt.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{attempt.student_name}</h4>
                        <span className="text-sm text-gray-600">Attempt #{attempt.attempt_number}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          attempt.is_passed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {attempt.is_passed ? '✓ Passed' : '✗ Failed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Submitted: {new Date(attempt.submitted_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>Score: {attempt.score}%</span>
                        <span>•</span>
                        <span>Points: {attempt.points_earned}/{attempt.total_points}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{attempt.score}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
