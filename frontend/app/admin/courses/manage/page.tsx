'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Eye, Trash2, Loader2, UserPlus, Search, X } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Course {
  id: string;
  title: string;
  price: number;
  teacher_id: string;
  profiles?: {
    full_name: string;
  };
  _count?: {
    enrollments: number;
  };
  co_teachers?: Array<{ 
    id?: string;
    clerk_user_id: string;
    full_name?: string;
    email?: string;
  }>;
}

interface Teacher {
  id?: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
}

export default function CourseManagementPage() {
  const { userId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCoTeacherModal, setShowCoTeacherModal] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCourses();
      fetchTeachers();
    }
  }, [userId]);

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`);
      if (res.ok) {
        const response = await res.json();
        const coursesData = Array.isArray(response) ? response : (response.data || []);
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/teachers`, {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      if (res.ok) {
        const response = await res.json();
        const teachersData = Array.isArray(response) ? response : (response.data || []);
        setTeachers(teachersData);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleDelete = async (courseId: string, courseTitle: string) => {
    const confirmation = prompt(`Type "DELETE" to confirm deletion of "${courseTitle}"`);
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled. You must type "DELETE" exactly.');
      return;
    }

    if (!confirm(`⚠️ WARNING: This will permanently delete the course "${courseTitle}" and ALL associated data including:\n\n- All course content and materials\n- All student enrollments\n- All progress data\n- All ratings and reviews\n\nThis action CANNOT be undone!\n\nAre you absolutely sure you want to proceed?`)) {
      return;
    }

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
      alert('An error occurred while deleting the course');
    }
  };

  const openCoTeacherModal = (course: Course) => {
    setSelectedCourse(course);
    setShowCoTeacherModal(true);
  };

  const getAvailableTeachers = () => {
    if (!selectedCourse) return [];
    
    // Get all teacher IDs already associated with the course
    const existingCoTeacherClerkIds = new Set(
      selectedCourse.co_teachers?.map(ct => ct.clerk_user_id) || []
    );
    const existingCoTeacherProfileIds = new Set(
      selectedCourse.co_teachers?.map(ct => ct.id).filter(Boolean) || []
    );

    // Filter out teachers who are already co-teachers or the primary teacher
    return teachers.filter(t => {
      // Don't show if already a co-teacher (match by clerk_user_id or profile id)
      if (existingCoTeacherClerkIds.has(t.clerk_user_id)) return false;
      if (t.id && existingCoTeacherProfileIds.has(t.id)) return false;
      
      // Don't show the primary teacher (course.teacher_id is profile UUID)
      if (t.id && t.id === selectedCourse.teacher_id) return false;
      
      return true;
    });
  };

  const addCoTeacher = async (teacherId: string) => {
    if (!selectedCourse) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/courses/${selectedCourse.id}/co-teachers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ teacherId })
      });

      if (res.ok) {
        alert('Co-teacher added successfully');
        setShowCoTeacherModal(false);
        fetchCourses();
      } else {
        alert('Failed to add co-teacher');
      }
    } catch (error) {
      console.error('Error adding co-teacher:', error);
    }
  };

  const removeCoTeacher = async (teacherClerkId: string) => {
    if (!selectedCourse) return;
    
    if (!confirm('Are you sure you want to remove this co-teacher?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/courses/${selectedCourse.id}/co-teachers/${teacherClerkId}`, {
        method: 'DELETE',
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });

      if (res.ok) {
        alert('Co-teacher removed successfully');
        fetchCourses();
        // Update modal if still open
        if (showCoTeacherModal) {
          const updatedCourse = courses.find(c => c.id === selectedCourse.id);
          if (updatedCourse) setSelectedCourse(updatedCourse);
        }
      } else {
        alert('Failed to remove co-teacher');
      }
    } catch (error) {
      console.error('Error removing co-teacher:', error);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Course Management</h1>
        <p className="text-slate-600">View and manage all courses in the system</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Courses Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredCourses.length === 0 ? (
        <IslamicCard className="p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses found</h3>
          <p className="text-slate-500">
            {searchQuery ? 'Try adjusting your search query' : 'No courses in the system'}
          </p>
        </IslamicCard>
      ) : (
        <IslamicCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Course Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Teacher</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Co-Teachers</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Price</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Enrolled Students</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{course.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600">{course.profiles?.full_name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600">
                        {course.co_teachers && course.co_teachers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {course.co_teachers.map((ct, idx) => (
                              <span key={ct.clerk_user_id || idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                {ct.full_name || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">
                        {course.price === 0 ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          `₹${course.price}`
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600">{course._count?.enrollments || 0}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/builder/${course.id}`, '_blank')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          title="Open Course Builder"
                        >
                          <Eye className="w-4 h-4" />
                          Builder
                        </button>
                        <button
                          onClick={() => openCoTeacherModal(course)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                          title="Add Co-Teacher"
                        >
                          <UserPlus className="w-4 h-4" />
                          Co-Teacher
                        </button>
                        <button
                          onClick={() => handleDelete(course.id, course.title)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </IslamicCard>
      )}

      {/* Co-Teacher Modal */}
      {showCoTeacherModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Manage Co-Teachers</h2>
                <p className="text-slate-600 mt-1">For: {selectedCourse.title}</p>
              </div>
              <button
                onClick={() => setShowCoTeacherModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>
            
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
              {/* Current Co-Teachers */}
              {selectedCourse.co_teachers && selectedCourse.co_teachers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Current Co-Teachers</h3>
                  <div className="space-y-2">
                    {selectedCourse.co_teachers.map((coTeacher) => (
                      <div
                        key={coTeacher.clerk_user_id}
                        className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {coTeacher.full_name?.charAt(0) || 'T'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{coTeacher.full_name || 'Unknown'}</div>
                            <div className="text-sm text-slate-500">Co-Teacher</div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeCoTeacher(coTeacher.clerk_user_id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Co-Teacher */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-3">Add New Co-Teacher</h3>
                {getAvailableTeachers().length === 0 ? (
                  <p className="text-center text-slate-500 py-8 bg-slate-50 rounded-lg">
                    No available teachers to add
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getAvailableTeachers().map((teacher) => (
                      <div
                        key={teacher.clerk_user_id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {teacher.full_name?.charAt(0) || 'T'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{teacher.full_name}</div>
                            <div className="text-sm text-slate-500">{teacher.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => addCoTeacher(teacher.clerk_user_id)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200">
              <button
                onClick={() => setShowCoTeacherModal(false)}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
