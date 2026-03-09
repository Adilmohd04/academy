"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  course_image_url?: string;
  teacher_name: string;
  enrolled_count: number;
  enrollment_cap: number | null;
}

export default function BrowseCoursesPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchTerm, selectedCategory, selectedLevel, courses]);

  const loadCourses = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/courses?status=approved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCourses(data);
        setFilteredCourses(data);
      }
    } catch (err) {
      console.error("Failed to load courses", err);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.teacher_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((course) => course.category === selectedCategory);
    }

    // Level filter
    if (selectedLevel !== "all") {
      filtered = filtered.filter((course) => course.level === selectedLevel);
    }

    setFilteredCourses(filtered);
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-8 mb-8">
          <h1 className="text-4xl font-bold text-emerald-800 mb-2">
            Discover Islamic Courses
          </h1>
          <p className="text-gray-600 mb-6">
            Explore our comprehensive courses on Quran, Arabic, Fiqh, and more
          </p>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Categories</option>
                <option value="quran">Quran</option>
                <option value="arabic">Arabic Language</option>
                <option value="fiqh">Fiqh (Islamic Law)</option>
                <option value="aqeedah">Aqeedah (Creed)</option>
                <option value="hadith">Hadith Studies</option>
                <option value="seerah">Seerah</option>
                <option value="islamic-history">Islamic History</option>
                <option value="tajweed">Tajweed</option>
              </select>
            </div>
            <div>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
        </div>

        {/* Course Grid */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No courses found matching your criteria
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.course_id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-emerald-100 overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer"
                onClick={() => router.push(`/student/courses/${course.course_id}`)}
              >
                {/* Course Image */}
                <div className="h-48 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  {course.course_image_url ? (
                    <img
                      src={course.course_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white text-6xl">📚</div>
                  )}
                </div>

                {/* Course Info */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {course.category}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full capitalize">
                      {course.level}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {course.course_type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-gray-600">
                      👨‍🏫 {course.teacher_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      👥 {course.enrolled_count}
                      {course.enrollment_cap && `/${course.enrollment_cap}`} enrolled
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {course.is_free ? (
                        <span className="text-2xl font-bold text-green-600">
                          FREE
                        </span>
                      ) : (
                        <span className="text-2xl font-bold text-emerald-600">
                          ₹{course.price}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/student/courses/${course.course_id}`);
                      }}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      View Details
                    </button>
                  </div>

                  {course.enrollment_cap &&
                    course.enrolled_count >= course.enrollment_cap && (
                      <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-center">
                        <span className="text-sm font-medium text-red-700">
                          ⚠️ Enrollment Full
                        </span>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
