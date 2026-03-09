'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  BookOpen, Clock, Users, Award, CheckCircle, Lock, AlertCircle, 
  Play, FileText, Award as Trophy, Calendar, Globe, BarChart,
  Star, Download, Share2, Heart, ChevronDown, ChevronUp, Video, 
  Target, TrendingUp, MessageSquare, Shield, Zap, BookMarked, GraduationCap,
  Sparkles, Repeat, CalendarDays, MapPin, Bell
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface Instructor {
  id: string;
  name: string;
  email?: string;
  title?: string;
  bio?: string;
  avatar?: string;
}

interface CourseOverview {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  long_description?: string;
  course_image_url?: string;
  thumbnail_image?: string;
  thumbnail_url?: string;
  teacher_name: string;
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
  tags?: string[];
  instructors?: Instructor[];
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
  mentoring_text?: string;
  mentoring_structured?: {
    frequency?: string;
    format?: string;
    flexibility?: string;
  };
  schedule_frequency?: string;
  schedule_timezone?: string;
  enrollment_deadline?: string;
  course_format_description?: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'instructors'>('overview');

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
      setError('Error loading course');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;

    if (course.is_free) {
      try {
        setEnrolling(true);
        const token = await getToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/student/courses/enroll`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ courseId }),
          }
        );

        if (res.ok) {
          router.push(`/student/courses/${courseId}/learning`);
        } else {
          const data = await res.json();
          setError(data.message || 'Failed to enroll');
        }
      } catch (err) {
        setError('Error enrolling in course');
        console.error(err);
      } finally {
        setEnrolling(false);
      }
    } else {
      router.push(`/student/courses/${courseId}/payment`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'This course does not exist'}</p>
          <button
            onClick={() => router.push('/student/courses/browse')}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  // Parse data
  const learningOutcomes = typeof course.learning_outcomes === 'string' 
    ? JSON.parse(course.learning_outcomes || '[]')
    : course.learning_outcomes || [];

  const skillsGained = typeof course.skills_gained === 'string'
    ? course.skills_gained.split(',').map(s => s.trim()).filter(Boolean)
    : course.skills_gained || [];

  const prerequisites = typeof course.prerequisites === 'string'
    ? course.prerequisites.split(',').map(p => p.trim()).filter(Boolean)
    : course.prerequisites || [];

  const instructors = course.instructors || [];
  const tags = course.tags || [];
  const isLiveOrHybrid = course.course_type === 'live' || course.course_type === 'hybrid';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 text-white">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {course.level}
                </span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {course.title}
              </h1>

              <p className="text-xl text-white/90 mb-6 leading-relaxed">
                {course.short_description || course.description}
              </p>

              <div className="flex flex-wrap items-center gap-6 text-white/90 mb-6">
                {course.average_rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{course.average_rating.toFixed(1)}</span>
                    <span>({course.total_reviews?.toLocaleString()} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{course.enrolled_count?.toLocaleString()} students enrolled</span>
                </div>
                {course.language && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <span>{course.language}</span>
                  </div>
                )}
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Enrollment Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden sticky top-6">
                {(course.thumbnail_image || course.course_image_url || course.thumbnail_url) && (
                  <div className="relative h-48 bg-gray-200">
                    <img
                      src={course.thumbnail_image || course.course_image_url || course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {course.course_type === 'pre-recorded' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="h-16 w-16 text-white" />
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  <div className="mb-6">
                    {course.is_free ? (
                      <div className="text-3xl font-bold text-emerald-600">Free</div>
                    ) : (
                      <div className="text-3xl font-bold text-gray-900">
                        ₹{course.price?.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {course.is_enrolled ? (
                    <button
                      onClick={() => router.push(`/student/courses/${courseId}/learning`)}
                      className="w-full py-4 px-6 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl mb-4"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Play className="h-5 w-5" />
                        Continue Learning
                      </div>
                    </button>
                  ) : course.is_full ? (
                    <button disabled className="w-full py-4 px-6 bg-gray-300 text-gray-600 font-semibold rounded-xl cursor-not-allowed mb-4">
                      Course Full
                    </button>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="w-full py-4 px-6 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:bg-gray-400 mb-4"
                    >
                      {enrolling ? 'Enrolling...' : course.is_free ? 'Enroll for Free' : 'Enroll Now'}
                    </button>
                  )}

                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-3 text-gray-700">
                      <Clock className="h-5 w-5 text-teal-600" />
                      <span className="text-sm">{course.estimated_hours || course.duration_weeks * 4} hours</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <BookOpen className="h-5 w-5 text-teal-600" />
                      <span className="text-sm">{course.total_lessons} lessons</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <FileText className="h-5 w-5 text-teal-600" />
                      <span className="text-sm">{course.total_assignments || 0} assignments</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-700">
                      <Award className="h-5 w-5 text-teal-600" />
                      <span className="text-sm">Certificate upon completion</span>
                    </div>
                    {course.course_type && (
                      <div className="flex items-center gap-3 text-gray-700">
                        <Video className="h-5 w-5 text-teal-600" />
                        <span className="text-sm capitalize">{course.course_type.replace('-', ' ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-6 pt-4 border-t">
                    <button className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <Share2 className="h-4 w-4" />
                      <span className="text-sm">Share</span>
                    </button>
                    <button className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">Save</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex gap-8">
            {['overview', 'curriculum', 'instructors'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  'py-4 px-2 font-semibold border-b-2 transition-colors capitalize',
                  activeTab === tab
                    ? 'border-teal-600 text-teal-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* SECTION 4: How This Course Works */}
                <section className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-8 border border-teal-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-teal-600 rounded-lg">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">How This Course Works</h2>
                  </div>

                  {course.course_format_description ? (
                    <p className="text-gray-700 leading-relaxed mb-6">{course.course_format_description}</p>
                  ) : (
                    <div className="space-y-4">
                      {course.course_type === 'pre-recorded' && (
                        <>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                              <Video className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">Self-paced video lessons</h3>
                              <p className="text-gray-600">Learn at your own pace with high-quality recorded content</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                              <FileText className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">Assignments & quizzes</h3>
                              <p className="text-gray-600">Test your knowledge with practical exercises</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                              <Award className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">Earn a certificate</h3>
                              <p className="text-gray-600">Complete all requirements to receive your certificate</p>
                            </div>
                          </div>
                        </>
                      )}

                      {(course.course_type === 'live' || course.course_type === 'hybrid') && (
                        <>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                              <Calendar className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">Live weekly classes</h3>
                              <p className="text-gray-600">Join scheduled sessions with your instructor and peers</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                              <MessageSquare className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">Interactive Q&A</h3>
                              <p className="text-gray-600">Ask questions in real-time during live sessions</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                              <TrendingUp className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-1">Structured progression</h3>
                              <p className="text-gray-600">Follow a cohort-based learning path with clear milestones</p>
                            </div>
                          </div>
                          {course.course_type === 'hybrid' && (
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                                <Repeat className="h-5 w-5 text-teal-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-1">Flexible learning</h3>
                                <p className="text-gray-600">Combine live sessions with self-paced recorded content</p>
                              </div>
                            </div>
                          )}
                          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                              <strong>Note:</strong> Schedule may evolve based on class progress and student needs
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </section>

                {/* About This Course */}
                <section className="bg-white rounded-2xl shadow-sm p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">About this course</h2>
                  {course.long_description ? (
                    <div className="prose prose-teal max-w-none">
                      <ReactMarkdown>{course.long_description}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{course.description}</p>
                  )}
                </section>

                {/* Skills You'll Gain */}
                {skillsGained.length > 0 && (
                  <section className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-teal-100 rounded-lg">
                        <Zap className="h-6 w-6 text-teal-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Skills you'll gain</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {skillsGained.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-medium border border-teal-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Learning Outcomes */}
                {learningOutcomes.length > 0 && (
                  <section className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <Target className="h-6 w-6 text-emerald-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">What you'll learn</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {learningOutcomes.map((outcome: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{outcome}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* SECTION 8: Mentoring & Support */}
                {(course.mentoring_text || course.mentoring_structured) && (
                  <section className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-purple-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Mentoring & Support</h2>
                    </div>

                    {course.mentoring_structured ? (
                      <div className="space-y-3">
                        {course.mentoring_structured.frequency && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                            <span className="text-gray-700">
                              {course.mentoring_structured.frequency.charAt(0).toUpperCase() + 
                               course.mentoring_structured.frequency.slice(1)} doubt-clearing sessions
                            </span>
                          </div>
                        )}
                        {course.mentoring_structured.format && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                            <span className="text-gray-700">
                              {course.mentoring_structured.format} format
                            </span>
                          </div>
                        )}
                        {course.mentoring_structured.flexibility && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                            <span className="text-gray-700">
                              Additional sessions {course.mentoring_structured.flexibility}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-700 leading-relaxed">{course.mentoring_text}</p>
                    )}
                  </section>
                )}

                {/* SECTION 6: Schedule (only for live/hybrid) */}
                {isLiveOrHybrid && (
                  <section className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <CalendarDays className="h-6 w-6 text-blue-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Course Schedule</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {course.starts_at && (
                        <div className="flex items-start gap-3">
                          <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                          <div>
                            <div className="font-semibold text-gray-900">Start Date</div>
                            <div className="text-gray-700">{new Date(course.starts_at).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</div>
                          </div>
                        </div>
                      )}

                      {course.schedule_frequency && (
                        <div className="flex items-start gap-3">
                          <Repeat className="h-5 w-5 text-blue-600 mt-1" />
                          <div>
                            <div className="font-semibold text-gray-900">Frequency</div>
                            <div className="text-gray-700 capitalize">{course.schedule_frequency}</div>
                          </div>
                        </div>
                      )}

                      {course.duration_weeks && (
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-blue-600 mt-1" />
                          <div>
                            <div className="font-semibold text-gray-900">Duration</div>
                            <div className="text-gray-700">{course.duration_weeks} weeks</div>
                          </div>
                        </div>
                      )}

                      {course.schedule_timezone && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-blue-600 mt-1" />
                          <div>
                            <div className="font-semibold text-gray-900">Timezone</div>
                            <div className="text-gray-700">{course.schedule_timezone}</div>
                          </div>
                        </div>
                      )}

                      {course.enrollment_deadline && (
                        <div className="flex items-start gap-3">
                          <Bell className="h-5 w-5 text-blue-600 mt-1" />
                          <div>
                            <div className="font-semibold text-gray-900">Enrollment Deadline</div>
                            <div className="text-gray-700">{new Date(course.enrollment_deadline).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Prerequisites */}
                {prerequisites.length > 0 && (
                  <section className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-amber-100 rounded-lg">
                        <Shield className="h-6 w-6 text-amber-600" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Prerequisites</h2>
                    </div>
                    <ul className="space-y-3">
                      {prerequisites.map((prereq: string, index: number) => (
                        <li key={index} className="flex items-start gap-3 text-gray-700">
                          <div className="h-2 w-2 bg-teal-600 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {/* SECTION 5: Curriculum Overview - Modules Only */}
            {activeTab === 'curriculum' && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Curriculum Overview</h2>
                <p className="text-gray-600 mb-6">{course.total_weeks} modules • {course.total_lessons} lessons</p>
                
                <div className="space-y-3">
                  {course.weeks.map((week) => (
                    <div key={week.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedWeek(expandedWeek === week.week_number ? null : week.week_number)}
                        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Module {week.week_number}: {week.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{week.lessons.length} lessons</div>
                        </div>
                        {expandedWeek === week.week_number ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      {expandedWeek === week.week_number && (
                        <div className="px-6 py-4 space-y-3 border-t bg-white">
                          <p className="text-gray-700 mb-4">{week.description}</p>
                          {week.lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 pl-4">
                              {lesson.content_type === 'video' ? (
                                <Play className="h-4 w-4 text-teal-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-teal-600" />
                              )}
                              <span className="text-gray-700 text-sm">{lesson.title}</span>
                              {lesson.duration && (
                                <span className="ml-auto text-xs text-gray-500">{lesson.duration} min</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 7: Instructors */}
            {activeTab === 'instructors' && (
              <div className="space-y-6">
                {instructors.length > 0 ? (
                  instructors.map((instructor) => (
                    <div key={instructor.id} className="bg-white rounded-2xl shadow-sm p-8">
                      <div className="flex items-start gap-6">
                        <div className="flex-shrink-0">
                          {instructor.avatar ? (
                            <img
                              src={instructor.avatar}
                              alt={instructor.name}
                              className="h-24 w-24 rounded-full object-cover border-4 border-teal-100"
                            />
                          ) : (
                            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
                              {instructor.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">{instructor.name}</h3>
                          {instructor.title && (
                            <p className="text-teal-600 font-medium mb-3">{instructor.title}</p>
                          )}
                          {instructor.bio && (
                            <p className="text-gray-700 leading-relaxed">{instructor.bio}</p>
                          )}
                          {instructor.email && (
                            <a href={`mailto:${instructor.email}`} className="text-teal-600 hover:underline mt-3 inline-block">
                              {instructor.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        {course.teacher_avatar ? (
                          <img
                            src={course.teacher_avatar}
                            alt={course.teacher_name}
                            className="h-24 w-24 rounded-full object-cover border-4 border-teal-100"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
                            {course.teacher_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{course.teacher_name}</h3>
                        {course.teacher_title && (
                          <p className="text-teal-600 font-medium mb-3">{course.teacher_title}</p>
                        )}
                        {course.teacher_bio && (
                          <p className="text-gray-700 leading-relaxed">{course.teacher_bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">Course Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Level</span>
                  <span className="font-semibold text-gray-900 capitalize">{course.level}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold text-gray-900">{course.duration_weeks} weeks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Language</span>
                  <span className="font-semibold text-gray-900">{course.language || 'English'}</span>
                </div>
                {course.starts_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Starts</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(course.starts_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-6 text-white mb-6">
              <GraduationCap className="h-12 w-12 mb-4" />
              <h3 className="font-bold text-lg mb-2">Earn a Certificate</h3>
              <p className="text-sm text-white/90">
                Complete all course requirements to earn your certificate of completion
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">This course includes:</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-gray-700">Video lectures</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-gray-700">Reading materials</span>
                </div>
                <div className="flex items-center gap-3">
                  <BookMarked className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-gray-700">Quizzes & assignments</span>
                </div>
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-gray-700">Downloadable resources</span>
                </div>
                <div className="flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-teal-600" />
                  <span className="text-sm text-gray-700">Certificate of completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
