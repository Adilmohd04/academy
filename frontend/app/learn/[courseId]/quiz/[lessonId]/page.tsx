'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { FileQuestion, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export default function QuizPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId as string;
  const lessonId = params?.lessonId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (userId && lessonId) {
      fetchQuiz();
    }
  }, [userId, lessonId]);

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quizzes/${lessonId}`, {
        headers: { 'x-clerk-user-id': userId || '' }
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

  const handleSubmit = () => {
    if (!quiz) return;
    
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correct++;
      }
    });
    
    setScore(correct);
    setSubmitted(true);
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
      <div className="flex items-center justify-center min-h-screen">
        <IslamicCard className="p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-700">Quiz not found</h2>
        </IslamicCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <IslamicCard className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileQuestion className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{quiz.title}</h1>
          </div>
          {submitted && (
            <div className={`mt-4 p-4 rounded-lg ${
              score === quiz.questions.length ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className="text-lg font-semibold">
                Score: {score} / {quiz.questions.length} ({Math.round((score / quiz.questions.length) * 100)}%)
              </p>
            </div>
          )}
        </IslamicCard>

        {/* Questions */}
        <div className="space-y-6 mb-6">
          {quiz.questions.map((question, index) => (
            <IslamicCard key={question.id} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 font-bold text-purple-700">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{question.question}</h3>
              </div>

              <div className="space-y-3 ml-11">
                {question.options.map((option, optionIndex) => {
                  const isSelected = answers[question.id] === optionIndex;
                  const isCorrect = optionIndex === question.correct_answer;
                  const showResult = submitted;

                  return (
                    <button
                      key={optionIndex}
                      onClick={() => !submitted && setAnswers({ ...answers, [question.id]: optionIndex })}
                      disabled={submitted}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        showResult
                          ? isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isSelected
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-200 bg-white'
                          : isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">{option}</span>
                        {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {showResult && isSelected && !isCorrect && <AlertCircle className="w-5 h-5 text-red-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </IslamicCard>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <IslamicButton
            variant="secondary"
            onClick={() => router.push(`/learn/${courseId}`)}
          >
            Back to Course
          </IslamicButton>
          {!submitted ? (
            <IslamicButton
              variant="primary"
              onClick={handleSubmit}
              disabled={Object.keys(answers).length !== quiz.questions.length}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Quiz
            </IslamicButton>
          ) : (
            <IslamicButton
              variant="primary"
              onClick={() => router.push(`/learn/${courseId}`)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue
            </IslamicButton>
          )}
        </div>
      </div>
    </div>
  );
}
