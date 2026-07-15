'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Eye, Trash2, Loader2, UserPlus, Search, X, AlertTriangle, Award } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Course {
  id: string;
  title: string;
  price: number;
  teacher_id: string;
  teacher_name?: string;
  status?: string;
  is_published?: boolean;
  approval_status?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  profiles?: {
    full_name: string;
    email?: string;
    clerk_user_id?: string;
    id?: string;
  };
  teacher?: {
    id?: string;
    clerk_user_id?: string;
    full_name?: string;
    email?: string;
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

type CourseDisplayStatus = 'published' | 'approved' | 'draft' | 'archived' | 'pending';

function getCourseDisplayStatus(course: Course): CourseDisplayStatus {
  const status = (course.status || '').toLowerCase();
  const approval = (course.approval_status || '').toLowerCase();

  if (course.is_published) return 'published';
  if (status === 'archived') return 'archived';
  if (status === 'published') return 'published';
  if (approval === 'approved') return 'approved';
  if (status === 'draft' || approval === 'draft') return 'draft';
  return 'pending';
}

function getStatusStyle(status: CourseDisplayStatus): { label: string; className: string } {
  switch (status) {
    case 'published':
      return {
        label: 'Published',
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
      };
    case 'approved':
      return {
        label: 'Approved',
        className: 'bg-sky-100 text-sky-800 border border-sky-200'
      };
    case 'draft':
      return {
        label: 'Draft',
        className: 'bg-amber-100 text-amber-800 border border-amber-200'
      };
    case 'archived':
      return {
        label: 'Archived',
        className: 'bg-slate-200 text-slate-700 border border-slate-300'
      };
    default:
      return {
        label: 'Pending',
        className: 'bg-violet-100 text-violet-800 border border-violet-200'
      };
  }
}

export default function CourseManagementPage() {
  const { userId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCoTeacherModal, setShowCoTeacherModal] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<{id: string, title: string} | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const getCoursePriority = (course: Course): number => {
    const approval = (course.approval_status || '').toLowerCase();
    const status = (course.status || '').toLowerCase();

    let score = 0;
    if (course.is_published) score += 600;
    if (status === 'published') score += 500;

    if (approval === 'approved') score += 300;
    else if (approval === 'pending_approval') score += 200;
    else if (approval === 'draft') score += 100;

    if (status === 'draft') score += 10;

    return score;
  };

  const getCourseTimestamp = (course: Course): number => {
    const raw = course.updated_at || course.created_at;
    return raw ? new Date(raw).getTime() : 0;
  };

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
        const byTeacherAndTitle = new Map<string, Course>();

        for (const course of coursesData as Course[]) {
          const normalizedTitle = (course.title || '').trim().toLowerCase();
          const ownerKey = course.teacher_id || course.created_by || 'unknown-teacher';
          const dedupeKey = `${ownerKey}::${normalizedTitle}`;

          const existing = byTeacherAndTitle.get(dedupeKey);
          if (!existing) {
            byTeacherAndTitle.set(dedupeKey, course);
            continue;
          }

          const existingPriority = getCoursePriority(existing);
          const currentPriority = getCoursePriority(course);

          if (currentPriority > existingPriority) {
            byTeacherAndTitle.set(dedupeKey, course);
            continue;
          }

          if (currentPriority === existingPriority && getCourseTimestamp(course) > getCourseTimestamp(existing)) {
            byTeacherAndTitle.set(dedupeKey, course);
          }
        }

        const uniqueCourses: Course[] = Array.from(byTeacherAndTitle.values());
        setCourses(uniqueCourses);
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
        const teachersData = Array.isArray(response)
          ? response
          : (response.teachers || response.data || []);
        setTeachers(teachersData);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleDeleteClick = (courseId: string, courseTitle: string) => {
    setCourseToDelete({ id: courseId, title: courseTitle });
    setDeleteInput('');
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    if (deleteInput !== 'DELETE') return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/courses/${courseToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });

      if (res.ok) {
        alert('Course deleted successfully');
        setCourseToDelete(null);
        fetchCourses();
      } else {
        alert('Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('An error occurred while deleting the course');
    } finally {
      setIsDeleting(false);
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

    // Primary teacher can appear as profile UUID or Clerk user ID depending on API source.
    const primaryTeacherProfileIds = new Set<string>([
      selectedCourse.teacher_id,
      selectedCourse.teacher?.id,
      selectedCourse.profiles?.id,
    ].filter(Boolean) as string[]);

    const primaryTeacherClerkIds = new Set<string>([
      selectedCourse.created_by,
      selectedCourse.teacher?.clerk_user_id,
      selectedCourse.profiles?.clerk_user_id,
    ].filter(Boolean) as string[]);

    // Filter out teachers who are already co-teachers or the primary teacher
    return teachers.filter(t => {
      // Don't show if already a co-teacher (match by clerk_user_id or profile id)
      if (existingCoTeacherClerkIds.has(t.clerk_user_id)) return false;
      if (t.id && existingCoTeacherProfileIds.has(t.id)) return false;

      // Don't show the primary teacher (supports both profile UUID and clerk_user_id variants)
      if (t.id && primaryTeacherProfileIds.has(t.id)) return false;
      if (primaryTeacherClerkIds.has(t.clerk_user_id)) return false;
      
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
    [
      course.title,
      course.profiles?.full_name,
      course.teacher?.full_name,
      course.teacher_name,
      getStatusStyle(getCourseDisplayStatus(course)).label,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const statusCounts = courses.reduce(
    (acc, course) => {
      const status = getCourseDisplayStatus(course);
      acc[status] += 1;
      return acc;
    },
    {
      published: 0,
      approved: 0,
      draft: 0,
      archived: 0,
      pending: 0,
    } as Record<CourseDisplayStatus, number>
  );

  return (
    <div className="admin-page-wrap space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-[#d9d3c2] bg-[linear-gradient(130deg,#fff9ec_0%,#f4f8ff_55%,#eef7f3_100%)] p-6 md:p-8 shadow-[0_12px_32px_rgba(30,64,175,0.08)]">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1f2f46] mb-2">Course Management</h1>
        <p className="text-[#4f5f72] text-sm md:text-base">View and manage all courses in the system</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center rounded-full border border-[#dbeafe] bg-white/90 px-3 py-1 text-xs font-semibold text-[#1e3a8a]">
            Total: {courses.length}
          </span>
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            Published: {statusCounts.published}
          </span>
          <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
            Approved: {statusCounts.approved}
          </span>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Draft: {statusCounts.draft}
          </span>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Archived: {statusCounts.archived}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#d6deea] bg-white/95 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2b5f9b]"
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
        <IslamicCard className="overflow-hidden border border-[#d8dfec] rounded-2xl shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-[linear-gradient(120deg,#f6f9ff_0%,#f5fbf7_100%)] border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wide font-semibold text-slate-600">Course Name</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wide font-semibold text-slate-600">Teacher</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wide font-semibold text-slate-600">Co-Teachers</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wide font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wide font-semibold text-slate-600">Price</th>
                  <th className="px-6 py-4 text-left text-xs uppercase tracking-wide font-semibold text-slate-600">Enrolled Students</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-wide font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-[#f8fbff] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 leading-6 max-w-[320px]">{course.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">
                        {course.profiles?.full_name || course.teacher?.full_name || course.teacher_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600 max-w-[260px]">
                        {course.co_teachers && course.co_teachers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {course.co_teachers.map((ct, idx) => (
                              <span key={ct.clerk_user_id || idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#edf9f2] text-emerald-800 border border-emerald-200">
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
                      {(() => {
                        const status = getStatusStyle(getCourseDisplayStatus(course));
                        return (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">
                        {course.price === 0 ? (
                          <span className="text-emerald-700">Free</span>
                        ) : (
                          `₹${course.price}`
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">{course._count?.enrollments || 0}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(`/builder/${course.id}`, '_blank')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#1e4b8f] text-white rounded-lg hover:bg-[#163b72] transition-colors text-xs font-semibold"
                          title="Open Course Builder"
                        >
                          <Eye className="w-4 h-4" />
                          Builder
                        </button>
                        <button
                          onClick={() => window.open(`/builder/${course.id}/certificate-design`, '_blank')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-[#3b4f9f] text-white rounded-lg hover:bg-[#2f417f] transition-colors text-xs font-semibold"
                          title="Open Certificate Designer"
                        >
                          <Award className="w-4 h-4" />
                          Certificate
                        </button>
                        <button
                          onClick={() => openCoTeacherModal(course)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-semibold"
                          title="Add Co-Teacher"
                        >
                          <UserPlus className="w-4 h-4" />
                          Co-Teacher
                        </button>
                        <button
                          onClick={() => handleDeleteClick(course.id, course.title)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-semibold"
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

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full flex-shrink-0 mt-1">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-900 mb-1">Delete Course?</h2>
                <p className="text-red-700 text-sm font-medium">This action CANNOT be undone.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-600">
                You are about to perfectly delete the course <strong>"{courseToDelete.title}"</strong>.
              </p>
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <p className="text-sm text-slate-700 font-medium">This will permanently erase:</p>
                <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
                  <li>All course content and materials</li>
                  <li>All student enrollments and progress</li>
                  <li>All grades, ratings, and reviews</li>
                </ul>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  To confirm, type <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-red-600">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono uppercase"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setCourseToDelete(null)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors font-medium"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteInput !== 'DELETE' || isDeleting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors font-medium text-white ${
                  deleteInput === 'DELETE' 
                    ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20' 
                    : 'bg-slate-300 cursor-not-allowed opacity-50'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete Course
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
