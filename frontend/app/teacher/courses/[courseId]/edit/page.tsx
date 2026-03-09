"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Course {
  course_id: string;
  title: string;
  approval_status: string;
}

interface Section {
  section_id: string;
  title: string;
  display_order: number;
  lessons: Lesson[];
}

interface Lesson {
  lesson_id: string;
  title: string;
  lesson_type: string;
  video_url?: string;
  duration_minutes?: number;
  display_order: number;
  resources: Resource[];
  activities: Activity[];
}

interface Resource {
  resource_id: string;
  title: string;
  resource_type: string;
  file_url: string;
}

interface Activity {
  activity_id: string;
  title: string;
  activity_type: string;
  total_marks: number;
}

export default function CourseBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Section form state
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");

  // Lesson form state
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [lessonData, setLessonData] = useState({
    title: "",
    lesson_type: "video",
    video_url: "",
    duration_minutes: 0,
  });

  // Resource form state
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [resourceData, setResourceData] = useState({
    title: "",
    resource_type: "pdf",
    file_url: "",
  });

  // Activity selection
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [activityLessonId, setActivityLessonId] = useState("");

  useEffect(() => {
    loadCourse();
    loadSections();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCourse(data);
      }
    } catch (err) {
      console.error("Failed to load course", err);
    }
  };

  const loadSections = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/sections?course_id=${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (response.ok) {
        // Load lessons for each section
        const sectionsWithLessons = await Promise.all(
          data.map(async (section: Section) => {
            const lessonsResponse = await fetch(
              `${API_BASE_URL}/api/lessons?section_id=${section.section_id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const lessons = await lessonsResponse.json();

            // Load resources and activities for each lesson
            const lessonsWithDetails = await Promise.all(
              lessons.map(async (lesson: Lesson) => {
                const [resourcesResponse, activitiesResponse] =
                  await Promise.all([
                    fetch(
                      `${API_BASE_URL}/api/resources?lesson_id=${lesson.lesson_id}`,
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    ),
                    fetch(
                      `${API_BASE_URL}/api/activities?lesson_id=${lesson.lesson_id}`,
                      {
                        headers: { Authorization: `Bearer ${token}` },
                      }
                    ),
                  ]);

                const resources = await resourcesResponse.json();
                const activities = await activitiesResponse.json();

                return { ...lesson, resources, activities };
              })
            );

            return { ...section, lessons: lessonsWithDetails };
          })
        );

        setSections(sectionsWithLessons);
      }
    } catch (err) {
      console.error("Failed to load sections", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSection = async () => {
    if (!sectionTitle.trim()) return;

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/sections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: courseId,
          title: sectionTitle,
          display_order: sections.length + 1,
        }),
      });

      if (response.ok) {
        setSectionTitle("");
        setShowSectionForm(false);
        loadSections();
      }
    } catch (err) {
      console.error("Failed to add section", err);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonData.title.trim() || !selectedSectionId) return;

    try {
      const token = await getToken();
      const section = sections.find((s) => s.section_id === selectedSectionId);
      const response = await fetch(`${API_BASE_URL}/api/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section_id: selectedSectionId,
          ...lessonData,
          display_order: (section?.lessons.length || 0) + 1,
        }),
      });

      if (response.ok) {
        setLessonData({
          title: "",
          lesson_type: "video",
          video_url: "",
          duration_minutes: 0,
        });
        setShowLessonForm(false);
        loadSections();
      }
    } catch (err) {
      console.error("Failed to add lesson", err);
    }
  };

  const handleAddResource = async () => {
    if (!resourceData.title.trim() || !selectedLessonId) return;

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/resources`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lesson_id: selectedLessonId,
          ...resourceData,
        }),
      });

      if (response.ok) {
        setResourceData({
          title: "",
          resource_type: "pdf",
          file_url: "",
        });
        setShowResourceForm(false);
        loadSections();
      }
    } catch (err) {
      console.error("Failed to add resource", err);
    }
  };

  const handleSubmitForApproval = async () => {
    if (sections.length === 0) {
      alert("Please add at least one section before submitting for approval");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/courses/${courseId}/submit`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        alert("Course submitted for admin approval!");
        router.push("/teacher/courses");
      }
    } catch (err) {
      console.error("Failed to submit course", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-emerald-800">
                {course?.title}
              </h1>
              <p className="text-gray-600 mt-1">
                Build your course structure: Sections → Lessons → Resources →
                Activities
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              {course?.approval_status === "draft" && (
                <button
                  onClick={handleSubmitForApproval}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Submit for Approval
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section List */}
        <div className="space-y-6">
          {sections.map((section, sectionIndex) => (
            <div
              key={section.section_id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-emerald-700">
                  {section.title}
                </h2>
                <button
                  onClick={() => {
                    setSelectedSectionId(section.section_id);
                    setShowLessonForm(true);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                >
                  + Add Lesson
                </button>
              </div>

              {/* Lesson List */}
              <div className="space-y-4 ml-4">
                {section.lessons.map((lesson) => (
                  <div
                    key={lesson.lesson_id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">
                          {lesson.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {lesson.lesson_type}
                          {lesson.video_url && ` • Video: ${lesson.video_url}`}
                          {lesson.duration_minutes &&
                            ` • ${lesson.duration_minutes} min`}
                        </p>

                        {/* Resources */}
                        {lesson.resources.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              Resources:
                            </p>
                            <div className="space-y-1">
                              {lesson.resources.map((resource) => (
                                <div
                                  key={resource.resource_id}
                                  className="text-xs text-gray-600 ml-4"
                                >
                                  📎 {resource.title} ({resource.resource_type})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Activities */}
                        {lesson.activities.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              Activities:
                            </p>
                            <div className="space-y-1">
                              {lesson.activities.map((activity) => (
                                <div
                                  key={activity.activity_id}
                                  className="text-xs text-gray-600 ml-4"
                                >
                                  ✍️ {activity.title} ({activity.activity_type}
                                  ) - {activity.total_marks} marks
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedLessonId(lesson.lesson_id);
                            setShowResourceForm(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          + Resource
                        </button>
                        <button
                          onClick={() => {
                            setActivityLessonId(lesson.lesson_id);
                            setShowActivityMenu(true);
                          }}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                        >
                          + Activity
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Section Button */}
        <div className="mt-6">
          {!showSectionForm ? (
            <button
              onClick={() => setShowSectionForm(true)}
              className="w-full py-4 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              + Add Section (Week, Chapter, Module, etc.)
            </button>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-emerald-200">
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g., Week 1: Introduction to Tajweed"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddSection}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Add Section
                </button>
                <button
                  onClick={() => setShowSectionForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Form Modal */}
        {showLessonForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold text-emerald-800 mb-6">
                Add Lesson
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={lessonData.title}
                  onChange={(e) =>
                    setLessonData({ ...lessonData, title: e.target.value })
                  }
                  placeholder="Lesson Title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <select
                  value={lessonData.lesson_type}
                  onChange={(e) =>
                    setLessonData({
                      ...lessonData,
                      lesson_type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="live_session">Live Session</option>
                </select>
                {lessonData.lesson_type === "video" && (
                  <>
                    <input
                      type="url"
                      value={lessonData.video_url}
                      onChange={(e) =>
                        setLessonData({
                          ...lessonData,
                          video_url: e.target.value,
                        })
                      }
                      placeholder="YouTube Video URL"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      value={lessonData.duration_minutes}
                      onChange={(e) =>
                        setLessonData({
                          ...lessonData,
                          duration_minutes: Number(e.target.value),
                        })
                      }
                      placeholder="Duration (minutes)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    />
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddLesson}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Add Lesson
                </button>
                <button
                  onClick={() => setShowLessonForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resource Form Modal */}
        {showResourceForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold text-emerald-800 mb-6">
                Add Resource
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={resourceData.title}
                  onChange={(e) =>
                    setResourceData({ ...resourceData, title: e.target.value })
                  }
                  placeholder="Resource Title"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <select
                  value={resourceData.resource_type}
                  onChange={(e) =>
                    setResourceData({
                      ...resourceData,
                      resource_type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                >
                  <option value="pdf">PDF</option>
                  <option value="slides">Slides</option>
                  <option value="document">Document</option>
                  <option value="audio">Audio</option>
                  <option value="link">External Link</option>
                </select>
                <input
                  type="url"
                  value={resourceData.file_url}
                  onChange={(e) =>
                    setResourceData({
                      ...resourceData,
                      file_url: e.target.value,
                    })
                  }
                  placeholder="File URL or Link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddResource}
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Add Resource
                </button>
                <button
                  onClick={() => setShowResourceForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Menu Modal */}
        {showActivityMenu && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-emerald-800 mb-6">
                Add Activity
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    router.push(
                      `/teacher/courses/${courseId}/lessons/${activityLessonId}/quiz/create`
                    );
                  }}
                  className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-left"
                >
                  <div className="font-semibold">📝 Create Quiz</div>
                  <div className="text-sm opacity-90">
                    Auto-graded with MCQ, text, image, audio questions
                  </div>
                </button>
                <button
                  onClick={() => {
                    router.push(
                      `/teacher/courses/${courseId}/lessons/${activityLessonId}/assignment/create`
                    );
                  }}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left"
                >
                  <div className="font-semibold">📄 Create Assignment</div>
                  <div className="text-sm opacity-90">
                    Manual grading with file uploads
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowActivityMenu(false)}
                className="w-full mt-4 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
