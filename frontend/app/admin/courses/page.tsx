'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BookOpen, Users, Eye, Trash2, Loader2, CheckCircle, XCircle, Clock, UserPlus, Search } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  price: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  teacher_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  _count?: {
    enrollments: number;
  };
}

export default function AdminCoursesPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (userId) {
      fetchCourses();
    }
  }, [userId]);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`);
      if (res.ok) {
        const response = await res.json();
        console.log('Admin fetched courses:', response);
        // Handle both array and object responses
        const coursesData = Array.isArray(response) ? response : (response.data || []);
        setCourses(coursesData);
        console.log('Courses loaded:', coursesData.length);
      } else {
        console.error('Failed to fetch courses:', res.status, res.statusText);
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (courseId: string) => {
    if (!confirm('Approve this course?')) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (res.ok) {
        alert('Course approved successfully!');
        fetchCourses();
      }
    } catch (error) {
      console.error('Error approving course:', error);
      alert('Failed to approve course');
    }
  };

  const handleReject = async (courseId: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
      });

      if (res.ok) {
        alert('Course rejected');
        fetchCourses();
      }
    } catch (error) {
      console.error('Error rejecting course:', error);
      alert('Failed to reject course');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });

      if (res.ok) {
        alert('Course deleted');
        fetchCourses();
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) : [];

  const statusCounts = {
    all: Array.isArray(courses) ? courses.length : 0,
    pending: Array.isArray(courses) ? courses.filter(c => c.status === 'pending').length : 0,
    approved: Array.isArray(courses) ? courses.filter(c => c.status === 'approved').length : 0,
    rejected: Array.isArray(courses) ? courses.filter(c => c.status === 'rejected').length : 0,
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const icons = {
      draft: Clock,
      pending: Clock,
      approved: CheckCircle,
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Course Management</h1>
        <p className="text-slate-600">Manage all courses, approve submissions, and add co-teachers</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-xs">
                ({statusCounts[status]})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <IslamicCard className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses found</h3>
          <p className="text-slate-500">
            {searchQuery ? 'Try adjusting your search query' : `No ${statusFilter === 'all' ? '' : statusFilter} courses at the moment`}
          </p>
          {courses.length === 0 && (
            <p className="text-xs text-slate-400 mt-4">
              Total courses in database: {courses.length}. 
              {statusFilter !== 'all' && ` Try selecting "All" to see all courses.`}
            </p>
          )}
        </IslamicCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <IslamicCard key={course.id} className="group hover:shadow-xl transition-shadow overflow-hidden">
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-blue-400 to-indigo-600 overflow-hidden">
                {course.thumbnail_url ? (
                  <img 
                    src={course.thumbnail_url} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {getStatusBadge(course.status)}
                </div>
                {course.price > 0 && (
                  <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full shadow-lg">
                    <span className="text-sm font-bold text-blue-700">₹{course.price}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {course.description}
                </p>

                {/* Teacher Info */}
                <div className="flex items-center gap-2 mb-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                    {course.profiles?.full_name?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{course.profiles?.full_name || 'Teacher'}</p>
                    <p className="text-xs text-slate-500">{course.profiles?.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course._count?.enrollments || 0} enrolled</span>
                  </div>
                  <span className="font-semibold">{course.level}</span>
                  <span>{course.category}</span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {course.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(course.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(course.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/courses/${course.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </IslamicCard>
          ))}
        </div>
      )}
    </div>
  );
}
