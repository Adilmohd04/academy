"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Course {
  course_id: string;
  title: string;
  description: string;
  course_type: string;
  category: string;
  level: string;
  price: number;
  is_free: boolean;
  enrollment_cap: number | null;
  teacher_name: string;
  created_at: string;
  sections_count: number;
  lessons_count: number;
}

export default function PendingCoursesPage() {
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [overridePrice, setOverridePrice] = useState<number>(0);
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    loadPendingCourses();
  }, []);

  const loadPendingCourses = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/courses/pending/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCourses(data);
      }
    } catch (err) {
      console.error("Failed to load pending courses", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCourse = async (courseId: string, priceOverride?: number) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/courses/${courseId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            price_override: priceOverride || undefined,
          }),
        }
      );

      if (response.ok) {
        alert("Course approved successfully!");
        setSelectedCourse(null);
        setShowPriceOverride(false);
        loadPendingCourses();
      }
    } catch (err) {
      console.error("Failed to approve course", err);
      alert("Failed to approve course");
    }
  };

  const handleRejectCourse = async (courseId: string) => {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/courses/${courseId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      if (response.ok) {
        alert("Course rejected");
        setSelectedCourse(null);
        setShowRejectForm(false);
        setRejectReason("");
        loadPendingCourses();
      }
    } catch (err) {
      console.error("Failed to reject course", err);
      alert("Failed to reject course");
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
    <div className="admin-page-wrap space-y-6">
      <div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-8">
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">
            Pending Course Approvals
          </h1>
          <p className="text-gray-600 mb-8">
            Review and approve courses submitted by teachers
          </p>

          {courses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No pending courses for approval
            </div>
          ) : (
            <div className="space-y-6">
              {courses.map((course) => (
                <div
                  key={course.course_id}
                  className="border border-emerald-200 rounded-lg p-6 bg-white hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h2 className="text-2xl font-bold text-gray-800">
                          {course.title}
                        </h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          {course.course_type}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                          {course.category}
                        </span>
                      </div>

                      <p className="text-gray-700 mb-4">{course.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Teacher</p>
                          <p className="font-semibold text-gray-800">
                            {course.teacher_name}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Price</p>
                          <p className="font-semibold text-gray-800">
                            {course.is_free ? (
                              <span className="text-green-600">FREE</span>
                            ) : (
                              `₹${course.price}`
                            )}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Level</p>
                          <p className="font-semibold text-gray-800 capitalize">
                            {course.level}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-600">Enrollment Cap</p>
                          <p className="font-semibold text-gray-800">
                            {course.enrollment_cap || "Unlimited"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-6 text-sm text-gray-600">
                        <span>📚 {course.sections_count} sections</span>
                        <span>📖 {course.lessons_count} lessons</span>
                        <span>
                          📅{" "}
                          {new Date(course.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 ml-6">
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setOverridePrice(course.price);
                          setShowPriceOverride(true);
                        }}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setShowRejectForm(true);
                        }}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap"
                      >
                        ✗ Reject
                      </button>
                      <button
                        onClick={() => setSelectedCourse(course)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                      >
                        👁 View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Details Modal */}
        {selectedCourse && !showPriceOverride && !showRejectForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-emerald-800 mb-6">
                Course Details
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Title
                  </label>
                  <p className="text-lg font-semibold text-gray-800">
                    {selectedCourse.title}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Description
                  </label>
                  <p className="text-gray-800">{selectedCourse.description}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Category
                    </label>
                    <p className="text-gray-800 capitalize">
                      {selectedCourse.category}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Level
                    </label>
                    <p className="text-gray-800 capitalize">
                      {selectedCourse.level}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Type
                    </label>
                    <p className="text-gray-800">{selectedCourse.course_type}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCourse(null)}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Price Override Modal */}
        {showPriceOverride && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-emerald-800 mb-6">
                Approve Course
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Override Price (Optional)
                </label>
                <input
                  type="number"
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Original price: ₹{selectedCourse.price}
                  {selectedCourse.is_free && " (Free)"}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowPriceOverride(false);
                    setSelectedCourse(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    handleApproveCourse(
                      selectedCourse.course_id,
                      overridePrice !== selectedCourse.price
                        ? overridePrice
                        : undefined
                    )
                  }
                  className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Approve Course
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectForm && selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-red-800 mb-6">
                Reject Course
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  placeholder="Provide detailed reason for rejection..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setSelectedCourse(null);
                    setRejectReason("");
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRejectCourse(selectedCourse.course_id)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
