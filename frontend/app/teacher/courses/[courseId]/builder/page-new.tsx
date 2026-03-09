'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { 
  Plus, GripVertical, Video, FileText, Link as LinkIcon, 
  Calendar, Trash2, Edit2, BookOpen, Loader2, ChevronDown, ChevronRight,
  ArrowLeft, Save, Users, MessageSquare, Bell, Settings as SettingsIcon,
  ClipboardList, Upload, Award, Clock, CheckCircle, XCircle, X, Globe
} from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';

type TabType = 'about' | 'content' | 'students' | 'submissions' | 'discussion' | 'announcements' | 'schedule' | 'settings';

interface Week {
  id: string;
  week_number: number;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
  isExpanded: boolean;
}

interface Lesson {
  id: string;
  title: string;
  content_type: 'video' | 'quiz' | 'assignment' | 'resource';
  content_url?: string;
  duration?: number;
  order_index: number;
  quiz_questions?: QuizQuestion[];
  language?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'fill';
  options?: string[];
  correct_answer: string;
  marks: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  capacity?: number;
  syllabus?: string;
  prerequisites?: string[];
  status: string;
  is_published?: boolean;
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrolled_at: string;
  progress: number;
}

interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  assignment_title: string;
  submitted_at: string;
  drive_link: string;
  grade?: number;
  feedback?: string;
  status: 'pending' | 'graded';
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface ScheduledClass {
  id: string;
  topic: string;
  date: string;
  time: string;
  meeting_link: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  attendance_count?: number;
}

const LANGUAGES = ['English', 'Tamil', 'Arabic', 'Urdu', 'Hindi', 'Other'];

