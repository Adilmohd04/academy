'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { 
  BookOpen, Users, Calendar, Settings, Edit3, 
  Video, FileText, Award, TrendingUp, ArrowLeft
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  capacity?: number;
  status: string;
  is_published?: boolean;
  enrolled_count?: number;
  image_url?: string;
  syllabus?: string;
}

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: 0,
    weeks: 0,
    lessons: 0,
    completionRate: 0
  });

  useEffect(() => {
    if (userId && courseId) {
      fetchCourseData();
    }
  }, [userId, courseId]);

  const fetchCourseData = async () => {
    try {
      const [courseRes, weeksRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/weeks`, {
          headers: { 'x-clerk-user-id': userId || '' }
        })
      ]);

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData);
        // Use enrolled_count from course data if available
        setStats(prev => ({ ...prev, students: courseData.enrolled_count || 0 }));
      }

      let totalLessons = 0;
      if (weeksRes.ok) {
        const weeksData = await weeksRes.json();
        const weeks = Array.isArray(weeksData) ? weeksData : (weeksData.data || []);
        weeks.forEach((week: any) => {
          totalLessons += week.lessons?.length || 0;
        });
        setStats(prev => ({ ...prev, weeks: weeks.length, lessons: totalLessons }));
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              {course.image_url && (
                <img 
                  src={course.image_url} 
                  alt={course.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              )}
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{course.title}</h1>
              <p className="text-gray-600 text-lg mb-4">{course.description}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {course.level || 'All Levels'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  course.is_published 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {course.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/teacher/courses/${courseId}/builder`)}
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold text-base transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 className="w-5 h-5" />
            Go to Course Builder
          </button>
        </div>
      </div>

      {/* Course Details */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {course.syllabus && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Syllabus</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{course.syllabus}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Course Statistics</h3>
              <div className="space-y-2">
                <p className="text-gray-900"><span className="font-semibold">{stats.students}</span> Enrolled Students</p>
                <p className="text-gray-900"><span className="font-semibold">{stats.weeks}</span> Course Weeks</p>
                <p className="text-gray-900"><span className="font-semibold">{stats.lessons}</span> Total Lessons</p>
              </div>
            </div>

            {course.capacity && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Capacity</h3>
                <p className="text-gray-900">Maximum <span className="font-semibold">{course.capacity}</span> students</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
