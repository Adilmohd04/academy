'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import { BookOpen, Clock, Users, Star, CheckCircle, Play, FileText, Award, Loader2, ArrowLeft } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  course_image_url?: string;
  category: string;
  level: string;
  price: number;
  duration_weeks: number;
  status: string;
  teacher_id: string;
  teacher_name?: string;
  co_teachers?: Array<{
    id?: string;
    full_name?: string | null;
    email?: string | null;
  }>;
  profiles?: {
    full_name: string;
    email: string;
    bio?: string;
  };
  _count?: {
    enrollments: number;
  };
}

interface Week {
  id: string;
  week_number: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'text';
  duration_minutes?: number;
}

const STABLE_BACKEND_URL = 'https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app';
const ENV_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL =
  !ENV_BACKEND_URL || ENV_BACKEND_URL.includes('academy-q5jv.vercel.app')
    ? STABLE_BACKEND_URL
    : ENV_BACKEND_URL;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlaceholderValue(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (UUID_REGEX.test(normalized)) return true;
  return /^(unknown(\s+teacher|\s+instructor)?|n\/a|null|undefined)$/i.test(normalized);
}

function safeTeacherName(teacherName?: string): string {
  return isPlaceholderValue(teacherName) ? 'Teacher' : teacherName!.trim();
}

function safeCourseTitle(title?: string): string {
  return isPlaceholderValue(title) ? 'Course' : title!.trim();
}

export default function CourseDetailPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (userId && courseId) {
      fetchCourseDetails();
      checkEnrollment();
    }
  }, [userId, courseId]);

  const fetchCourseDetails = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
        
        // Fetch syllabus
        const syllabusRes = await fetch(`${API_BASE_URL}/api/courses/${courseId}/syllabus`, {
          headers: {
            'x-clerk-user-id': userId || ''
          }
        });
        if (syllabusRes.ok) {
          const syllabusData = await syllabusRes.json();
          setWeeks(syllabusData);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enrollments/my-courses`, {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      if (res.ok) {
        const payload = await res.json();
        const courses = Array.isArray(payload?.courses) ? payload.courses : [];
        setIsEnrolled(courses.some((course: any) => course.id === courseId));
      }
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    if (course?.price && course.price > 0) {
      alert('Paid course enrollment coming soon! Redirecting to payment...');
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/enrollments/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ course_id: courseId })
      });

      if (res.ok) {
        alert('Successfully enrolled! Redirecting to course...');
        router.push(`/student/courses/${courseId}/learn`);
      } else {
        alert('Failed to enroll. Please try again.');
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      alert('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-700">Course not found</h2>
      </div>
    );
  }

  const totalLessons = weeks.reduce((acc, week) => acc + week.lessons.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">
                  {course.level}
                </span>
              </div>
              
              <h1 className="text-4xl font-bold mb-4">{safeCourseTitle(course.title)}</h1>
              <p className="text-lg text-purple-100 mb-6">{course.description}</p>

              <div className="flex items-center gap-6 text-sm mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>{course._count?.enrollments || 0} students enrolled</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.duration_weeks} weeks</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span>4.8 (24 reviews)</span>
                </div>
              </div>

              {/* Teacher */}
              <div className="flex items-center gap-3 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-purple-300 flex items-center justify-center text-purple-800 font-bold text-lg">
                  {safeTeacherName(course.profiles?.full_name || course.teacher_name).charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">Primary Teacher: {safeTeacherName(course.profiles?.full_name || course.teacher_name)}</p>
                  {course.co_teachers && course.co_teachers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {course.co_teachers.map((coTeacher, index) => (
                        <span
                          key={coTeacher.id || coTeacher.email || `co-teacher-${index}`}
                          className="text-xs bg-white/20 text-white px-2 py-1 rounded-full"
                        >
                          {coTeacher.full_name || 'Co-Teacher'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thumbnail */}
            <div className="relative">
              <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
                {(course.thumbnail_url || course.course_image_url) ? (
                  <img src={course.thumbnail_url || course.course_image_url} alt={safeCourseTitle(course.title)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-24 h-24 text-white opacity-50" />
                  </div>
                )}
              </div>

              {/* Price/Enroll Card */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm">
                <IslamicCard className="p-6 shadow-xl">
                  <div className="text-center mb-4">
                    {course.price > 0 ? (
                      <div>
                        <p className="text-3xl font-bold text-purple-700">${course.price}</p>
                        <p className="text-sm text-slate-500">one-time payment</p>
                      </div>
                    ) : (
                      <p className="text-3xl font-bold text-green-600">FREE</p>
                    )}
                  </div>

                  {isEnrolled ? (
                    <button
                      onClick={() => router.push(`/student/courses/${courseId}/learn`)}
                      className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      Continue Learning
                    </button>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {enrolling ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Enroll Now
                        </>
                      )}
                    </button>
                  )}

                  <p className="text-xs text-center text-slate-500 mt-3">
                    30-day money-back guarantee
                  </p>
                </IslamicCard>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-6 py-16 mt-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <IslamicCard className="p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-600" />
                What You'll Learn
              </h2>
              <ul className="grid md:grid-cols-2 gap-3">
                {[
                  'Master fundamental concepts',
                  'Gain practical skills',
                  'Complete hands-on projects',
                  'Earn a certificate of completion',
                  'Access to exclusive resources',
                  'Join supportive community'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </IslamicCard>

            {/* Course Syllabus */}
            <IslamicCard className="p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
                Course Syllabus
              </h2>
              <p className="text-slate-600 mb-4">{weeks.length} weeks • {totalLessons} lessons</p>

              <div className="space-y-3">
                {weeks.length > 0 ? (
                  weeks.map((week) => (
                    <details key={week.id} className="group">
                      <summary className="cursor-pointer p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-800">
                              Week {week.week_number}: {week.title}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">{week.description}</p>
                          </div>
                          <span className="text-sm text-slate-500">{week.lessons.length} lessons</span>
                        </div>
                      </summary>
                      <div className="mt-2 ml-4 space-y-2">
                        {week.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-200">
                            {lesson.type === 'video' && <Play className="w-4 h-4 text-purple-600" />}
                            {lesson.type === 'pdf' && <FileText className="w-4 h-4 text-red-600" />}
                            {lesson.type === 'text' && <BookOpen className="w-4 h-4 text-blue-600" />}
                            <span className="text-sm text-slate-700">{lesson.title}</span>
                            {lesson.duration_minutes && (
                              <span className="text-xs text-slate-500 ml-auto">{lesson.duration_minutes} min</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-8">Syllabus coming soon...</p>
                )}
              </div>
            </IslamicCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course Includes */}
            <IslamicCard className="p-6">
              <h3 className="font-bold text-slate-800 mb-4">This course includes:</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-purple-600" />
                  <span>{totalLessons} video lessons</span>
                </li>
                <li className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span>Downloadable resources</span>
                </li>
                <li className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-600" />
                  <span>Certificate of completion</span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <span>Lifetime access</span>
                </li>
              </ul>
            </IslamicCard>

            {/* Teacher Bio */}
            <IslamicCard className="p-6">
              <h3 className="font-bold text-slate-800 mb-3">About the Instructor</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xl">
                  {safeTeacherName(course.profiles?.full_name || course.teacher_name).charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{safeTeacherName(course.profiles?.full_name || course.teacher_name)}</p>
                  <p className="text-xs text-slate-500">{course.profiles?.email}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {course.profiles?.bio || 'Experienced educator dedicated to quality online learning.'}
              </p>
            </IslamicCard>
          </div>
        </div>
      </div>
    </div>
  );
}
