'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  BookOpen, Clock, Users, Award, CheckCircle, Lock, AlertCircle, 
  Play, FileText, Award as Trophy, Calendar, Globe, BarChart,
  Star, Download, Share2, Heart, ChevronDown, ChevronUp
} from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface CourseOverview {
  id: string;
  title: string;
  description: string;
  course_image_url?: string;
  teacher_name: string;
  co_teachers?: Array<{
    id?: string;
    full_name?: string | null;
    email?: string | null;
  }>;
  teacher_bio?: string;
  teacher_title?: string;
  teacher_avatar?: string;
  price?: number;
  is_free: boolean;
  enrollment_cap?: number;
  enrolled_count: number;
  is_full: boolean;
  duration_weeks: number;
  level: string;
  category: string;
  syllabus?: string;
  prerequisites?: string | string[];
  prerequisite_courses?: string[];
  total_weeks: number;
  total_lessons: number;
  total_quizzes?: number;
  total_assignments?: number;
  is_enrolled: boolean;
  starts_at?: string;
  ends_at?: string;
  course_type?: string;
  learning_outcomes?: string | string[];
  skills_gained?: string | string[];
  certificate_criteria?: any;
  average_rating?: number;
  total_reviews?: number;
  language?: string;
  subtitle_languages?: string[];
  estimated_hours?: number;
  weeks: Array<{
    id: string;
    week_number: number;
    title: string;
    description: string;
    lessons: Array<{
      id: string;
      title: string;
      content_type: string;
      duration?: number;
    }>;
  }>;
}

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<CourseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'syllabus' | 'instructor' | 'reviews'>('about');

  useEffect(() => {
    fetchCourseOverview();
  }, [courseId]);

  const fetchCourseOverview = async () => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/overview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setCourse(data);
      } else {
        setError('Failed to load course');
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    setEnrolling(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/${courseId}/enroll`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.ok) {
        router.push(`/learn/${courseId}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to enroll');
      }
    } catch (err) {
      console.error('Error enrolling:', err);
      setError('Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Course Not Found</h2>
          <p className="text-slate-600 mb-6">{error || 'This course does not exist or has been removed'}</p>
          <button
            onClick={() => router.push('/student/courses/browse')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Browse All Courses
          </button>
        </div>
      </div>
    );
  }

  const learningOutcomes = course.learning_outcomes 
    ? (Array.isArray(course.learning_outcomes) 
        ? course.learning_outcomes 
        : (() => {
            try {
              return JSON.parse(course.learning_outcomes as string);
            } catch (e) {
              return [];
            }
          })())
    : [];
  
  const skillsGained = course.skills_gained
    ? (Array.isArray(course.skills_gained) 
        ? course.skills_gained 
        : (() => {
            try {
              return JSON.parse(course.skills_gained as string);
            } catch (e) {
              return [];
            }
          })())
    : [];

  const prerequisites = course.prerequisites
    ? (Array.isArray(course.prerequisites) 
        ? course.prerequisites 
        : (() => {
            try {
              return JSON.parse(course.prerequisites as string);
            } catch (e) {
              return [];
            }
          })())
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-green-100 text-lg mb-6">{course.description}</p>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                  <span>{course.total_lessons} Lessons</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration_weeks} Weeks</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Users className="w-5 h-5" />
                  <span>{course.enrolled_count} Students</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                  <Award className="w-5 h-5" />
                  <span className="capitalize">{course.level}</span>
                </div>
              </div>

              {course.is_enrolled ? (
                <button
                  onClick={() => router.push(`/student/courses/${courseId}`)}
                  className="px-8 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-gray-100 flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Go to Course
                </button>
              ) : course.is_full ? (
                <button
                  disabled
                  className="px-8 py-3 bg-gray-400 text-white rounded-lg font-semibold cursor-not-allowed flex items-center gap-2"
                >
                  <Lock className="w-5 h-5" />
                  Course Full
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="px-8 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling ? 'Enrolling...' : course.is_free ? 'Enroll for Free' : `Enroll - $${course.price}`}
                </button>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {course.enrollment_cap && (
                <p className="mt-3 text-sm text-green-100">
                  {course.enrolled_count} / {course.enrollment_cap} seats filled
                </p>
              )}
            </div>

            {course.course_image_url && (
              <div className="hidden md:block">
                <img
                  src={course.course_image_url}
                  alt={course.title}
                  className="rounded-lg shadow-2xl w-full h-80 object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* About Course */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Course</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{course.description}</p>
              
              {course.syllabus && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Syllabus</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{course.syllabus}</p>
                </div>
              )}

              {learningOutcomes.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">What You'll Learn</h3>
                  <ul className="space-y-2">
                    {learningOutcomes.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {skillsGained.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills You'll Gain</h3>
                  <div className="flex flex-wrap gap-2">
                    {skillsGained.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructor */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructor</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(course.teacher_name || 'T').charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{course.teacher_name || 'Instructor'}</p>
                  <p className="text-sm text-gray-500">Primary Teacher</p>
                </div>
              </div>
              {course.co_teachers && course.co_teachers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {course.co_teachers.map((coTeacher, idx) => (
                    <span
                      key={coTeacher.id || coTeacher.email || `co-teacher-${idx}`}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold"
                    >
                      {coTeacher.full_name || 'Co-Teacher'}
                    </span>
                  ))}
                </div>
              )}
              {course.teacher_bio && (
                <p className="text-sm text-gray-600">{course.teacher_bio}</p>
              )}
            </div>

            {/* Prerequisites */}
            {prerequisites.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prerequisites</h3>
                <ul className="space-y-2">
                  {prerequisites.map((prereq, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{prereq}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Course Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Level</span>
                  <span className="font-medium text-gray-900 capitalize">{course.level}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Category</span>
                  <span className="font-medium text-gray-900">{course.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Language</span>
                  <span className="font-medium text-gray-900">{(course as any).course_language || 'English'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">{course.duration_weeks} weeks</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Lessons</span>
                  <span className="font-medium text-gray-900">{course.total_lessons}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Price</span>
                  <span className="font-medium text-gray-900">
                    {course.is_free ? 'Free' : `$${course.price}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
