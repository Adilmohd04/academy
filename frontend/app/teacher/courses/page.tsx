'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Users, TrendingUp, Edit, Eye, Trash2, Loader2, Clock, CheckCircle, XCircle, CheckSquare } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  price: number;
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected' | 'archived';
  approval_status?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  teacher_id?: string;
  teacher_name?: string;
  archived_at?: string;
  is_deleted?: boolean;
  created_at: string;
  _count?: {
    enrollments: number;
  };
}

export default function TeacherCoursesPage() {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'pending' | 'approved' | 'published' | 'rejected' | 'archived'>('all');

  const instructorName = user?.fullName || user?.firstName || 'Instructor';

  const statusRank: Record<Course['status'], number> = {
    draft: 0,
    pending: 1,
    approved: 2,
    published: 3,
    archived: 4,
    rejected: 5,
  };

  const toDisplayStatus = (course: any): Course['status'] => {
    if (course.status === 'archived' || course.is_deleted || course.archived_at) return 'archived';
    if (course.status === 'published') return 'published';
    if (course.approval_status === 'pending_approval') return 'pending';
    if (course.approval_status === 'rejected') return 'rejected';
    if (course.approval_status === 'approved') return course.status === 'published' ? 'published' : 'approved';
    return 'draft';
  };

  const normalizeAndDedupeCourses = (rawCourses: any[]): Course[] => {
    const normalized = rawCourses.map((course) => ({
      ...course,
      status: toDisplayStatus(course),
    }));

    // If duplicate logical courses exist (same title/category/teacher), keep the farthest lifecycle state.
    const byLifecycleKey = new Map<string, Course>();

    for (const course of normalized) {
      const key = `${(course.teacher_id || '').toLowerCase()}::${(course.title || '').trim().toLowerCase()}::${(course.category || '').trim().toLowerCase()}::${(course.level || '').trim().toLowerCase()}`;
      const existing = byLifecycleKey.get(key);

      if (!existing) {
        byLifecycleKey.set(key, course);
        continue;
      }

      const existingRank = statusRank[existing.status] ?? -1;
      const incomingRank = statusRank[course.status] ?? -1;

      if (incomingRank > existingRank) {
        byLifecycleKey.set(key, course);
      } else if (incomingRank === existingRank) {
        const existingUpdated = new Date((existing as any).updated_at || existing.created_at || 0).getTime();
        const incomingUpdated = new Date((course as any).updated_at || course.created_at || 0).getTime();
        if (incomingUpdated > existingUpdated) {
          byLifecycleKey.set(key, course);
        }
      }
    }

    return Array.from(byLifecycleKey.values());
  };

  useEffect(() => {
    if (userId) {
      fetchCourses();
    }
  }, [userId]);

  const fetchCourses = async () => {
    if (!userId) return;
    
    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch(`${API}/api/teacher/courses`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (res.ok) {
        const response = await res.json();
        // Handle both array and object responses
        const coursesData = Array.isArray(response) ? response : (response.data || []);
        const normalizedCourses = normalizeAndDedupeCourses(coursesData);
        setCourses(normalizedCourses);
        console.log('Teacher courses loaded:', coursesData.length);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) return;

    try {
      const token = getToken ? await getToken() : null;
      const res = await fetch(`${API}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });

      if (res.ok) {
        alert('Course deleted successfully');
        fetchCourses();
      } else {
        alert('Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('An error occurred');
    }
  };

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => 
    (filter === 'all' || course.status === filter) &&
    [course.title, course.description, course.category, course.level].join(' ').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const stats = {
    total: courses.length,
    published: courses.filter(course => course.status === 'published').length,
    approved: courses.filter(course => course.status === 'approved').length,
    enrollments: courses.reduce((sum, course) => sum + (course._count?.enrollments || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      pending: 'bg-amber-100 text-amber-800',
      approved: 'bg-sky-100 text-sky-800',
      published: 'bg-indigo-100 text-indigo-800',
      rejected: 'bg-rose-100 text-rose-700',
      archived: 'bg-slate-200 text-slate-700',
    };
    const icons = {
      draft: Edit,
      pending: Clock,
      approved: CheckSquare,
      published: CheckCircle,
      rejected: XCircle,
      archived: Trash2,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700';
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <TeacherPageContainer>
      {/* Hero */}
      <div className="mb-8 rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(79,70,229,0.18),_transparent_42%),linear-gradient(135deg,_#0f172a_0%,_#111827_45%,_#1e293b_100%)] px-6 py-6 md:px-8 md:py-8 text-white shadow-[0_20px_80px_rgba(15,23,42,0.18)] overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/8 blur-3xl" />
          <div className="absolute left-1/3 bottom-0 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
              <BookOpen className="w-4 h-4" />
              Teacher workspace
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight">My Courses</h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base text-white/75 leading-relaxed">
                Create and manage your educational courses from a calmer, more premium workspace designed for clear teaching decisions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[40rem]">
            {[
              { label: 'Courses', value: stats.total },
              { label: 'Published', value: stats.published },
              { label: 'Approved', value: stats.approved },
              { label: 'Enrollments', value: stats.enrollments },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6">
        <div className="flex flex-1 flex-col gap-3">
          <label className="text-sm font-semibold text-slate-700">Search courses</label>
          <div className="relative max-w-xl">
            <BookOpen className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, category, level, or description..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <IslamicButton
            variant="primary"
            onClick={() => router.push('/teacher/courses/create')}
            className="whitespace-nowrap !bg-gradient-to-r !from-slate-950 !via-indigo-900 !to-blue-700 !text-white !border-transparent hover:!from-slate-900 hover:!via-indigo-800 hover:!to-blue-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Course
          </IslamicButton>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {['all', 'draft', 'pending', 'approved', 'published', 'rejected', 'archived'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-2 text-xs">
                ({f === 'all' ? courses.length : courses.filter(c => c.status === f).length})
              </span>
            </button>
          ))}
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <IslamicCard className="p-12 text-center border border-dashed border-slate-300 bg-white/80">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            {filter === 'all' ? 'No courses yet' : `No ${filter} courses`}
          </h3>
          <p className="text-slate-500 mb-6">
            {filter === 'all' 
              ? 'Start creating your first course to share knowledge with students'
              : `You don't have any ${filter} courses at the moment`
            }
          </p>
          {filter === 'all' && (
            <IslamicButton
              variant="primary"
              onClick={() => router.push('/teacher/courses/create')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Course
            </IslamicButton>
          )}
        </IslamicCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => (
            <IslamicCard key={course.id} className="group overflow-hidden border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)] transition-all duration-300">
              {/* Thumbnail */}
              <div className={`relative h-56 overflow-hidden bg-gradient-to-br ${
                index % 3 === 0
                  ? 'from-slate-950 via-indigo-950 to-blue-700'
                  : index % 3 === 1
                    ? 'from-slate-900 via-amber-700 to-orange-600'
                    : 'from-slate-900 via-emerald-700 to-cyan-600'
              }`}>
                {((course as any).course_image_url || course.thumbnail_url) ? (
                  <img 
                    src={(course as any).course_image_url || course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>';
                    }}
                  />
                ) : (
                  <div className="relative w-full h-full p-5 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_28%)]" />
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                          {course.status}
                        </span>
                        <BookOpen className="w-7 h-7 text-white/80" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.26em] text-white/70 mb-2">Course poster</p>
                        <h3 className="text-2xl font-black leading-tight drop-shadow-sm line-clamp-3">
                          {course.title}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/85">
                          <span className="rounded-full bg-white/15 px-2.5 py-1">{course.category}</span>
                          <span className="rounded-full bg-white/15 px-2.5 py-1 capitalize">{course.level}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(course.status)}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 capitalize">
                    {course.level}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                    {course.category}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-extrabold text-slate-900 line-clamp-2 group-hover:text-indigo-700 transition-colors leading-tight">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {course.description}
                </p>

                {/* Instructor & Status Info */}
                <div className="space-y-2 rounded-lg bg-blue-50 px-3 py-3 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Instructor</span>
                    <span className="text-sm font-bold text-blue-900">{instructorName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Status</span>
                    <span className="text-sm font-semibold capitalize text-blue-900">{course.status}</span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{course._count?.enrollments || 0} students</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-indigo-700">
                      {course.price === 0 ? 'Free' : `₹${course.price}`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {(course.status === 'approved' || course.status === 'published') && (
                    <button
                      onClick={() => router.push(`/teacher/courses/${course.id}/builder`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-800 to-indigo-600 text-white rounded-lg hover:from-slate-950 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                    >
                      <BookOpen className="w-4 h-4" />
                      Go to Course Builder
                    </button>
                  )}
                  {course.status === 'draft' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/teacher/courses/${course.id}/builder?tab=content`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-lg hover:from-slate-900 hover:to-black transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                      >
                        <Edit className="w-4 h-4" />
                        Edit & Submit
                      </button>
                      <button
                        onClick={() => handleDelete(course.id, course.title)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-md text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {course.status === 'pending' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border-2 border-amber-200 text-amber-800 rounded-lg text-sm font-semibold cursor-not-allowed"
                    >
                      <Clock className="w-4 h-4 animate-pulse" />
                      Awaiting Approval
                    </button>
                  )}
                  {course.status === 'rejected' && (
                    <button
                      onClick={() => router.push(`/teacher/courses/${course.id}/builder?tab=content`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-fuchsia-700 text-white rounded-lg hover:from-rose-700 hover:to-fuchsia-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                    >
                      <Edit className="w-4 h-4" />
                      Revise & Resubmit
                    </button>
                  )}
                </div>
              </div>
            </IslamicCard>
          ))}
        </div>
      )}
    </TeacherPageContainer>
  );
}
