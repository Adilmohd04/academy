"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { utcToLocal, localToUTC } from "@/lib/dateUtils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface CourseFormData {
  title: string;
  description: string;
  short_description: string;
  long_description: string;
  course_type: "pre-recorded" | "live" | "hybrid";
  category: string;
  tags: string;
  level: string;
  price: number;
  is_free: boolean;
  enrollment_cap: number | null;
  prerequisites: string;
  passing_threshold: number;
  course_image_url: string;
  thumbnail_image: string;
  learning_outcomes: string;
  skills_gained: string;
  teacher_title: string;
  teacher_bio: string;
  estimated_hours: number | null;
  language: string[];
  starts_at: string;
  mentoring_text: string;
  schedule_frequency: string;
  schedule_timezone: string;
  enrollment_deadline: string;
  course_format_description: string;
}

export default function CreateCoursePage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    short_description: "",
    long_description: "",
    course_type: "pre-recorded",
    category: "",
    tags: "",
    level: "beginner",
    price: 0,
    is_free: false,
    enrollment_cap: null,
    prerequisites: "",
    passing_threshold: 70,
    course_image_url: "",
    thumbnail_image: "",
    // Professional course fields
    learning_outcomes: "",
    skills_gained: "",
    teacher_title: "",
    teacher_bio: "",
    estimated_hours: null,
    language: ["English"],
    starts_at: "",
    // Coursera-style fields
    mentoring_text: "",
    schedule_frequency: "",
    schedule_timezone: "UTC",
    enrollment_deadline: "",
    course_format_description: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === "is_free" && checked ? { price: 0 } : {}),
      }));
    } else if (type === "number") {
      const numValue = value === "" ? null : Number(value);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      // Redirect to course builder to add sections/lessons
      router.push(`/teacher/courses/${data.course_id}/edit`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-8">
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">
            Create New Course
          </h1>
          <p className="text-gray-600 mb-8">
            Fill in the details below to create a new course. After creation,
            you'll be able to add sections, lessons, and activities.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Advanced Quranic Arabic"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Describe what students will learn in this course..."
              />
            </div>

            {/* Course Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Type *
              </label>
              <select
                name="course_type"
                value={formData.course_type}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="pre-recorded">Pre-Recorded Videos</option>
                <option value="live">Live Sessions Only</option>
                <option value="hybrid">Hybrid (Pre-recorded + Live)</option>
              </select>
            </div>

            {/* Category and Level */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select Category</option>
                  <option value="quran">Quran</option>
                  <option value="arabic">Arabic Language</option>
                  <option value="fiqh">Fiqh (Islamic Law)</option>
                  <option value="aqeedah">Aqeedah (Creed)</option>
                  <option value="hadith">Hadith Studies</option>
                  <option value="seerah">Seerah (Prophet's Biography)</option>
                  <option value="islamic-history">Islamic History</option>
                  <option value="tajweed">Tajweed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level *
                </label>
                <select
                  name="level"
                  value={formData.level}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Price and Free Toggle */}
            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  name="is_free"
                  checked={formData.is_free}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label className="text-sm font-medium text-gray-700">
                  Make this course free for all students
                </label>
              </div>

              {!formData.is_free && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price || ""}
                    onChange={handleInputChange}
                    required={!formData.is_free}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Admin can override this price after approval
                  </p>
                </div>
              )}
            </div>

            {/* Enrollment Cap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrollment Cap (Optional)
              </label>
              <input
                type="number"
                name="enrollment_cap"
                value={formData.enrollment_cap || ""}
                onChange={handleInputChange}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Leave empty for unlimited enrollment"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of students that can enroll
              </p>
            </div>

            {/* START: NEW PROFESSIONAL FIELDS */}
            
            {/* Learning Outcomes */}
            <div className="border-t-2 border-emerald-200 pt-6">
              <h3 className="text-lg font-semibold text-emerald-800 mb-4">📚 Course Content Details</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Outcomes *
                </label>
                <textarea
                  name="learning_outcomes"
                  value={formData.learning_outcomes}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter each learning outcome on a new line, e.g.:&#10;Master Tajweed rules for proper Quran recitation&#10;Understand the meanings of common Quranic verses&#10;Apply proper pronunciation of Arabic letters"
                />
                <p className="text-xs text-gray-500 mt-1">
                  List what students will be able to do after completing this course (one per line)
                </p>
              </div>

              {/* Skills Gained */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills Gained *
                </label>
                <input
                  type="text"
                  name="skills_gained"
                  value={formData.skills_gained}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Tajweed, Quranic Arabic, Recitation, Memorization"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated list of skills students will gain
                </p>
              </div>

              {/* Estimated Hours */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Duration (in weeks) *
                </label>
                <input
                  type="number"
                  name="estimated_hours"
                  value={formData.estimated_hours || ""}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., 8"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of weeks students should expect to complete this course
                </p>
              </div>

              {/* Language */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Languages * (Select all that apply)
                </label>
                <div className="space-y-2">
                  {['English', 'Tamil', 'Arabic', 'Urdu', 'Hindi', 'Malayalam', 'Bengali'].map((lang) => (
                    <label key={lang} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(formData.language) ? formData.language.includes(lang) : formData.language === lang}
                        onChange={(e) => {
                          const currentLangs = Array.isArray(formData.language) ? formData.language : [formData.language];
                          if (e.target.checked) {
                            setFormData({ ...formData, language: [...currentLangs, lang] });
                          } else {
                            setFormData({ ...formData, language: currentLangs.filter(l => l !== lang) });
                          }
                        }}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Instructor Information */}
            <div className="border-t-2 border-emerald-200 pt-6">
              <h3 className="text-lg font-semibold text-emerald-800 mb-4">👨‍🏫 Instructor Information</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Title/Credentials *
                </label>
                <input
                  type="text"
                  name="teacher_title"
                  value={formData.teacher_title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g., Ph.D., Professor of Islamic Studies"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your academic qualifications and title
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor Bio *
                </label>
                <textarea
                  name="teacher_bio"
                  value={formData.teacher_bio}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Brief introduction about yourself, your expertise, and teaching experience..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be displayed on the course overview page
                </p>
              </div>
            </div>

            {/* Course Schedule (for live/hybrid) */}
            {(formData.course_type === 'live' || formData.course_type === 'hybrid') && (
              <div className="border-t-2 border-emerald-200 pt-6">
                <h3 className="text-lg font-semibold text-emerald-800 mb-4">📅 Course Schedule</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    name="starts_at"
                    value={utcToLocal(formData.starts_at)}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        starts_at: e.target.value ? localToUTC(e.target.value) : ''
                      }));
                    }}
                    required={formData.course_type === 'live' || formData.course_type === 'hybrid'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    When will this course begin? (for live/hybrid courses)
                  </p>
                </div>
              </div>
            )}

            {/* END: NEW PROFESSIONAL FIELDS */}

            {/* Prerequisites */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prerequisites (Optional)
              </label>
              <textarea
                name="prerequisites"
                value={formData.prerequisites}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g., Basic Arabic knowledge, Completion of 'Introduction to Tajweed' course"
              />
            </div>

            {/* Passing Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passing Threshold (%) *
              </label>
              <input
                type="number"
                name="passing_threshold"
                value={formData.passing_threshold}
                onChange={handleInputChange}
                required
                min="0"
                max="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum percentage required to receive a certificate
              </p>
            </div>

            {/* Course Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Image URL (Optional)
              </label>
              <input
                type="url"
                name="course_image_url"
                value={formData.course_image_url}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* Action Buttons */}
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
                className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
