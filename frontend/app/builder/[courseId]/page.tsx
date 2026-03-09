'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { 
  BookOpen, Users, DollarSign, BarChart, Settings, Edit, 
  Loader2, ArrowRight, CheckCircle, AlertCircle 
} from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  thumbnail_url?: string;
  status: string;
  prerequisites?: string[];
  _count?: {
    enrollments: number;
  };
}

export default function CourseOverviewPage() {
  const params = useParams();
  const { userId } = useAuth();
  const router = useRouter();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId && courseId) {
      fetchCourse();
    }
  }, [userId, courseId]);

  const fetchCourse = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        headers: { 'x-clerk-user-id': userId || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <IslamicCard className="p-12 text-center max-w-lg mx-auto">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Course not found</h3>
          <p className="text-slate-500 mb-6">The course you're looking for doesn't exist or you don't have access.</p>
        </IslamicCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      {/* Course Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-emerald-900 mb-3">{course.title}</h1>
            <p className="text-lg text-slate-600 mb-4">{course.description}</p>
            
            {/* Course Status */}
            <div className="flex items-center gap-3">
              {course.status === 'published' || course.status === 'approved' ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium">
                  <CheckCircle className="w-5 h-5" />
                  {course.status === 'published' ? 'Published' : 'Approved'}
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg font-medium">
                  <AlertCircle className="w-5 h-5" />
                  {course.status}
                </span>
              )}
            </div>
          </div>

          <IslamicButton
            variant="primary"
            onClick={() => router.push(`/builder/${courseId}/builder`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-3"
          >
            Go to Course Builder
            <ArrowRight className="w-5 h-5 ml-2" />
          </IslamicButton>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <IslamicCard className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Enrollments</p>
              <p className="text-2xl font-bold text-emerald-900">{course._count?.enrollments || 0}</p>
            </div>
          </div>
        </IslamicCard>

        <IslamicCard className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Price</p>
              <p className="text-2xl font-bold text-blue-900">
                {course.price === 0 ? 'Free' : `₹${course.price}`}
              </p>
            </div>
          </div>
        </IslamicCard>

        <IslamicCard className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <BarChart className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Level</p>
              <p className="text-2xl font-bold text-purple-900 capitalize">{course.level}</p>
            </div>
          </div>
        </IslamicCard>
      </div>

      {/* Course Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* About Course */}
        <IslamicCard className="p-6">
          <h2 className="text-2xl font-bold text-emerald-900 mb-4">About this Course</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600">Category</label>
              <p className="text-lg text-slate-800 mt-1">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                  {course.category}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Level</label>
              <p className="text-lg text-slate-800 capitalize mt-1">{course.level}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Status</label>
              <p className="text-lg text-slate-800 capitalize mt-1">{course.status}</p>
            </div>
          </div>
        </IslamicCard>

        {/* Prerequisites */}
        <IslamicCard className="p-6">
          <h2 className="text-2xl font-bold text-emerald-900 mb-4">Prerequisites</h2>
          {course.prerequisites && course.prerequisites.length > 0 ? (
            <ul className="space-y-2">
              {course.prerequisites.map((prereq, index) => (
                <li key={index} className="flex items-center gap-2 text-slate-700">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  {prereq}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No prerequisites required</p>
              <p className="text-xs mt-1">Students can enroll without completing other courses</p>
            </div>
          )}
          <IslamicButton
            variant="secondary"
            className="w-full mt-4"
            onClick={() => {/* Add prerequisites modal */}}
          >
            <Edit className="w-4 h-4 mr-2" />
            Manage Prerequisites
          </IslamicButton>
        </IslamicCard>
      </div>

      {/* Course Thumbnail */}
      <IslamicCard className="p-6 mb-8">
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">Course Thumbnail</h2>
        <div className="w-full h-96 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
          {course.thumbnail_url ? (
            <img 
              src={course.thumbnail_url} 
              alt={course.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-slate-400">
              <BookOpen className="w-24 h-24 mx-auto mb-4" />
              <p className="text-lg">No thumbnail uploaded</p>
              <IslamicButton variant="secondary" className="mt-4">
                Upload Thumbnail
              </IslamicButton>
            </div>
          )}
        </div>
      </IslamicCard>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IslamicButton
          variant="secondary"
          className="w-full"
          onClick={() => router.push(`/builder/${courseId}/builder`)}
        >
          <BookOpen className="w-5 h-5 mr-2" />
          Manage Content
        </IslamicButton>
        <IslamicButton
          variant="secondary"
          className="w-full"
          onClick={() => router.push(`/builder/${courseId}/students`)}
        >
          <Users className="w-5 h-5 mr-2" />
          View Students
        </IslamicButton>
        <IslamicButton
          variant="secondary"
          className="w-full"
          onClick={() => router.push(`/builder/${courseId}/settings`)}
        >
          <Settings className="w-5 h-5 mr-2" />
          Course Settings
        </IslamicButton>
      </div>
    </div>
  );
}
