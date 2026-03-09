'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Award, ArrowLeft, Loader2 } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  time_limit_minutes?: number;
  passing_score: number;
  questions: QuizQuestion[];
}

export default function TakeQuizPage() {
  const { userId } = useAuth();
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (userId && quizId) {
      fetchQuiz();
    }
  }, [userId, quizId]);

  useEffect(() => {
    if (started && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(t => t! - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [started, timeLeft]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${quizId}`, {
        headers: { 'Authorization': `Bearer ${userId}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setStarted(true);
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60);
    }
  };

  const selectAnswer = (questionId: string, answerIndex: number) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Calculate score
    let correct = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        correct++;
      }
    });

    const finalScore = (correct / quiz.questions.length) * 100;
    setScore(finalScore);
    setSubmitted(true);

    // Submit to backend
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`
        },
        body: JSON.stringify({
          answers,
          score: finalScore
        })
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-700">Quiz not found</h2>
      </div>
    );
  }

  if (submitted) {
    const passed = score !== null && score >= quiz.passing_score;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white p-6">
        <div className="max-w-2xl mx-auto">
          <IslamicCard className="p-12 text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {passed ? (
                <Award className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>

            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing'}
            </h1>
            <p className="text-lg text-slate-600 mb-6">
              You scored <span className="font-bold text-purple-700">{score?.toFixed(0)}%</span>
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Correct Answers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Object.entries(answers).filter(([qId, ans]) => 
                      quiz.questions.find(q => q.id === qId)?.correct_answer === ans
                    ).length} / {quiz.questions.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Passing Score</p>
                  <p className="text-2xl font-bold text-purple-600">{quiz.passing_score}%</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
              >
                Back to Course
              </button>
              {!passed && (
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setStarted(false);
                    setAnswers({});
                    setCurrentQuestion(0);
                    setScore(null);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                >
                  Retake Quiz
                </button>
              )}
            </div>
          </IslamicCard>

          {/* Review Answers */}
          <div className="mt-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Review Answers</h2>
            {quiz.questions.map((question, idx) => {
              const userAnswer = answers[question.id];
              const isCorrect = userAnswer === question.correct_answer;
              
              return (
                <IslamicCard key={question.id} className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCorrect ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 mb-3">
                        {idx + 1}. {question.question}
                      </h3>
                      <div className="space-y-2">
                        {question.options.map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-lg border-2 ${
                              optIdx === question.correct_answer
                                ? 'border-green-500 bg-green-50'
                                : optIdx === userAnswer
                                ? 'border-red-500 bg-red-50'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {optIdx === question.correct_answer && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              {optIdx === userAnswer && optIdx !== question.correct_answer && (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className={optIdx === question.correct_answer ? 'font-semibold' : ''}>
                                {option}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </IslamicCard>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-6">
        <IslamicCard className="w-full max-w-2xl p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center">
            <Award className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-800 mb-4">{quiz.title}</h1>
          <p className="text-slate-600 mb-8">{quiz.description}</p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">Questions</p>
              <p className="text-2xl font-bold text-purple-700">{quiz.questions.length}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">Time Limit</p>
              <p className="text-2xl font-bold text-purple-700">
                {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'Unlimited'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500 mb-1">Passing Score</p>
              <p className="text-2xl font-bold text-purple-700">{quiz.passing_score}%</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={startQuiz}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Start Quiz
            </button>
          </div>
        </IslamicCard>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-800">{quiz.title}</h1>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="font-bold">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-slate-600">
              {currentQuestion + 1} / {quiz.questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <IslamicCard className="p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            {currentQuestion + 1}. {question.question}
          </h2>

          <div className="space-y-3 mb-8">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => selectAnswer(question.id, idx)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[question.id] === idx
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    answers[question.id] === idx
                      ? 'border-purple-600 bg-purple-600'
                      : 'border-slate-300'
                  }`}>
                    {answers[question.id] === idx && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="font-medium text-slate-700">{option}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion === quiz.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(answers).length !== quiz.questions.length}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                Next Question
              </button>
            )}
          </div>
        </IslamicCard>
      </div>
    </div>
  );
}
