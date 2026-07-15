"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Question {
  question_text: string;
  question_type: "text" | "mcq" | "image" | "audio";
  image_url?: string;
  audio_url?: string;
  options?: string[];
  correct_answer: string;
  marks: number;
}

export default function CreateQuizPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [loading, setLoading] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(0);
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question_text: "",
    question_type: "text",
    options: ["", "", "", ""],
    correct_answer: "",
    marks: 1,
  });

  const handleAddQuestion = () => {
    if (!currentQuestion.question_text || !currentQuestion.correct_answer) {
      alert("Please fill in question text and correct answer");
      return;
    }

    setQuestions([...questions, currentQuestion]);
    setTotalMarks(totalMarks + currentQuestion.marks);

    // Reset form
    setCurrentQuestion({
      question_text: "",
      question_type: "text",
      options: ["", "", "", ""],
      correct_answer: "",
      marks: 1,
    });
  };

  const handleRemoveQuestion = (index: number) => {
    const removed = questions[index];
    setTotalMarks(totalMarks - removed.marks);
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!quizTitle || questions.length === 0) {
      alert("Please add a title and at least one question");
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      // Create activity
      const activityResponse = await fetch(`${API_BASE_URL}/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          title: quizTitle,
          activity_type: "quiz",
          total_marks: totalMarks,
          deadline: deadline || null,
        }),
      });

      const activityData = await activityResponse.json();
      if (!activityResponse.ok) throw new Error("Failed to create quiz");

      // Add questions
      for (const question of questions) {
        await fetch(`${API_BASE_URL}/api/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            activity_id: activityData.activity_id,
            ...question,
          }),
        });
      }

      alert("Quiz created successfully!");
      router.push(`/teacher/courses/${courseId}/builder?tab=content`);
    } catch (err) {
      console.error("Failed to create quiz", err);
      alert("Failed to create quiz");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100 p-8">
          <h1 className="text-3xl font-bold text-purple-800 mb-6">
            Create Quiz
          </h1>

          {/* Quiz Settings */}
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                placeholder="e.g., Week 1 Quiz: Introduction to Tajweed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks (Auto-calculated)
                </label>
                <input
                  type="number"
                  value={totalMarks}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Question Builder */}
          <div className="border border-purple-200 rounded-lg p-6 bg-purple-50 mb-6">
            <h2 className="text-xl font-bold text-purple-800 mb-4">
              Add Question
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <select
                  value={currentQuestion.question_type}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      question_type: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="text">Text Answer</option>
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="image">Image-based Question</option>
                  <option value="audio">Audio-based Question</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text *
                </label>
                <textarea
                  value={currentQuestion.question_text}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      question_text: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="Enter your question here..."
                />
              </div>

              {currentQuestion.question_type === "image" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={currentQuestion.image_url || ""}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        image_url: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}

              {currentQuestion.question_type === "audio" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio URL
                  </label>
                  <input
                    type="url"
                    value={currentQuestion.audio_url || ""}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        audio_url: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="https://example.com/audio.mp3"
                  />
                </div>
              )}

              {currentQuestion.question_type === "mcq" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options
                  </label>
                  {currentQuestion.options?.map((option, index) => (
                    <input
                      key={index}
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(currentQuestion.options || [])];
                        newOptions[index] = e.target.value;
                        setCurrentQuestion({
                          ...currentQuestion,
                          options: newOptions,
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                      placeholder={`Option ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer *
                </label>
                {currentQuestion.question_type === "mcq" ? (
                  <select
                    value={currentQuestion.correct_answer}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        correct_answer: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select correct option</option>
                    {currentQuestion.options?.map((option, index) => (
                      <option key={index} value={option}>
                        {option || `Option ${index + 1}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={currentQuestion.correct_answer}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        correct_answer: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="Enter the correct answer"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marks for this question
                </label>
                <input
                  type="number"
                  value={currentQuestion.marks}
                  onChange={(e) =>
                    setCurrentQuestion({
                      ...currentQuestion,
                      marks: Number(e.target.value),
                    })
                  }
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <button
                onClick={handleAddQuestion}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add Question to Quiz
              </button>
            </div>
          </div>

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-purple-800 mb-4">
                Questions ({questions.length})
              </h2>
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 bg-white flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        Q{index + 1}. {q.question_text}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Type: {q.question_type} • Marks: {q.marks} • Answer:{" "}
                        {q.correct_answer}
                      </div>
                      {q.question_type === "mcq" && (
                        <div className="text-xs text-gray-500 mt-2">
                          Options: {q.options?.join(", ")}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(index)}
                      className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || questions.length === 0}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? "Creating..." : "Create Quiz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
