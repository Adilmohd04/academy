'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, CheckCircle, Loader2, Users, Award } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';

interface Enrollment {
  id: string;
  title: string;
  description: string;
  course_image_url?: string;
  teacher_name: string;
  progress: number;
  completed: boolean;
  last_accessed?: string;
  status: string;
  enrolled_count?: number;
  enrollment_cap?: number;
  enrollment_limit?: number;
  total_students?: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://academy-backend-git-dev-fixes-adilmohd04s-projects.vercel.app';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlaceholderValue(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (UUID_REGEX.test(normalized)) return true;
  return /^(unknown(\s+teacher|\s+instructor)?|n\/a|null|undefined)$/i.test(normalized);
}

function safeTeacherName(teacherName?: string): string {
  return isPlaceholderValue(teacherName) ? 'Instructor' : teacherName!.trim();
}

function safeCourseTitle(title?: string): string {
  return isPlaceholderValue(title) ? 'Course' : title!.trim();
}

export default function MyCoursesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    if (userId) {
      fetchEnrollments();
    }
  }, [userId]);

  const fetchEnrollments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enrollments/my-courses`, {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const inSelectedTab = filter === 'active' ? !enrollment.completed : enrollment.completed;
    const cap = enrollment.enrollment_cap || enrollment.enrollment_limit;
    const enrolled = enrollment.total_students ?? enrollment.enrolled_count ?? 0;
    const isFull = typeof cap === 'number' && cap > 0 && enrolled >= cap;
    return inSelectedTab && !isFull;
  });

  const activeCount = enrollments.filter(e => !e.completed).length;
  const completedCount = enrollments.filter(e => e.completed).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-900 mb-2">My Courses</h1>
        <p className="text-slate-600">Continue your learning journey</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('active')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            filter === 'active'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
          }`}
        >
          Active Courses ({activeCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            filter === 'completed'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <IslamicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            {filter === 'active' ? 'No active courses' : 'No completed courses yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {filter === 'active' 
              ? 'Start learning by browsing available courses'
              : 'Complete your active courses to earn certificates'
            }
          </p>
          {filter === 'active' && (
            <IslamicButton
              variant="primary"
              onClick={() => router.push('/student/courses/browse')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Browse Courses
            </IslamicButton>
          )}
        </IslamicCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnrollments.map((enrollment) => {
            const cap = enrollment.enrollment_cap || enrollment.enrollment_limit;
            const enrolled = enrollment.total_students ?? enrollment.enrolled_count ?? 0;
            const spotsLeft = typeof cap === 'number' && cap > 0 ? Math.max(cap - enrolled, 0) : null;

            return (
            <IslamicCard 
              key={enrollment.id} 
              className="group hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 bg-white"
            >
              {/* Thumbnail */}
              <div className="relative h-52 bg-gradient-to-br from-purple-400 to-indigo-600 overflow-hidden">
                {enrollment.course_image_url ? (
                  <img 
                    src={enrollment.course_image_url} 
                    alt={safeCourseTitle(enrollment.title)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}

                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/45 text-white backdrop-blur-sm">
                    {enrollment.completed ? 'Completed' : 'Active'}
                  </span>
                </div>

                {/* Completed Badge */}
                {enrollment.completed && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">Completed</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Course Progress</span>
                  <span className="font-semibold text-purple-700">{enrollment.progress}%</span>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-purple-700 transition-colors">
                  {safeCourseTitle(enrollment.title)}
                </h3>

                {/* Description */}
                <p className="text-base text-slate-600 line-clamp-3 leading-relaxed min-h-[72px]">
                  {enrollment.description}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
                    <div className="text-slate-500">Teacher</div>
                    <div className="font-semibold truncate">{safeTeacherName(enrollment.teacher_name)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
                    <div className="text-slate-500">Status</div>
                    <div className="font-semibold">{enrollment.completed ? 'Completed' : 'In Progress'}</div>
                  </div>
                </div>

                {spotsLeft !== null && (
                  <div className="flex items-center gap-2 text-sm rounded-xl bg-purple-50 border border-purple-200 px-3 py-2 text-purple-700">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                  </div>
                )}

                {/* Action Button */}
                {enrollment.completed ? (
                  <div className="space-y-2">
                    <IslamicButton
                      variant="primary"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => router.push(`/learn/${enrollment.id}`)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Review Course
                    </IslamicButton>
                    <IslamicButton
                      variant="secondary"
                      className="w-full"
                      onClick={() => router.push('/student/certificates')}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      View Certificate
                    </IslamicButton>
                  </div>
                ) : (
                  <IslamicButton
                    variant="primary"
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => router.push(`/learn/${enrollment.id}`)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {enrollment.progress === 0 ? 'Start Learning' : 'Continue Learning'}
                  </IslamicButton>
                )}
              </div>
            </IslamicCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
