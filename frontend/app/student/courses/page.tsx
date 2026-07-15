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
  const { userId, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    // Wait for auth to load
    if (!isLoaded) return;
    
    // Redirect if not signed in
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    
    // Fetch if userId is available
    if (userId) {
      fetchEnrollments();
    }
  }, [userId, isLoaded, isSignedIn, router]);

  const fetchEnrollments = async () => {
    try {
      setError(null);
      const res = await fetch('/api/enrollments/my-courses', {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}: Failed to fetch courses`);
      }
      
      const data = await res.json();
      setEnrollments(data.courses || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load courses. Please try again.');
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
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-serif text-[#1B365D] mb-2 font-bold">My Courses</h1>
        <p className="text-[#64748B] text-lg">Continue your learning journey</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setFilter('active')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            filter === 'active'
              ? 'bg-[#1B365D] text-white shadow-md'
              : 'bg-white text-[#64748B] hover:bg-[#FDFBF7] border border-[#E2E8F0]'
          }`}
        >
          Active Courses ({activeCount})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            filter === 'completed'
              ? 'bg-[#1B365D] text-white shadow-md'
              : 'bg-white text-[#64748B] hover:bg-[#FDFBF7] border border-[#E2E8F0]'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Courses Grid */}
      {error ? (
        <IslamicCard className="p-12 text-center border-l-4 border-red-500 bg-red-50">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-xl font-serif text-red-700 mb-2 font-bold">Unable to Load Courses</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <IslamicButton
            variant="primary"
            onClick={() => {
              setError(null);
              setLoading(true);
              if (userId) fetchEnrollments();
            }}
            className="mx-auto"
          >
            Try Again
          </IslamicButton>
        </IslamicCard>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#C5A059]" />
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <IslamicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-[#E2E8F0] mx-auto mb-4" />
          <h3 className="text-xl font-serif text-[#1B365D] mb-2 font-bold">
            {filter === 'active' ? 'No active courses' : 'No completed courses yet'}
          </h3>
          <p className="text-[#64748B] mb-6">
            {filter === 'active' 
              ? 'Start learning by browsing available courses'
              : 'Complete your active courses to earn certificates'
            }
          </p>
          {filter === 'active' && (
            <IslamicButton
              variant="primary"
              onClick={() => router.push('/student/courses/browse')}
              className="mx-auto"
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
              className="group hover:shadow-xl transition-all duration-300 overflow-hidden border border-[#E2E8F0] bg-white h-full flex flex-col"
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-[#FDFBF7] overflow-hidden border-b border-[#E2E8F0]">
                {enrollment.course_image_url ? (
                  <img 
                    src={enrollment.course_image_url} 
                    alt={safeCourseTitle(enrollment.title)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-[#E2E8F0]" />
                  </div>
                )}

                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#1B365D]/90 text-white backdrop-blur-sm border border-white/10">
                    {enrollment.completed ? 'Completed' : 'Active'}
                  </span>
                </div>

                {/* Completed Badge */}
                {enrollment.completed && (
                  <div className="absolute top-3 right-3 bg-[#10B981] text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B] font-medium">Course Progress</span>
                  <span className="font-bold text-[#C5A059]">{enrollment.progress}%</span>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-[#F0F4F8] rounded-full h-1.5 mb-2">
                  <div className="bg-[#C5A059] h-1.5 rounded-full" style={{ width: `${enrollment.progress}%` }}></div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif font-bold text-[#1B365D] leading-tight line-clamp-2 group-hover:text-[#C5A059] transition-colors mb-2">
                  {safeCourseTitle(enrollment.title)}
                </h3>

                {/* Description */}
                <p className="text-sm text-[#64748B] line-clamp-2 leading-relaxed flex-1">
                  {enrollment.description}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-[#E2E8F0]">
                  <div className="px-3 py-2 text-xs text-[#64748B]">
                    <div className="uppercase tracking-wider opacity-70 mb-1 text-[10px]">Teacher</div>
                    <div className="font-serif font-bold italic text-[#10B981] truncate">{safeTeacherName(enrollment.teacher_name)}</div>
                  </div>
                  <div className="px-3 py-2 text-xs text-[#64748B]">
                    <div className="uppercase tracking-wider opacity-70 mb-1 text-[10px]">Status</div>
                    <div className="font-bold text-[#1B365D]">{enrollment.completed ? 'Completed' : 'In Progress'}</div>
                  </div>
                </div>

                {spotsLeft !== null && (
                  <div className="flex items-center gap-2 text-sm rounded-xl bg-[#FDFBF7] border border-[#E2E8F0] px-3 py-2 text-[#1B365D] mt-2">
                    <Users className="w-4 h-4 text-[#C5A059]" />
                    <span className="font-medium text-xs">{spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left</span>
                  </div>
                )}

                {/* Action Button */}
                {enrollment.completed ? (
                  <div className="space-y-2 mt-4">
                    <IslamicButton
                      variant="success"
                      className="w-full"
                      onClick={() => router.push(`/learn/${enrollment.id}`)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Review Course
                    </IslamicButton>
                    <IslamicButton
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push('/student/certificates')}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      View Certificate
                    </IslamicButton>
                  </div>
                ) : (
                  <div className="mt-4">
                    <IslamicButton
                      variant="primary"
                      className="w-full"
                      onClick={() => router.push(`/learn/${enrollment.id}`)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {enrollment.progress === 0 ? 'Start Learning' : 'Continue Learning'}
                    </IslamicButton>
                  </div>
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
