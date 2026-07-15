'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams } from 'next/navigation';

interface ExamQuestion {
  id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'text_response' | 'file_upload';
  marks?: number;
  order_index?: number;
  explanation?: string;
  options?: {
    id?: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

interface FinalExam {
  id?: string;
  title: string;
  description: string;
  total_marks: number;
  passing_marks: number;
  time_limit_minutes: number;
  exam_mode: 'timer' | 'no_timer' | 'proctored';
  instructions: string;
  is_published: boolean;
  available_from?: string;
  available_until?: string;
  scheduled_publish_time?: string;
  questions?: ExamQuestion[];
}

const ExamBuilder = () => {
  const { userId } = useAuth();
  const { courseId } = useParams();
  const [exam, setExam] = useState<FinalExam>({
    title: 'Final Examination',
    description: '',
    total_marks: 100,
    passing_marks: 40,
    time_limit_minutes: 120,
    exam_mode: 'timer',
    instructions: '',
    is_published: false,
    questions: []
  });

  const [selectedQuestion, setSelectedQuestion] = useState<ExamQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchExam();
    }
  }, [courseId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/exams/${courseId}`, {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      const data = await response.json();
      if (response.ok) {
        setExam(data);
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveExam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({
          ...exam,
          course_id: courseId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExam(data);
        setMessage('Exam saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      setMessage('Error saving exam');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = async () => {
    const newQuestion: ExamQuestion = {
      question_text: 'New Question',
      question_type: 'multiple_choice',
      marks: 1,
      order_index: (exam.questions?.length || 0) + 1,
      options: [
        { option_text: 'Option 1', is_correct: false, order_index: 0 },
        { option_text: 'Option 2', is_correct: true, order_index: 1 },
        { option_text: 'Option 3', is_correct: false, order_index: 2 },
        { option_text: 'Option 4', is_correct: false, order_index: 3 }
      ]
    };

    setExam({
      ...exam,
      questions: [...(exam.questions || []), newQuestion]
    });
    setSelectedQuestion(newQuestion);
  };

  const updateQuestion = (index: number, updates: Partial<ExamQuestion>) => {
    const updated = [...(exam.questions || [])];
    updated[index] = { ...updated[index], ...updates };
    setExam({ ...exam, questions: updated });
    setSelectedQuestion(updated[index]);
  };

  const deleteQuestion = (index: number) => {
    const updated = (exam.questions || []).filter((_, i) => i !== index);
    setExam({ ...exam, questions: updated });
    setSelectedQuestion(null);
  };

  const autoFillFromImport = () => {
    // Parse import text: "Question text\nA) Option 1\nB) Option 2 (correct)\nC) Option 3"
    const lines = importText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      setMessage('Please paste question with at least 2 options');
      return;
    }

    const questionText = lines[0];
    const options = lines.slice(1).map((line, idx) => {
      const isCorrect = line.includes('correct') || line.includes('✓');
      const optionText = line.replace(/^\w\)\s*/, '').replace(/\s*\(correct\)|\s*✓/i, '').trim();
      return {
        option_text: optionText,
        is_correct: isCorrect,
        order_index: idx
      };
    });

    const newQuestion: ExamQuestion = {
      question_text: questionText,
      question_type: 'multiple_choice',
      marks: 1,
      options: options.length > 0 ? options : undefined
    };

    setExam({
      ...exam,
      questions: [...(exam.questions || []), newQuestion]
    });
    setImportText('');
    setShowImportModal(false);
    setMessage('Question imported successfully!');
  };

  const togglePublish = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/exams/publish', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({
          exam_id: exam.id,
          is_published: !exam.is_published
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExam(data);
        setMessage(`Exam ${data.is_published ? 'published' : 'unpublished'}!`);
      }
    } catch (error) {
      console.error('Error toggling publish:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedQuestionIndex = selectedQuestion ? (exam.questions?.indexOf(selectedQuestion) ?? -1) : -1;

  return (
    <div className="w-full p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1B365D] mb-2">Final Exam Builder</h1>
          <p className="text-gray-600">Create and manage end-of-course final exams</p>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">
            {message}
          </div>
        )}

        {/* Exam Settings */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-[#1B365D] mb-4">Exam Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Exam Title"
              value={exam.title}
              onChange={(e) => setExam({ ...exam, title: e.target.value })}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Total Marks"
              value={exam.total_marks}
              onChange={(e) => setExam({ ...exam, total_marks: parseInt(e.target.value) })}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Passing Marks"
              value={exam.passing_marks}
              onChange={(e) => setExam({ ...exam, passing_marks: parseInt(e.target.value) })}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <input
              type="number"
              placeholder="Time Limit (minutes)"
              value={exam.time_limit_minutes}
              onChange={(e) => setExam({ ...exam, time_limit_minutes: parseInt(e.target.value) })}
              className="p-3 border border-gray-300 rounded-lg"
            />
            <select
              value={exam.exam_mode}
              onChange={(e) => setExam({ ...exam, exam_mode: e.target.value as any })}
              className="p-3 border border-gray-300 rounded-lg"
            >
              <option value="timer">Timer Mode</option>
              <option value="no_timer">No Timer</option>
              <option value="proctored">Proctored</option>
            </select>
            <input
              type="datetime-local"
              placeholder="Scheduled Publish Time"
              value={exam.scheduled_publish_time || ''}
              onChange={(e) => setExam({ ...exam, scheduled_publish_time: e.target.value })}
              className="p-3 border border-gray-300 rounded-lg"
            />
          </div>
          <textarea
            placeholder="Instructions for students"
            value={exam.instructions}
            onChange={(e) => setExam({ ...exam, instructions: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg mt-4"
            rows={4}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveExam}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Save Exam
            </button>
            <button
              onClick={togglePublish}
              disabled={loading}
              className={`px-6 py-2 rounded-lg text-white ${
                exam.is_published
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-green-600 hover:bg-green-700'
              } disabled:opacity-50`}
            >
              {exam.is_published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6 flex gap-2">
          <span className={`px-4 py-2 rounded-full text-white font-semibold ${
            exam.is_published ? 'bg-green-600' : 'bg-gray-500'
          }`}>
            {exam.is_published ? 'Published' : 'Draft'}
          </span>
          <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-semibold">
            {exam.questions?.length || 0} Questions
          </span>
        </div>

        {/* Questions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-[#1B365D] mb-4">Questions</h3>
            <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
              {(exam.questions || []).map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedQuestion(q)}
                  className={`p-3 cursor-pointer rounded-lg border-2 transition ${
                    selectedQuestion === q
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-700">Q{idx + 1}</p>
                  <p className="text-xs text-gray-600 truncate">{q.question_text}</p>
                  <p className="text-xs text-blue-600 mt-1">{q.marks} marks</p>
                </div>
              ))}
            </div>
            <button
              onClick={addQuestion}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Add Question
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mt-2"
            >
              Quick Import
            </button>
          </div>

          {/* Question Editor */}
          <div className="lg:col-span-2">
            {selectedQuestion && selectedQuestionIndex >= 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-[#1B365D] mb-4">
                  Question {selectedQuestionIndex + 1}
                </h3>

                <input
                  type="text"
                  placeholder="Question text"
                  value={selectedQuestion.question_text}
                  onChange={(e) =>
                    updateQuestion(selectedQuestionIndex, {
                      question_text: e.target.value
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                />

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={selectedQuestion.question_type}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex, {
                        question_type: e.target.value as any
                      })
                    }
                    className="p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="text_response">Text Response</option>
                    <option value="file_upload">File Upload</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Marks"
                    value={selectedQuestion.marks || 1}
                    onChange={(e) =>
                      updateQuestion(selectedQuestionIndex, {
                        marks: parseInt(e.target.value)
                      })
                    }
                    className="p-3 border border-gray-300 rounded-lg"
                  />
                </div>

                {/* Options for Multiple Choice */}
                {selectedQuestion.question_type === 'multiple_choice' && (
                  <div className="mb-4">
                    <h4 className="font-bold text-gray-700 mb-2">Options</h4>
                    <div className="space-y-2">
                      {(selectedQuestion.options || []).map((option, optIdx) => (
                        <div key={optIdx} className="flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={option.is_correct}
                            onChange={(e) => {
                              const updated = [...(selectedQuestion.options || [])];
                              updated[optIdx].is_correct = e.target.checked;
                              updateQuestion(selectedQuestionIndex, { options: updated });
                            }}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${optIdx + 1}`}
                            value={option.option_text}
                            onChange={(e) => {
                              const updated = [...(selectedQuestion.options || [])];
                              updated[optIdx].option_text = e.target.value;
                              updateQuestion(selectedQuestionIndex, { options: updated });
                            }}
                            className="flex-1 p-2 border border-gray-300 rounded-lg"
                          />
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            option.is_correct
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {option.is_correct ? 'Correct' : 'Wrong'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  placeholder="Explanation (optional)"
                  value={selectedQuestion.explanation || ''}
                  onChange={(e) =>
                    updateQuestion(selectedQuestionIndex, { explanation: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                  rows={3}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => deleteQuestion(selectedQuestionIndex)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Question
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                Select or create a question to edit
              </div>
            )}
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Quick Import Question</h3>
              <p className="text-gray-600 text-sm mb-4">
                Paste question text and options. Mark correct answer with (correct) or ✓
              </p>
              <textarea
                placeholder="Question text&#10;A) Option 1&#10;B) Option 2 (correct)&#10;C) Option 3"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                rows={6}
              />
              <div className="flex gap-2">
                <button
                  onClick={autoFillFromImport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Import
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamBuilder;
