"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function CreateAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    total_marks: 10,
    deadline: "",
    allow_file_upload: true,
    allow_text_submission: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lesson_id: lessonId,
          title: formData.title,
          activity_type: "assignment",
          description: formData.description,
          total_marks: formData.total_marks,
          deadline: formData.deadline || null,
        }),
      });

      if (response.ok) {
        alert("Assignment created successfully!");
        router.push(`/teacher/courses/${courseId}/edit`);
      } else {
        throw new Error("Failed to create assignment");
      }
    } catch (err) {
      console.error("Failed to create assignment", err);
      alert("Failed to create assignment");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-blue-100 p-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            Create Assignment
          </h1>
          <p className="text-gray-600 mb-8">
            Create an assignment that students can submit. You'll manually
            grade their submissions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Essay on The Life of Prophet Muhammad (PBUH)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description / Instructions *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Provide detailed instructions for the assignment..."
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Marks *
                </label>
                <input
                  type="number"
                  value={formData.total_marks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_marks: Number(e.target.value),
                    })
                  }
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deadline (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-4">
                Submission Options
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.allow_file_upload}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allow_file_upload: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Allow students to upload files (PDF, images, documents)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.allow_text_submission}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allow_text_submission: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Allow students to submit text answers
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 text-xl">ℹ️</div>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Manual Grading Required</p>
                  <p>
                    After students submit their assignments, you'll need to
                    review them, provide feedback, and assign marks manually
                    from the Grades page.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
