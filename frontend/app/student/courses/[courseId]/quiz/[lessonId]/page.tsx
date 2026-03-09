'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Clock, Award, AlertCircle } from 'lucide-react';
import IslamicLoader from '@/components/shared/IslamicLoader';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correct_answer: string;
  points: number;
  order_index: number;
}

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  passing_score: number;
  max_attempts?: number;
  questions: QuizQuestion[];
  deadline?: string;
  deadline_passed?: boolean;
  show_answers_after_deadline?: boolean;
}

interface QuizAttempt {
  attempt_number: number;
  score?: number;
  passed?: boolean;
  submitted_at?: string;
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    fetchQuiz();
  }, [lessonId]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}/quiz`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch quiz');

      const data = await response.json();
      setQuiz(data.quiz);
      setPreviousAttempts(data.attempts || []);

      // Start timer if time limit exists
      if (data.quiz.time_limit_minutes) {
        setTimeRemaining(data.quiz.time_limit_minutes * 60);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}/quiz/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answers })
        }
      );

      if (!response.ok) throw new Error('Failed to submit quiz');

      const result = await response.json();
      setQuizResult(result);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return <IslamicLoader />;
  if (!quiz) return <div className="text-center py-20">Quiz not found</div>;

  if (showResults && quizResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-100 overflow-hidden">
            {/* Results Header */}
            <div className={`px-8 py-12 text-center ${
              quizResult.passed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}>
              {quizResult.passed ? (
                <CheckCircle className="w-20 h-20 text-white mx-auto mb-4" />
              ) : (
                <AlertCircle className="w-20 h-20 text-white mx-auto mb-4" />
              )}
              <h2 className="text-3xl font-bold text-white mb-2">
                {quizResult.passed ? 'Congratulations!' : 'Keep Trying!'}
              </h2>
              <p className="text-white text-lg opacity-90">
                {quizResult.passed 
                  ? 'You passed the quiz!' 
                  : `You need ${quiz.passing_score}% to pass`}
              </p>
            </div>

            {/* Score Details */}
            <div className="p-8">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-6 bg-emerald-50 rounded-xl">
                  <Award className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">
                    {quizResult.score}%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Your Score</p>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600">
                    {quizResult.correct_answers}/{quiz.questions.length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Correct</p>
                </div>
                <div className="text-center p-6 bg-purple-50 rounded-xl">
                  <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-purple-600">
                    #{quizResult.attempt_number}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Attempt</p>
                </div>
              </div>

              {/* Question Review - Show correct answers after deadline or immediately for pre-recorded */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-bold text-gray-900">Review Answers</h3>
                
                {/* Show if answers should be revealed */}
                {(quiz.deadline_passed || !quiz.deadline) ? (
                  quizResult.question_results.map((qr: any, index: number) => (
                    <div
                      key={qr.question_id}
                      className={`p-4 rounded-xl border-2 ${
                        qr.is_correct
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {qr.is_correct ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 mt-1 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            {index + 1}. {quiz.questions[index].question_text}
                          </p>
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="font-medium">Your answer:</span>{' '}
                              <span className={qr.is_correct ? 'text-emerald-700' : 'text-red-700'}>
                                {qr.student_answer}
                              </span>
                            </p>
                            {!qr.is_correct && (
                              <p className="bg-emerald-100 px-3 py-2 rounded-lg mt-2">
                                <span className="font-medium text-emerald-900">✓ Correct answer:</span>{' '}
                                <span className="text-emerald-800 font-semibold">{qr.correct_answer}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Before deadline - don't show correct answers */
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                    <Clock className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <p className="text-blue-900 font-medium">
                      Correct answers will be revealed after the quiz deadline
                    </p>
                    {quiz.deadline && (
                      <p className="text-blue-700 text-sm mt-2">
                        Deadline: {new Date(quiz.deadline).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                {!quizResult.passed && (quiz.max_attempts === null || quizResult.attempt_number < quiz.max_attempts) && (
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setAnswers({});
                      setCurrentQuestionIndex(0);
                      fetchQuiz();
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => router.push(`/student/courses/${courseId}/player`)}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Back to Course
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/student/courses/${courseId}/player`}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Course
          </Link>
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
              timeRemaining < 60 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        {/* Quiz Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2 border-emerald-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>{quiz.questions.length} Questions</span>
            <span>Passing Score: {quiz.passing_score}%</span>
            {quiz.max_attempts && (
              <span>Attempt {previousAttempts.length + 1} of {quiz.max_attempts}</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
            <p className="text-white text-sm opacity-90">Question {currentQuestionIndex + 1}</p>
            <h2 className="text-white text-xl font-bold mt-1">{currentQuestion.question_text}</h2>
          </div>

          <div className="p-6">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      answers[currentQuestion.id] === option
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion.id] === option
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion.id] === option && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <div className="space-y-3">
                {['True', 'False'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
                      answers[currentQuestion.id] === option
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion.id] === option
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion.id] === option && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'short_answer' && (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none min-h-[150px] resize-none"
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            Previous
          </button>

          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting || Object.keys(answers).length < quiz.questions.length}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
