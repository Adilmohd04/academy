'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { 
  Archive, 
  RefreshCw, 
  Trash2, 
  ArrowRight, 
  Video, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ArchivedCourse {
  id: string;
  title: string;
  course_type: 'live' | 'hybrid' | 'pre-recorded';
  archived_at: string;
  ends_at: string | null;
  teacher_name: string;
  enrollment_count: number;
  total_revenue: number;
}

export default function ArchivedCoursesPage() {
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<ArchivedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchArchivedCourses = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/courses/archived`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch archived courses');

      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching archived courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedCourses();
  }, []);

  const handleConvertToPreRecorded = async (courseId: string, title: string) => {
    if (!confirm(`Convert "${title}" to pre-recorded course?\n\nThis will:\n- Remove the course from archive\n- Change type to pre-recorded\n- Set status to draft (requires re-approval)\n- Remove end date`)) {
      return;
    }

    setConverting(courseId);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/courses/${courseId}/convert-to-prerecorded`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to convert course');
      }

      alert(`✅ Course converted successfully!\n\n${data.message}\n\nThe course is now in draft status and requires re-approval.`);
      
      // Refresh the list
      fetchArchivedCourses();
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setConverting(null);
    }
  };

  const handleRestore = async (courseId: string, title: string) => {
    if (!confirm(`Restore "${title}" from archive?`)) {
      return;
    }

    setRestoring(courseId);
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/courses/${courseId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to restore course');

      alert('✅ Course restored successfully!');
      fetchArchivedCourses();
    } catch (error) {
      alert('❌ Failed to restore course');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="w-8 h-8 text-gray-600" />
            <h1 className="text-3xl font-bold text-gray-900">Archived Courses</h1>
          </div>
          <p className="text-gray-600">
            Manage archived courses - restore them or convert to pre-recorded
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Archived</div>
            <div className="text-3xl font-bold text-gray-900">{courses.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Live/Hybrid Courses</div>
            <div className="text-3xl font-bold text-emerald-600">
              {courses.filter(c => c.course_type === 'live' || c.course_type === 'hybrid').length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Can be converted to pre-recorded</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-blue-600">
              ₹{courses.reduce((sum, c) => sum + c.total_revenue, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Courses List */}
        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Archived Courses</h3>
            <p className="text-gray-600">Courses that have ended will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        course.course_type === 'live' 
                          ? 'bg-red-100 text-red-700'
                          : course.course_type === 'hybrid'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {course.course_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Teacher:</span> {course.teacher_name}
                      </div>
                      <div>
                        <span className="font-medium">Enrollments:</span> {course.enrollment_count}
                      </div>
                      <div>
                        <span className="font-medium">Revenue:</span> ₹{course.total_revenue.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Archived:</span>{' '}
                        {new Date(course.archived_at).toLocaleDateString()}
                      </div>
                    </div>

                    {course.ends_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <Calendar className="w-4 h-4" />
                        <span>Ended on {new Date(course.ends_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {(course.course_type === 'live' || course.course_type === 'hybrid') && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800">
                            <strong>Conversion Available:</strong> This {course.course_type} course can be converted to pre-recorded format to make it accessible again.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleRestore(course.id, course.title)}
                    disabled={restoring === course.id}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {restoring === course.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Restore Course
                      </>
                    )}
                  </button>

                  {(course.course_type === 'live' || course.course_type === 'hybrid') && (
                    <button
                      onClick={() => handleConvertToPreRecorded(course.id, course.title)}
                      disabled={converting === course.id}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {converting === course.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4" />
                          Convert to Pre-Recorded
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
