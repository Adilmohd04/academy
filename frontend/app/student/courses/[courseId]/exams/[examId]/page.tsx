'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams } from 'next/navigation';

interface ExamOption {
  id: string;
  option_text: string;
  order_index: number;
}

interface ExamQuestion {
  id: string;
  question_text: string;
  question_type: string;
  marks: number;
  order_index: number;
  options?: ExamOption[];
  file_type?: string;
  max_file_size_mb?: number;
}

interface FinalExam {
  id: string;
  title: string;
  description: string;
  total_marks: number;
  time_limit_minutes: number;
  exam_mode: string;
  instructions: string;
  available_from?: string;
  available_until?: string;
  questions?: ExamQuestion[];
}

interface Submission {
  submission_id: string;
  total_score: number;
  passed: boolean;
  passing_marks: number;
}

const StudentExamPage = () => {
  const { userId } = useAuth();
  const { courseId, examId } = useParams();
  
  const [exam, setExam] = useState<FinalExam | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'in-progress' | 'submitted'>('loading');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (courseId && examId && userId) {
      fetchExam();
    }
  }, [courseId, examId, userId]);

  // Timer effect
  useEffect(() => {
    if (status === 'in-progress' && timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === 'in-progress' && timeRemaining === 0 && submissionId) {
      handleSubmitExam();
    }
  }, [timeRemaining, status, submissionId]);

  // Auto-save answers
  useEffect(() => {
    if (status === 'in-progress' && submissionId && Object.keys(answers).length > 0) {
      const saveTimer = setTimeout(() => {
        saveAnswers();
      }, 30000); // Auto-save every 30 seconds
      return () => clearTimeout(saveTimer);
    }
  }, [answers, status, submissionId]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/student/exams/${examId}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setExam(data);
        setStatus('ready');
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    }
  };

  const handleStartExam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/student/exams/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exam_id: examId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissionId(data.submission_id);
        setTimeRemaining((exam?.time_limit_minutes || 120) * 60);
        setStatus('in-progress');
      }
    } catch (error) {
      console.error('Error starting exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAnswers = async () => {
    if (!submissionId) return;
    try {
      for (const [questionId, answer] of Object.entries(answers)) {
        await fetch('/api/student/exams/save-answer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            submission_id: submissionId,
            question_id: questionId,
            student_answer: answer
          })
        });
      }
    } catch (error) {
      console.error('Error saving answers:', error);
    }
  };

  const handleSubmitExam = async () => {
    try {
      if (!submissionId) return;
      setLoading(true);

      const response = await fetch('/api/student/exams/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submission_id: submissionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubmission(data);
        setStatus('submitted');
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (status === 'loading') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (status === 'submitted' && submission) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
              submission.passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-3xl ${submission.passed ? 'text-green-600' : 'text-red-600'}`}>
                {submission.passed ? '✓' : '✗'}
              </span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {submission.passed ? 'Exam Passed!' : 'Exam Submitted'}
            </h1>
            
            <div className="bg-gray-50 rounded-lg p-6 my-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Your Score</p>
                  <p className="text-2xl font-bold text-blue-600">{submission.total_score}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Marks</p>
                  <p className="text-2xl font-bold text-gray-800">{exam?.total_marks}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Passing Marks</p>
                  <p className="text-2xl font-bold text-green-600">{submission.passing_marks}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Percentage</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round((submission.total_score / (exam?.total_marks || 100)) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {submission.passed
                ? 'Congratulations! You have successfully completed the final exam.'
                : 'You did not meet the passing score. Please review the course materials and try again.'}
            </p>

            <a
              href={`/student/courses/${courseId}`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Course
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'ready' && !submissionId) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-[#1B365D] mb-2">{exam?.title}</h1>
            <p className="text-gray-600 mb-6">{exam?.description}</p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-gray-600 text-sm">Total Marks</p>
                  <p className="text-2xl font-bold text-blue-600">{exam?.total_marks}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Time Limit</p>
                  <p className="text-2xl font-bold text-blue-600">{exam?.time_limit_minutes} min</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Questions</p>
                  <p className="text-2xl font-bold text-blue-600">{exam?.questions?.length || 0}</p>
                </div>
              </div>
            </div>

            {exam?.instructions && (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
                <h3 className="font-bold text-[#1B365D] mb-2">Instructions</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{exam.instructions}</p>
              </div>
            )}

            <button
              onClick={handleStartExam}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="sticky top-0 z-40 bg-[#1B365D] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{exam?.title}</h2>
            <p className="text-sm text-blue-100">Question {Object.keys(answers).length} of {exam?.questions?.length || 0}</p>
          </div>
          <div className={`text-center ${timeRemaining < 300 ? 'animate-pulse' : ''}`}>
            <p className="text-sm text-blue-100">Time Remaining</p>
            <p className={`text-3xl font-bold ${
              timeRemaining < 300 ? 'text-red-400' : 'text-green-400'
            }`}>
              {formatTime(timeRemaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="space-y-8">
          {(exam?.questions || []).map((question, idx) => (
            <div key={question.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-[#1B365D]">
                    Question {idx + 1} of {exam?.questions?.length}
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                    {question.marks} mark{question.marks > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-gray-800">{question.question_text}</p>
              </div>

              {question.question_type === 'multiple_choice' && (
                <div className="space-y-3">
                  {(question.options || []).map((option) => (
                    <label key={option.id} className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={answers[question.id] === option.id}
                        onChange={(e) =>
                          setAnswers({ ...answers, [question.id]: e.target.value })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-3 text-gray-700">{option.option_text}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.question_type === 'text_response' && (
                <textarea
                  placeholder="Write your answer here..."
                  value={answers[question.id] || ''}
                  onChange={(e) =>
                    setAnswers({ ...answers, [question.id]: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  rows={6}
                />
              )}

              {question.question_type === 'file_upload' && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept={question.file_type}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAnswers({ ...answers, [question.id]: file.name });
                      }
                    }}
                    className="hidden"
                    id={`file-${question.id}`}
                  />
                  <label htmlFor={`file-${question.id}`} className="cursor-pointer">
                    <p className="text-gray-600">Click to upload file</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Max size: {question.max_file_size_mb}MB
                    </p>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex gap-4 sticky bottom-0">
          <button
            onClick={() => saveAnswers()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
          >
            Save Progress
          </button>
          <button
            onClick={handleSubmitExam}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50"
          >
            Submit Exam
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentExamPage;
