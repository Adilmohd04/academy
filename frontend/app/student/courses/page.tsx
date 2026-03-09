'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, CheckCircle, Clock, Award, Loader2, TrendingUp } from 'lucide-react';
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enrollments/my-courses`, {
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

  const filteredEnrollments = enrollments.filter(enrollment =>
    filter === 'active' ? !enrollment.completed : enrollment.completed
  );

  const activeCount = enrollments.filter(e => !e.completed).length;
  const completedCount = enrollments.filter(e => e.completed).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-900 mb-2">My Courses</h1>
        <p className="text-slate-600">Continue your learning journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <IslamicCard className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Courses</p>
              <p className="text-2xl font-bold text-purple-900">{enrollments.length}</p>
            </div>
          </div>
        </IslamicCard>

        <IslamicCard className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-900">{activeCount}</p>
            </div>
          </div>
        </IslamicCard>

        <IslamicCard className="p-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold text-green-900">{completedCount}</p>
            </div>
          </div>
        </IslamicCard>
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
          {filteredEnrollments.map((enrollment) => (
            <IslamicCard 
              key={enrollment.id} 
              className="group hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-purple-400 to-indigo-600 overflow-hidden">
                {enrollment.course_image_url ? (
                  <img 
                    src={enrollment.course_image_url} 
                    alt={enrollment.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-white opacity-50" />
                  </div>
                )}
                
                {/* Progress Overlay */}
                {!enrollment.completed && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white font-medium">Progress</span>
                      <span className="text-xs text-white font-bold">{enrollment.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Completed Badge */}
                {enrollment.completed && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">Completed</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Category - removed since not in API response */}

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-purple-700 transition-colors">
                  {enrollment.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {enrollment.description}
                </p>

                {/* Teacher */}
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                  <span>By {enrollment.teacher_name || 'Instructor'}</span>
                </div>

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
          ))}
        </div>
      )}
    </div>
  );
}
