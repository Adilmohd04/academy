'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  BookOpen, Clock, Users, Award, CheckCircle, Lock, AlertCircle, 
  Play, FileText, Award as Trophy, Calendar, Globe, BarChart,
  Star, Download, Share2, Heart, ChevronDown, ChevronUp, Video, 
  Target, TrendingUp, MessageSquare, Shield, Zap, BookMarked, GraduationCap
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
  const [activeTab, setActiveTab] = useState<'overview' | 'syllabus' | 'instructors' | 'reviews'>('overview');

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
      // Direct enrollment for free courses
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
      // Redirect to payment for paid courses
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

  // Parse learning outcomes and skills
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - Coursera Style */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course Info */}
            <div className="lg:col-span-2 text-white">
              {/* Category Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  {course.level}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {course.title}
              </h1>

              {/* Short Description */}
              <p className="text-xl text-white/90 mb-6 leading-relaxed">
                {course.short_description || course.description}
              </p>

              {/* Meta Info */}
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

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Enrollment Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden sticky top-6">
                {/* Course Image */}
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
                  {/* Price */}
                  <div className="mb-6">
                    {course.is_free ? (
                      <div className="text-3xl font-bold text-emerald-600">Free</div>
                    ) : (
                      <div className="text-3xl font-bold text-gray-900">
                        ₹{course.price?.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Enroll Button */}
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
                    <button
                      disabled
                      className="w-full py-4 px-6 bg-gray-300 text-gray-600 font-semibold rounded-xl cursor-not-allowed mb-4"
                    >
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

                  {/* Course Highlights */}
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

                  {/* Share Actions */}
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
            {['overview', 'syllabus', 'instructors', 'reviews'].map((tab) => (
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

            {activeTab === 'syllabus' && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Syllabus</h2>
                <div className="space-y-4">
                  {course.weeks.map((week) => (
                    <div key={week.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedWeek(expandedWeek === week.week_number ? null : week.week_number)}
                        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Week {week.week_number}: {week.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{week.lessons.length} lessons</div>
                        </div>
                        {expandedWeek === week.week_number ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      {expandedWeek === week.week_number && (
                        <div className="px-6 py-4 space-y-3 border-t">
                          {week.lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3">
                              {lesson.content_type === 'video' ? (
                                <Play className="h-5 w-5 text-teal-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-teal-600" />
                              )}
                              <span className="text-gray-700">{lesson.title}</span>
                              {lesson.duration && (
                                <span className="ml-auto text-sm text-gray-500">{lesson.duration} min</span>
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

            {activeTab === 'instructors' && (
              <div className="space-y-6">
                {/* Display from instructors array if available */}
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
                  // Fallback to teacher info
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

            {activeTab === 'reviews' && (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Reviews</h2>
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Reviews coming soon...</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Course Stats */}
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

            {/* Certificate Banner */}
            <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl p-6 text-white mb-6">
              <GraduationCap className="h-12 w-12 mb-4" />
              <h3 className="font-bold text-lg mb-2">Earn a Certificate</h3>
              <p className="text-sm text-white/90">
                Complete all course requirements to earn your certificate of completion
              </p>
            </div>

            {/* Additional Info */}
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
