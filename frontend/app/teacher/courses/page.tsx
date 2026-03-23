'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Users, TrendingUp, Edit, Eye, Trash2, Loader2, Clock, CheckCircle, XCircle, CheckSquare } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  price: number;
  status: 'draft' | 'pending' | 'approved' | 'published' | 'rejected';
  created_at: string;
  _count?: {
    enrollments: number;
  };
}

export default function TeacherCoursesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'pending' | 'approved' | 'published' | 'rejected'>('all');

  useEffect(() => {
    if (userId) {
      fetchCourses();
    }
  }, [userId]);

  const fetchCourses = async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/courses`, {
        headers: {
          'x-clerk-user-id': userId
        }
      });
      if (res.ok) {
        const response = await res.json();
        // Handle both array and object responses
        const coursesData = Array.isArray(response) ? response : (response.data || []);
        setCourses(coursesData);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'x-clerk-user-id': userId || ''
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
    filter === 'all' || course.status === filter
  ) : [];

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      published: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const icons = {
      draft: Edit,
      pending: Clock,
      approved: CheckSquare,
      published: CheckCircle,
      rejected: XCircle,
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-900 mb-2">My Courses</h1>
        <p className="text-slate-600">Create and manage your educational courses</p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'draft', 'pending', 'approved', 'published', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-emerald-50 border border-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-2 text-xs">
                ({f === 'all' ? courses.length : courses.filter(c => c.status === f).length})
              </span>
            </button>
          ))}
        </div>

        {/* Create Course Button */}
        <IslamicButton
          variant="primary"
          onClick={() => router.push('/teacher/courses/create')}
          className="whitespace-nowrap"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Course
        </IslamicButton>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <IslamicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
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
          {filteredCourses.map((course) => (
            <IslamicCard key={course.id} className="group hover:shadow-xl transition-shadow overflow-hidden">
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-emerald-400 to-teal-600 overflow-hidden">
                {((course as any).course_image_url || course.thumbnail_url) ? (
                  <img 
                    src={(course as any).course_image_url || course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg></div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(course.status)}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Category & Level */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    {course.category}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">{course.level}</span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-800 line-clamp-2 group-hover:text-emerald-700 transition-colors leading-tight">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                {/* Stats Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{course._count?.enrollments || 0}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-700">
                      {course.price === 0 ? 'Free' : `₹${course.price}`}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {(course.status === 'approved' || course.status === 'published') && (
                    <button
                      onClick={() => router.push(`/teacher/courses/${course.id}/builder`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                    >
                      <BookOpen className="w-4 h-4" />
                      Go to Course Builder
                    </button>
                  )}
                  {course.status === 'draft' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/teacher/courses/${course.id}/edit`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
                      >
                        <Edit className="w-4 h-4" />
                        Edit & Submit
                      </button>
                      <button
                        onClick={() => handleDelete(course.id, course.title)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {course.status === 'pending' && (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-50 border-2 border-yellow-200 text-yellow-700 rounded-lg text-sm font-semibold cursor-not-allowed"
                    >
                      <Clock className="w-4 h-4 animate-pulse" />
                      Awaiting Approval
                    </button>
                  )}
                  {course.status === 'rejected' && (
                    <button
                      onClick={() => router.push(`/teacher/courses/${course.id}/edit`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg text-sm font-semibold"
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