export default function CourseBuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const router = useRouter();
  const courseId = params.courseId as string;
  const isAdmin = searchParams.get('from') === 'admin';
  
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [course, setCourse] = useState<Course | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Grading policy state - text inputs
  const [gradingPolicy, setGradingPolicy] = useState({
    quiz_percentage: '30',
    activity_percentage: '10',
    final_exam_percentage: '60'
  });

  useEffect(() => {
    if (userId && courseId) {
      fetchAllData();
    }
  }, [userId, courseId]);

  const fetchAllData = async () => {
    try {
      const [courseRes, weeksRes, studentsRes, submissionsRes, announcementsRes, classesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/weeks`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/students`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/submissions`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/announcements`, {
          headers: { 'x-clerk-user-id': userId || '' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/classes`, {
          headers: { 'x-clerk-user-id': userId || '' }
        })
      ]);

      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData);
      }

      if (weeksRes.ok) {
        const weeksData = await weeksRes.json();
        const weeksArray = Array.isArray(weeksData) ? weeksData : (weeksData.data || []);
        setWeeks(weeksArray.map((w: any) => ({ ...w, isExpanded: false })));
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(Array.isArray(studentsData) ? studentsData : (studentsData.data || []));
      }

      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        setSubmissions(Array.isArray(submissionsData) ? submissionsData : (submissionsData.data || []));
      }

      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json();
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : (announcementsData.data || []));
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setScheduledClasses(Array.isArray(classesData) ? classesData : (classesData.data || []));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify(course)
      });
      setHasUnsavedChanges(false);
      alert('Changes saved successfully! You can continue editing or publish when ready.');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isAdmin) {
      router.push('/admin/courses');
    } else {
      router.push('/teacher/my-courses');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'about' as TabType, label: 'About Course', icon: BookOpen },
    { id: 'content' as TabType, label: 'Content', icon: FileText },
    { id: 'students' as TabType, label: 'Students', icon: Users },
    { id: 'submissions' as TabType, label: 'Submissions', icon: ClipboardList },
    { id: 'discussion' as TabType, label: 'Discussion', icon: MessageSquare },
    { id: 'announcements' as TabType, label: 'Announcements', icon: Bell },
    { id: 'schedule' as TabType, label: 'Schedule Classes', icon: Calendar },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-purple-100 flex flex-col shadow-xl">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-purple-100 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
          <h2 className="text-white font-bold text-xl tracking-tight">Course Builder</h2>
          <p className="text-purple-100 text-sm mt-2 truncate font-medium">{course?.title}</p>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Save Status */}
        {hasUnsavedChanges && (
          <div className="px-4 pb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-800 font-semibold">Unsaved Changes</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-purple-100 px-8 py-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-all font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to {isAdmin ? 'Admin Dashboard' : 'My Courses'}</span>
            </button>
            <div className="h-6 w-px bg-purple-200" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <IslamicButton
              variant="primary"
              onClick={saveChanges}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-500/30"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </IslamicButton>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'about' && <AboutCourseTab course={course} setCourse={setCourse} setHasUnsavedChanges={setHasUnsavedChanges} />}
          {activeTab === 'content' && <ContentTab weeks={weeks} setWeeks={setWeeks} courseId={courseId} userId={userId} setHasUnsavedChanges={setHasUnsavedChanges} />}
          {activeTab === 'students' && <StudentsTab students={students} submissions={submissions} />}
          {activeTab === 'submissions' && <SubmissionsTab submissions={submissions} setSubmissions={setSubmissions} userId={userId} />}
          {activeTab === 'discussion' && <DiscussionTab courseId={courseId} userId={userId} />}
          {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} setAnnouncements={setAnnouncements} courseId={courseId} userId={userId} />}
          {activeTab === 'schedule' && <ScheduleTab scheduledClasses={scheduledClasses} setScheduledClasses={setScheduledClasses} courseId={courseId} userId={userId} />}
          {activeTab === 'settings' && <SettingsTab course={course} setCourse={setCourse} gradingPolicy={gradingPolicy} setGradingPolicy={setGradingPolicy} setHasUnsavedChanges={setHasUnsavedChanges} userId={userId} courseId={courseId} />}
        </div>
      </div>
    </div>
  );
}

// About Course Tab Component
function AboutCourseTab({ course, setCourse, setHasUnsavedChanges }: any) {
  const updateCourse = (field: string, value: any) => {
    setCourse((prev: any) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <IslamicCard className="p-8 bg-white shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Course Information</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Course Title *</label>
            <input
              type="text"
              value={course?.title || ''}
              onChange={(e) => updateCourse('title', e.target.value)}
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
              placeholder="e.g., Quran Tajweed Mastery"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Description *</label>
            <textarea
              value={course?.description || ''}
              onChange={(e) => updateCourse('description', e.target.value)}
              rows={5}
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Describe what students will learn in this course..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Syllabus (Student-Visible)</label>
            <textarea
              value={course?.syllabus || ''}
              onChange={(e) => updateCourse('syllabus', e.target.value)}
              rows={8}
              placeholder="Enter detailed syllabus, schedule, or course outline that students will see before enrolling..."
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Level (Optional)</label>
              <select
                value={course?.level || ''}
                onChange={(e) => updateCourse('level', e.target.value)}
                className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
              >
                <option value="">Not Specified</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Student Capacity</label>
              <input
                type="number"
                value={course?.capacity || ''}
                onChange={(e) => updateCourse('capacity', parseInt(e.target.value))}
                placeholder="Max students (optional)"
                className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Prerequisites (Comma-separated)</label>
            <input
              type="text"
              value={course?.prerequisites?.join(', ') || ''}
              onChange={(e) => updateCourse('prerequisites', e.target.value.split(',').map((p: string) => p.trim()))}
              placeholder="e.g., Basic Arabic, Introduction to Quran"
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}

// Content Tab Component
function ContentTab({ weeks, setWeeks, courseId, userId, setHasUnsavedChanges }: any) {
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const addWeek = async () => {
    const newWeek = {
      week_number: weeks.length + 1,
      title: `Week ${weeks.length + 1}`,
      description: '',
      course_id: courseId
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/weeks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify(newWeek)
      });

      if (res.ok) {
        const data = await res.json();
        setWeeks([...weeks, { ...data, isExpanded: true, lessons: [] }]);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error adding week:', error);
    }
  };

  const updateWeekTitle = (weekId: string, title: string) => {
    setWeeks(weeks.map((w: Week) => w.id === weekId ? { ...w, title } : w));
    setHasUnsavedChanges(true);
  };

  const toggleWeek = (weekIndex: number) => {
    setWeeks(weeks.map((w: Week, i: number) => 
      i === weekIndex ? { ...w, isExpanded: !w.isExpanded } : w
    ));
  };

  const addLesson = (weekId: string, weekIndex: number, type: 'video' | 'quiz' | 'assignment' | 'resource') => {
    const newLesson = {
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content_type: type,
      content_url: '',
      language: type === 'video' ? 'English' : undefined,
      order_index: weeks[weekIndex].lessons?.length || 0,
      week_id: weekId
    };
    setEditingLesson({ ...newLesson, weekId, weekIndex, isNew: true });
  };

  const saveLesson = async () => {
    if (!editingLesson) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/weeks/${editingLesson.weekId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify(editingLesson)
      });

      if (res.ok) {
        const data = await res.json();
        const updatedWeeks = [...weeks];
        if (!updatedWeeks[editingLesson.weekIndex].lessons) {
          updatedWeeks[editingLesson.weekIndex].lessons = [];
        }
        updatedWeeks[editingLesson.weekIndex].lessons.push(data);
        setWeeks(updatedWeeks);
        setEditingLesson(null);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
    }
  };

  const deleteWeek = async (weekId: string, weekIndex: number) => {
    if (!confirm('Delete this week and all its content?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/weeks/${weekId}`, {
        method: 'DELETE',
        headers: { 'x-clerk-user-id': userId || '' }
      });

      if (res.ok) {
        setWeeks(weeks.filter((_: any, i: number) => i !== weekIndex));
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error deleting week:', error);
    }
  };

  const deleteLesson = async (weekIndex: number, lessonId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lessons/${lessonId}`, {
        method: 'DELETE',
        headers: { 'x-clerk-user-id': userId || '' }
      });

      if (res.ok) {
        const updatedWeeks = [...weeks];
        updatedWeeks[weekIndex].lessons = updatedWeeks[weekIndex].lessons.filter((l: Lesson) => l.id !== lessonId);
        setWeeks(updatedWeeks);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'quiz': return <FileText className="w-4 h-4" />;
      case 'assignment': return <Upload className="w-4 h-4" />;
      case 'resource': return <LinkIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Course Content</h2>
        <IslamicButton 
          variant="primary" 
          onClick={addWeek} 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Week
        </IslamicButton>
      </div>

      {weeks.map((week: Week, weekIndex: number) => (
        <IslamicCard key={week.id} className="overflow-hidden shadow-xl border border-purple-100">
          {/* Week Header */}
          <div 
            className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer hover:from-indigo-100 hover:to-purple-100 transition-all border-b border-purple-200"
            onClick={() => toggleWeek(weekIndex)}
          >
            <div className="flex items-center gap-4 flex-1">
              <GripVertical className="w-5 h-5 text-purple-400" />
              {editingWeek === week.id ? (
                <input
                  type="text"
                  value={week.title}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateWeekTitle(week.id, e.target.value);
                  }}
                  onBlur={() => setEditingWeek(null)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-4 py-2 border-2 border-purple-300 rounded-lg font-bold text-lg text-purple-900"
                  autoFocus
                />
              ) : (
                <div className="flex-1 flex items-center gap-3">
                  <h3 
                    className="font-bold text-lg text-purple-900 cursor-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWeek(week.id);
                    }}
                  >
                    {week.title}
                  </h3>
                  {week.isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-600" />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-700 font-bold px-4 py-2 bg-white rounded-full shadow-sm">
                {week.lessons?.length || 0} items
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteWeek(week.id, weekIndex);
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>

          {/* Lessons List */}
          {week.isExpanded && (
            <div className="p-6 space-y-4 bg-white">
              {week.lessons && week.lessons.length > 0 && week.lessons.map((lesson: Lesson) => (
                <div 
                  key={lesson.id}
                  className="flex items-center gap-4 p-5 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border-2 border-purple-100 hover:border-purple-300 transition-all"
                >
                  <GripVertical className="w-4 h-4 text-purple-400" />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    {getContentIcon(lesson.content_type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{lesson.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                      <span className="capitalize px-3 py-1 bg-white rounded-full font-semibold">{lesson.content_type}</span>
                      {lesson.language && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-semibold">
                          <Globe className="w-3 h-3" />
                          {lesson.language}
                        </span>
                      )}
                      {lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline font-medium">
                          View
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingLesson({ ...lesson, weekId: week.id, weekIndex })}
                      className="p-2.5 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-purple-600" />
                    </button>
                    <button
                      onClick={() => deleteLesson(weekIndex, lesson.id)}
                      className="p-2.5 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Content Buttons */}
              <div className="grid grid-cols-4 gap-3 mt-6">
                <button
                  onClick={() => addLesson(week.id, weekIndex, 'video')}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 rounded-xl transition-all group"
                >
                  <Video className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-purple-700">Video</span>
                </button>
                <button
                  onClick={() => addLesson(week.id, weekIndex, 'quiz')}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl transition-all group"
                >
                  <FileText className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-indigo-700">Quiz</span>
                </button>
                <button
                  onClick={() => addLesson(week.id, weekIndex, 'assignment')}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-pink-300 hover:border-pink-500 hover:bg-pink-50 rounded-xl transition-all group"
                >
                  <Upload className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-pink-700">Assignment</span>
                </button>
                <button
                  onClick={() => addLesson(week.id, weekIndex, 'resource')}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 rounded-xl transition-all group"
                >
                  <LinkIcon className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-amber-700">Resource</span>
                </button>
              </div>
            </div>
          )}
        </IslamicCard>
      ))}

      {weeks.length === 0 && (
        <IslamicCard className="p-16 text-center shadow-xl border border-purple-100">
          <Calendar className="w-20 h-20 text-purple-300 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-slate-700 mb-3">No weeks yet</h3>
          <p className="text-slate-500 mb-8">Start building your course content</p>
        </IslamicCard>
      )}

      {/* Lesson Editor Modal */}
      {editingLesson && (
        <LessonEditorModal 
          lesson={editingLesson} 
          setLesson={setEditingLesson} 
          onSave={saveLesson} 
          onClose={() => setEditingLesson(null)} 
        />
      )}
    </div>
  );
}

// Lesson Editor Modal Component
function LessonEditorModal({ lesson, setLesson, onSave, onClose }: any) {
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(lesson.quiz_questions || []);

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, {
      id: Date.now().toString(),
      question: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 1
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options = [...(updated[questionIndex].options || []), ''];
    setQuizQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...quizQuestions];
    updated[questionIndex].options = updated[questionIndex].options?.filter((_, i) => i !== optionIndex);
    setQuizQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (lesson.content_type === 'quiz') {
      setLesson({ ...lesson, quiz_questions: quizQuestions });
    }
    onSave();
  };

  const totalMarks = quizQuestions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <IslamicCard className="max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Edit {lesson.content_type.charAt(0).toUpperCase() + lesson.content_type.slice(1)}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Title *</label>
              <input
                type="text"
                value={lesson.title}
                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                placeholder="Enter title"
              />
            </div>

            {lesson.content_type === 'video' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Language *</label>
                  <select
                    value={lesson.language || 'English'}
                    onChange={(e) => setLesson({ ...lesson, language: e.target.value })}
                    className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">YouTube URL *</label>
                  <input
                    type="text"
                    value={lesson.content_url || ''}
                    onChange={(e) => setLesson({ ...lesson, content_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </>
            )}

            {lesson.content_type === 'assignment' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Assignment Instructions</label>
                <textarea
                  value={lesson.content_url || ''}
                  onChange={(e) => setLesson({ ...lesson, content_url: e.target.value })}
                  rows={5}
                  placeholder="Describe the assignment requirements..."
                  className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {lesson.content_type === 'resource' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Resource/Drive Link</label>
                <input
                  type="text"
                  value={lesson.content_url || ''}
                  onChange={(e) => setLesson({ ...lesson, content_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {lesson.content_type === 'quiz' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-purple-900 text-lg">Quiz Questions</h4>
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 rounded-xl border-2 border-purple-200">
                    <p className="text-sm font-bold text-purple-900">
                      Total: {totalMarks} marks
                    </p>
                  </div>
                </div>

                {quizQuestions.map((q, index) => (
                  <div key={q.id} className="p-6 border-2 border-purple-200 rounded-xl space-y-4 bg-gradient-to-br from-slate-50 to-purple-50">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-purple-900 text-lg">Question {index + 1}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-bold text-slate-700">Marks:</label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) => updateQuestion(index, 'marks', parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 border-2 border-purple-200 rounded-lg font-bold"
                            min="1"
                          />
                        </div>
                        <button
                          onClick={() => removeQuestion(index)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter question"
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl font-medium"
                    />

                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="px-4 py-3 border-2 border-purple-200 rounded-xl font-bold"
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="fill">Fill in the Blank</option>
                    </select>

                    {q.type === 'mcq' && (
                      <div className="space-y-3">
                        {q.options?.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder={`Option ${optIndex + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...(q.options || [])];
                                newOptions[optIndex] = e.target.value;
                                updateQuestion(index, 'options', newOptions);
                              }}
                              className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-xl"
                            />
                            {(q.options?.length || 0) > 2 && (
                              <button
                                onClick={() => removeOption(index, optIndex)}
                                className="p-2 hover:bg-red-50 rounded-lg"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addOption(index)}
                          className="text-sm font-bold text-purple-600 hover:text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-50"
                        >
                          + Add Option
                        </button>
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Correct answer"
                      value={q.correct_answer}
                      onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-xl bg-green-50 font-bold"
                    />

                    {/* Add Question Button after each question */}
                    <button
                      onClick={addQuestion}
                      className="w-full py-3 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 rounded-xl font-bold text-purple-600 transition-all"
                    >
                      + Add Question Below
                    </button>
                  </div>
                ))}

                {quizQuestions.length === 0 && (
                  <button
                    onClick={addQuestion}
                    className="w-full py-4 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 rounded-xl font-bold text-purple-600"
                  >
                    + Add First Question
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-8">
            <IslamicButton 
              variant="primary" 
              onClick={handleSave} 
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Save {lesson.content_type === 'quiz' && '& Continue'}
            </IslamicButton>
            <IslamicButton variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </IslamicButton>
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}

// Students Tab Component
function StudentsTab({ students, submissions }: any) {
  const getStudentProgress = (studentId: string) => {
    const studentSubmissions = submissions.filter((s: Submission) => s.student_id === studentId);
    return studentSubmissions.length > 0 ? Math.round(studentSubmissions.reduce((sum: number, s: Submission) => sum + (s.grade || 0), 0) / studentSubmissions.length) : 0;
  };

  return (
    <div className="max-w-6xl">
      <IslamicCard className="p-8 shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Enrolled Students</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-purple-900">#</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-purple-900">Name</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-purple-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-purple-900">Enrolled Date</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-purple-900">Progress</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-purple-900">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100">
              {students.map((student: Student, index: number) => (
                <tr key={student.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{student.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(student.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-purple-100 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all" 
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-700 font-bold">{student.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-purple-700 rounded-full text-sm font-bold">
                      {getStudentProgress(student.id)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {students.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-purple-300" />
              <p className="font-medium">No students enrolled yet</p>
            </div>
          )}
        </div>
      </IslamicCard>
    </div>
  );
}

// Submissions Tab Component
function SubmissionsTab({ submissions, setSubmissions, userId }: any) {
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState(0);
  const [feedback, setFeedback] = useState('');

  const gradeSubmission = async () => {
    if (!gradingSubmission) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/submissions/${gradingSubmission.id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ grade, feedback })
      });

      if (res.ok) {
        setSubmissions(submissions.map((s: Submission) => 
          s.id === gradingSubmission.id ? { ...s, grade, feedback, status: 'graded' } : s
        ));
        setGradingSubmission(null);
        setGrade(0);
        setFeedback('');
        alert('Submission graded successfully!');
      }
    } catch (error) {
      console.error('Error grading submission:', error);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Student Submissions</h3>

      {submissions.map((submission: Submission) => (
        <IslamicCard key={submission.id} className="p-6 shadow-xl border border-purple-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h4 className="font-bold text-lg text-slate-900">{submission.student_name}</h4>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                  submission.status === 'graded' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {submission.status === 'graded' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                  {submission.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2 font-medium">{submission.assignment_title}</p>
              <p className="text-xs text-slate-500">
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </p>
              <a 
                href={submission.drive_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-600 hover:text-purple-700 text-sm mt-3 inline-flex items-center gap-1 font-medium"
              >
                <LinkIcon className="w-4 h-4" />
                View Submission
              </a>

              {submission.status === 'graded' && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm font-bold text-green-900">Grade: {submission.grade}/100</p>
                  {submission.feedback && (
                    <p className="text-sm text-green-700 mt-2">Feedback: {submission.feedback}</p>
                  )}
                </div>
              )}
            </div>

            {submission.status === 'pending' && (
              <IslamicButton 
                variant="primary" 
                onClick={() => {
                  setGradingSubmission(submission);
                  setGrade(submission.grade || 0);
                  setFeedback(submission.feedback || '');
                }}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Award className="w-4 h-4 mr-2" />
                Grade
              </IslamicButton>
            )}
          </div>
        </IslamicCard>
      ))}

      {submissions.length === 0 && (
        <IslamicCard className="p-16 text-center shadow-xl border border-purple-100">
          <ClipboardList className="w-20 h-20 text-purple-300 mx-auto mb-6" />
          <p className="text-slate-500 font-medium">No submissions yet</p>
        </IslamicCard>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <IslamicCard className="max-w-lg w-full p-8 shadow-2xl">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">Grade Submission</h3>
            <p className="text-sm text-slate-600 mb-6">
              Student: <span className="font-bold">{gradingSubmission.student_name}</span>
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Grade (out of 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={grade}
                  onChange={(e) => setGrade(parseInt(e.target.value))}
                  className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl font-bold text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl"
                  placeholder="Provide feedback to the student..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <IslamicButton 
                variant="primary" 
                onClick={gradeSubmission} 
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Award className="w-4 h-4 mr-2" />
                Submit Grade
              </IslamicButton>
              <IslamicButton variant="secondary" onClick={() => setGradingSubmission(null)} className="flex-1">
                Cancel
              </IslamicButton>
            </div>
          </IslamicCard>
        </div>
      )}
    </div>
  );
}

// Discussion Tab Component
function DiscussionTab({ courseId, userId }: any) {
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState('');

  return (
    <div className="max-w-5xl">
      <IslamicCard className="p-8 shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Discussion Forum</h3>
        
        <div className="mb-8">
          <textarea
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Start a new discussion..."
            rows={4}
            className="w-full px-5 py-4 border-2 border-purple-200 rounded-xl mb-4"
          />
          <IslamicButton variant="primary" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <MessageSquare className="w-4 h-4 mr-2" />
            Post Discussion
          </IslamicButton>
        </div>

        <div className="text-center py-16 text-slate-500">
          <MessageSquare className="w-20 h-20 text-purple-300 mx-auto mb-6" />
          <p className="font-medium">No discussions yet. Start the conversation!</p>
        </div>
      </IslamicCard>
    </div>
  );
}

// Announcements Tab Component
function AnnouncementsTab({ announcements, setAnnouncements, courseId, userId }: any) {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const addAnnouncement = async () => {
    if (!newTitle || !newContent) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ title: newTitle, content: newContent })
      });

      if (res.ok) {
        const data = await res.json();
        setAnnouncements([data, ...announcements]);
        setNewTitle('');
        setNewContent('');
      }
    } catch (error) {
      console.error('Error adding announcement:', error);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <IslamicCard className="p-8 shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Create Announcement</h3>
        
        <div className="space-y-5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Announcement Title"
            className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl font-bold"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Announcement Content"
            rows={5}
            className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl"
          />
          <IslamicButton variant="primary" onClick={addAnnouncement} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
            <Bell className="w-4 h-4 mr-2" />
            Post Announcement
          </IslamicButton>
        </div>
      </IslamicCard>

      <div className="space-y-4">
        {announcements.map((announcement: Announcement) => (
          <IslamicCard key={announcement.id} className="p-6 shadow-xl border border-purple-100">
            <h4 className="font-bold text-lg text-purple-900 mb-3">{announcement.title}</h4>
            <p className="text-slate-700 mb-4">{announcement.content}</p>
            <p className="text-xs text-slate-500">
              {new Date(announcement.created_at).toLocaleString()}
            </p>
          </IslamicCard>
        ))}

        {announcements.length === 0 && (
          <IslamicCard className="p-16 text-center shadow-xl border border-purple-100">
            <Bell className="w-20 h-20 text-purple-300 mx-auto mb-6" />
            <p className="text-slate-500 font-medium">No announcements yet</p>
          </IslamicCard>
        )}
      </div>
    </div>
  );
}

// Schedule Classes Tab Component
function ScheduleTab({ scheduledClasses, setScheduledClasses, courseId, userId }: any) {
  const [newClass, setNewClass] = useState({
    topic: '',
    date: '',
    time: '',
    meeting_link: ''
  });

  const scheduleClass = async () => {
    if (!newClass.topic || !newClass.date || !newClass.time) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ ...newClass, status: 'scheduled' })
      });

      if (res.ok) {
        const data = await res.json();
        setScheduledClasses([...scheduledClasses, data]);
        setNewClass({ topic: '', date: '', time: '', meeting_link: '' });
      }
    } catch (error) {
      console.error('Error scheduling class:', error);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <IslamicCard className="p-8 shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Schedule New Class</h3>
        
        <div className="grid grid-cols-2 gap-5">
          <input
            type="text"
            value={newClass.topic}
            onChange={(e) => setNewClass({ ...newClass, topic: e.target.value })}
            placeholder="Class Topic"
            className="px-5 py-3 border-2 border-purple-200 rounded-xl"
          />
          <input
            type="date"
            value={newClass.date}
            onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
            className="px-5 py-3 border-2 border-purple-200 rounded-xl"
          />
          <input
            type="time"
            value={newClass.time}
            onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
            className="px-5 py-3 border-2 border-purple-200 rounded-xl"
          />
          <input
            type="text"
            value={newClass.meeting_link}
            onChange={(e) => setNewClass({ ...newClass, meeting_link: e.target.value })}
            placeholder="Meeting Link"
            className="px-5 py-3 border-2 border-purple-200 rounded-xl"
          />
        </div>
        <IslamicButton variant="primary" onClick={scheduleClass} className="mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Class
        </IslamicButton>
      </IslamicCard>

      <div className="space-y-4">
        {scheduledClasses.map((cls: ScheduledClass) => (
          <IslamicCard key={cls.id} className="p-6 shadow-xl border border-purple-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-lg text-purple-900 mb-3">{cls.topic}</h4>
                <div className="flex items-center gap-5 text-sm text-slate-600 mb-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4" />
                    {new Date(cls.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-2 font-medium">
                    <Clock className="w-4 h-4" />
                    {cls.time}
                  </span>
                </div>
                {cls.meeting_link && (
                  <a 
                    href={cls.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 text-sm inline-flex items-center gap-1 font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Join Meeting
                  </a>
                )}
                {cls.attendance_count !== undefined && (
                  <p className="text-sm text-slate-600 mt-3 font-medium">
                    Attendance: {cls.attendance_count} students
                  </p>
                )}
              </div>
              <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                cls.status === 'completed' ? 'bg-green-100 text-green-700' :
                cls.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {cls.status}
              </span>
            </div>
          </IslamicCard>
        ))}

        {scheduledClasses.length === 0 && (
          <IslamicCard className="p-16 text-center shadow-xl border border-purple-100">
            <Calendar className="w-20 h-20 text-purple-300 mx-auto mb-6" />
            <p className="text-slate-500 font-medium">No classes scheduled yet</p>
          </IslamicCard>
        )}
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ course, setCourse, gradingPolicy, setGradingPolicy, setHasUnsavedChanges, userId, courseId }: any) {
  const [publishing, setPublishing] = useState(false);

  const updatePolicy = (field: string, value: string) => {
    setGradingPolicy((prev: any) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const newStatus = course?.is_published ? false : true;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ is_published: newStatus })
      });
      setCourse((prev: any) => ({ ...prev, is_published: newStatus }));
      alert(newStatus ? 'Course published successfully!' : 'Course unpublished successfully!');
    } catch (error) {
      console.error('Error toggling publish:', error);
      alert('Failed to update publish status');
    } finally {
      setPublishing(false);
    }
  };

  const quiz = parseInt(gradingPolicy.quiz_percentage) || 0;
  const activity = parseInt(gradingPolicy.activity_percentage) || 0;
  const finalExam = parseInt(gradingPolicy.final_exam_percentage) || 0;
  const totalPercentage = quiz + activity + finalExam;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Publish Toggle */}
      <IslamicCard className="p-8 shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Publish Course</h3>
        
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-purple-200">
          <div>
            <p className="font-bold text-lg text-slate-900 mb-2">
              {course?.is_published ? 'Course is Live' : 'Course is Draft'}
            </p>
            <p className="text-sm text-slate-600">
              {course?.is_published ? 'Students can enroll and access content' : 'Only you can see this course'}
            </p>
          </div>
          <button
            onClick={togglePublish}
            disabled={publishing}
            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
              course?.is_published ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-lg transition-transform ${
                course?.is_published ? 'translate-x-11' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </IslamicCard>

      {/* Grading Policy */}
      <IslamicCard className="p-8 shadow-xl border border-purple-100">
        <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">Grading Policy</h3>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Quiz Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.quiz_percentage}
              onChange={(e) => updatePolicy('quiz_percentage', e.target.value)}
              placeholder="e.g., 30"
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Activity Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.activity_percentage}
              onChange={(e) => updatePolicy('activity_percentage', e.target.value)}
              placeholder="e.g., 10"
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl font-bold text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Final Exam Percentage
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={gradingPolicy.final_exam_percentage}
              onChange={(e) => updatePolicy('final_exam_percentage', e.target.value)}
              placeholder="e.g., 60"
              className="w-full px-5 py-3 border-2 border-purple-200 rounded-xl font-bold text-lg"
            />
          </div>

          <div className={`p-5 rounded-xl ${totalPercentage === 100 ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
            <p className={`font-bold text-lg ${totalPercentage === 100 ? 'text-green-900' : 'text-red-900'}`}>
              Total: {totalPercentage}%
              {totalPercentage !== 100 && ' (Must equal 100%)'}
              {totalPercentage === 100 && ' ✓'}
            </p>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-purple-200">
            <h4 className="font-bold text-purple-900 mb-3">Certificate Requirements</h4>
            <p className="text-sm text-purple-700 font-medium">
              Students must achieve a minimum of 70% overall grade to receive a certificate.
            </p>
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}
