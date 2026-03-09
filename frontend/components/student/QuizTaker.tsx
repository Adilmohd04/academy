'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, Clock, CheckCircle, XCircle, AlertCircle,
  Play, Upload, Mic, Video as VideoIcon, FileText,
  Send, ChevronRight, Timer, Eye, Lock
} from 'lucide-react';
import { 
  WeekQuiz, QuizQuestion, QuizAttempt, QuizAnswer,
  FinalExam, QuestionType 
} from '@/types/lms';
import { format, isAfter, isBefore, differenceInSeconds } from 'date-fns';

interface QuizTakerProps {
  quiz: WeekQuiz | FinalExam;
  onSubmit: (answers: QuizAnswer[]) => Promise<void>;
  existingAttempt?: QuizAttempt;
}

export default function QuizTaker({ quiz, onSubmit, existingAttempt }: QuizTakerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, QuizAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Type guards for WeekQuiz vs FinalExam
  const availableFrom = 'availableFrom' in quiz ? quiz.availableFrom : undefined;
  const availableTo = 'availableTo' in quiz ? quiz.availableTo : undefined;
  const timeLimit = 'timeLimit_minutes' in quiz ? quiz.timeLimit_minutes : ('duration_minutes' in quiz ? quiz.duration_minutes : undefined);
  const showAnswersAfterDeadline = 'showAnswersAfterDeadline' in quiz ? quiz.showAnswersAfterDeadline : false;

  const isAvailable = !availableFrom || isAfter(new Date(), new Date(availableFrom));
  const isExpired = availableTo && isAfter(new Date(), new Date(availableTo));
  const canStart = isAvailable && !isExpired && quiz.isPublished;

  useEffect(() => {
    if (isStarted && timeLimit) {
      setTimeRemaining(timeLimit * 60);
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStarted]);

  const handleStart = () => {
    setIsStarted(true);
  };

  const handleAnswerChange = (questionId: string, answer: Partial<QuizAnswer>) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      id: `answer-${questionId}`,
      attemptId: existingAttempt?.id || 'new',
      questionId,
      questionType: quiz.questions.find(q => q.id === questionId)?.questionType || 'multiple_choice',
      ...answer
    } as QuizAnswer);
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(Array.from(answers.values()));
      setShowResults(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // Pre-start screen
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-purple-100">
                  {'type' in quiz ? quiz.type.toUpperCase() : 'QUIZ'}
                </p>
                <h1 className="text-2xl font-bold">{quiz.title}</h1>
              </div>
            </div>
            <p className="text-purple-100">{quiz.description}</p>
          </div>

          {/* Info */}
          <div className="p-8 space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Instructions
              </h3>
              <p className="text-gray-700">{quiz.instructions}</p>
            </div>

            {/* Quiz Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Questions</p>
                <p className="text-2xl font-bold text-gray-800">{quiz.questions.length}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Marks</p>
                <p className="text-2xl font-bold text-gray-800">{quiz.totalMarks}</p>
              </div>

              {timeLimit && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <p className="text-sm text-gray-600 mb-1">Time Limit</p>
                  <p className="text-2xl font-bold text-amber-700">{timeLimit} min</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Attempts Allowed</p>
                <p className="text-2xl font-bold text-gray-800">{quiz.attemptsAllowed}</p>
              </div>
            </div>

            {/* Availability Status */}
            {!canStart && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <Lock className="h-5 w-5" />
                  <p className="font-bold">
                    {!isAvailable && 'Quiz not yet available'}
                    {isExpired && 'Quiz has expired'}
                    {!quiz.isPublished && 'Quiz not published yet'}
                  </p>
                </div>
                {availableFrom && !isAvailable && (
                  <p className="text-sm text-red-600 mt-2">
                    Available from: {format(new Date(availableFrom), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            )}

            {/* Start Button */}
            {canStart && (
              <button
                onClick={handleStart}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <Play className="h-6 w-6" />
                Start Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
              <p className="text-gray-600">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg">
                <Timer className="h-5 w-5" />
                <span className="font-bold text-lg">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <QuestionDisplay
            question={currentQuestion}
            answer={answers.get(currentQuestion.id)}
            onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-purple-600 text-white'
                    : answers.has(quiz.questions[index].id)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Quiz
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Answer Summary */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-3">Answer Summary</h3>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-600">Answered: </span>
              <span className="font-bold text-green-600">{answers.size}</span>
            </div>
            <div>
              <span className="text-gray-600">Remaining: </span>
              <span className="font-bold text-amber-600">{quiz.questions.length - answers.size}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Question Display Component
function QuestionDisplay({
  question,
  answer,
  onAnswerChange
}: {
  question: QuizQuestion;
  answer?: QuizAnswer;
  onAnswerChange: (answer: Partial<QuizAnswer>) => void;
}) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      // TODO: Upload file and get URL
      onAnswerChange({ fileUrl: 'uploaded-file-url' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Question */}
      <div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold">
            {question.order}
          </div>
          <div className="flex-1">
            <p className="text-lg text-gray-800 font-medium">{question.questionText}</p>
            <p className="text-sm text-gray-500 mt-1">{question.marks} marks</p>
          </div>
        </div>

        {question.questionImage && (
          <img 
            src={question.questionImage}
            alt="Question"
            className="rounded-lg border border-gray-200 max-w-2xl mb-4"
          />
        )}
      </div>

      {/* Answer Input based on type */}
      {question.questionType === 'multiple_choice' && question.options && (
        <div className="space-y-3">
          {question.options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                answer?.selectedOptionId === option.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={answer?.selectedOptionId === option.id}
                onChange={() => onAnswerChange({ selectedOptionId: option.id })}
                className="w-5 h-5 text-purple-600"
              />
              <span className="flex-1 text-gray-800">{option.optionText}</span>
              {option.optionImage && (
                <img 
                  src={option.optionImage}
                  alt="Option"
                  className="w-20 h-20 rounded object-cover"
                />
              )}
            </label>
          ))}
        </div>
      )}

      {question.questionType === 'true_false' && (
        <div className="space-y-3">
          {['True', 'False'].map((value) => (
            <label
              key={value}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                answer?.textAnswer === value
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={answer?.textAnswer === value}
                onChange={() => onAnswerChange({ textAnswer: value })}
                className="w-5 h-5 text-purple-600"
              />
              <span className="flex-1 text-gray-800 font-medium">{value}</span>
            </label>
          ))}
        </div>
      )}

      {(question.questionType === 'short_answer' || question.questionType === 'essay') && (
        <textarea
          value={answer?.textAnswer || ''}
          onChange={(e) => onAnswerChange({ textAnswer: e.target.value })}
          rows={question.questionType === 'essay' ? 10 : 4}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-100 transition-all"
          placeholder="Type your answer here..."
        />
      )}

      {question.questionType === 'audio_upload' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Mic className="h-12 w-12 mx-auto mb-3 text-purple-600" />
          <p className="text-gray-700 font-medium mb-2">Record or Upload Audio</p>
          <p className="text-sm text-gray-500 mb-4">{question.uploadInstructions}</p>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id={`audio-${question.id}`}
          />
          <label
            htmlFor={`audio-${question.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload Audio
          </label>
          {uploadedFile && (
            <p className="mt-3 text-sm text-green-600">✓ {uploadedFile.name}</p>
          )}
        </div>
      )}

      {question.questionType === 'video_upload' && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <VideoIcon className="h-12 w-12 mx-auto mb-3 text-purple-600" />
          <p className="text-gray-700 font-medium mb-2">Record or Upload Video</p>
          <p className="text-sm text-gray-500 mb-4">{question.uploadInstructions}</p>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
            id={`video-${question.id}`}
          />
          <label
            htmlFor={`video-${question.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload Video
          </label>
          {uploadedFile && (
            <p className="mt-3 text-sm text-green-600">✓ {uploadedFile.name}</p>
          )}
          <p className="text-xs text-gray-500 mt-3">
            Max size: {question.maxFileSize_mb}MB
          </p>
        </div>
      )}
    </div>
  );
}

// Quiz Results Component
export function QuizResults({ 
  quiz, 
  attempt 
}: { 
  quiz: WeekQuiz | FinalExam;
  attempt: QuizAttempt;
}) {
  const availableTo = 'availableTo' in quiz ? quiz.availableTo : undefined;
  const showAnswersAfterDeadline = 'showAnswersAfterDeadline' in quiz ? quiz.showAnswersAfterDeadline : false;
  const showAnswers = quiz.showAnswersAfterSubmit || 
    (showAnswersAfterDeadline && availableTo && isAfter(new Date(), new Date(availableTo)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Results Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className={`p-8 text-white ${
            attempt.passed 
              ? 'bg-gradient-to-r from-green-600 to-emerald-600'
              : 'bg-gradient-to-r from-amber-600 to-orange-600'
          }`}>
            <div className="text-center">
              {attempt.passed ? (
                <CheckCircle className="h-16 w-16 mx-auto mb-4" />
              ) : (
                <AlertCircle className="h-16 w-16 mx-auto mb-4" />
              )}
              <h1 className="text-3xl font-bold mb-2">
                {attempt.passed ? 'Congratulations!' : 'Keep Trying!'}
              </h1>
              <p className="text-lg opacity-90">
                You scored {attempt.marksObtained} out of {attempt.totalMarks} marks
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Your Score</p>
                <p className="text-3xl font-bold text-gray-800">
                  {attempt.percentage?.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Passing Score</p>
                <p className="text-3xl font-bold text-gray-800">
                  {quiz.passingMarks}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Time Taken</p>
                <p className="text-3xl font-bold text-gray-800">
                  {Math.floor(attempt.timeSpent_seconds / 60)} min
                </p>
              </div>
            </div>

            {attempt.feedback && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Teacher Feedback:</p>
                <p className="text-gray-600">{attempt.feedback}</p>
              </div>
            )}
          </div>
        </div>

        {/* Answers Review */}
        {showAnswers && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Review Your Answers</h2>
            {attempt.answers.map((answer, index) => {
              const question = quiz.questions.find(q => q.id === answer.questionId);
              if (!question) return null;

              return (
                <div key={answer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                      answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {answer.isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium mb-2">{question.questionText}</p>
                      <p className="text-sm text-gray-500">
                        {answer.marksAwarded || 0} / {question.marks} marks
                      </p>
                    </div>
                  </div>

                  {answer.feedback && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{answer.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
