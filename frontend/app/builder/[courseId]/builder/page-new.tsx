'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { 
  Plus, GripVertical, Video, FileText, Link as LinkIcon, 
  Calendar, Trash2, Edit2, BookOpen, Loader2, ChevronDown, ChevronRight,
  ArrowLeft, Save, Eye, Users, MessageSquare, Bell, Settings as SettingsIcon,
  ClipboardList, Upload, Award, Clock, CheckCircle, XCircle
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

// Open Profile Button (navigates to teacher student detail page)
function OpenProfileButton({ student }: { student: Student | null }) {
  const router = useRouter();
  const params = useParams();
  const courseId = (params as any).courseId as string;
  if (!student) return null;

  const openProfile = () => {
    router.push(`/teacher/courses/${courseId}/students/${student.id}`);
  };

  return (
    <IslamicButton variant="primary" onClick={openProfile} className="bg-indigo-700">
      Open Profile
    </IslamicButton>
  );
}

interface Lesson {
  id: string;
  title: string;
  content_type: 'video' | 'quiz' | 'assignment' | 'resource';
  content_url?: string;
  duration?: number;
  order_index: number;
  quiz_questions?: QuizQuestion[];
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
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrolled_at: string;
  progress: number;
  profile_image_url?: string;
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

export default function CourseBuilderPage() {
  const params = useParams();
  const { userId } = useAuth();
  const router = useRouter();
  const courseId = params.courseId as string;
  
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

  // Grading policy state
  const [gradingPolicy, setGradingPolicy] = useState({
    quiz_percentage: 30,
    activity_percentage: 10,
    final_exam_percentage: 60
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
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const publishCourse = async () => {
    if (hasUnsavedChanges) {
      alert('Please save your changes before publishing');
      return;
    }
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}/publish`, {
        method: 'POST',
        headers: { 'x-clerk-user-id': userId || '' }
      });
      alert('Course published successfully!');
      fetchAllData();
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Failed to publish course');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-emerald-100 flex flex-col shadow-lg">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-600 to-teal-600">
          <h2 className="text-white font-bold text-lg">Course Builder</h2>
          <p className="text-emerald-50 text-xs mt-1 truncate">{course?.title}</p>
        </div>

        {/* Publish Button */}
        <div className="p-4 border-b border-emerald-100">
          <IslamicButton
            variant="primary"
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            onClick={publishCourse}
          >
            <Eye className="w-4 h-4 mr-2" />
            Publish Course
          </IslamicButton>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                    : 'text-slate-700 hover:bg-emerald-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <IslamicButton
              variant="secondary"
              onClick={() => router.push(`/builder/${courseId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </IslamicButton>
            <h1 className="text-2xl font-bold text-emerald-900">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <span className="text-sm text-orange-600 font-medium">Unsaved changes</span>
            )}
            <IslamicButton
              variant="primary"
              onClick={saveChanges}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
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
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'about' && <AboutCourseTab course={course} setCourse={setCourse} setHasUnsavedChanges={setHasUnsavedChanges} />}
          {activeTab === 'content' && <ContentTab weeks={weeks} setWeeks={setWeeks} courseId={courseId} userId={userId} setHasUnsavedChanges={setHasUnsavedChanges} />}
          {activeTab === 'students' && <StudentsTab students={students} submissions={submissions} />}
          {activeTab === 'submissions' && <SubmissionsTab submissions={submissions} setSubmissions={setSubmissions} userId={userId} />}
          {activeTab === 'discussion' && <DiscussionTab courseId={courseId} userId={userId} />}
          {activeTab === 'announcements' && <AnnouncementsTab announcements={announcements} setAnnouncements={setAnnouncements} courseId={courseId} userId={userId} />}
          {activeTab === 'schedule' && <ScheduleTab scheduledClasses={scheduledClasses} setScheduledClasses={setScheduledClasses} courseId={courseId} userId={userId} />}
          {activeTab === 'settings' && <SettingsTab gradingPolicy={gradingPolicy} setGradingPolicy={setGradingPolicy} setHasUnsavedChanges={setHasUnsavedChanges} />}
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
    <div className="max-w-4xl space-y-6">
      <IslamicCard className="p-6">
        <h3 className="text-lg font-bold text-emerald-900 mb-4">Course Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Course Title</label>
            <input
              type="text"
              value={course?.title || ''}
              onChange={(e) => updateCourse('title', e.target.value)}
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              value={course?.description || ''}
              onChange={(e) => updateCourse('description', e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Syllabus</label>
            <textarea
              value={course?.syllabus || ''}
              onChange={(e) => updateCourse('syllabus', e.target.value)}
              rows={6}
              placeholder="Enter detailed syllabus that will be displayed to students..."
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Level</label>
              <select
                value={course?.level || 'beginner'}
                onChange={(e) => updateCourse('level', e.target.value)}
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Capacity</label>
              <input
                type="number"
                value={course?.capacity || ''}
                onChange={(e) => updateCourse('capacity', parseInt(e.target.value))}
                placeholder="Max students"
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Prerequisites</label>
            <input
              type="text"
              value={course?.prerequisites?.join(', ') || ''}
              onChange={(e) => updateCourse('prerequisites', e.target.value.split(',').map((p: string) => p.trim()))}
              placeholder="Enter prerequisites separated by commas"
              className="w-full px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}

// Content Tab Component (Week-based Builder)
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
    <div className="max-w-5xl space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-emerald-900">Course Content</h2>
        <IslamicButton variant="primary" onClick={addWeek} className="bg-emerald-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Week
        </IslamicButton>
      </div>

      {weeks.map((week: Week, weekIndex: number) => (
        <IslamicCard key={week.id} className="overflow-hidden">
          {/* Week Header */}
          <div 
            className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 cursor-pointer hover:from-emerald-100 hover:to-teal-100 transition-colors border-b border-emerald-100"
            onClick={() => toggleWeek(weekIndex)}
          >
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-5 h-5 text-slate-400" />
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
                  className="flex-1 px-3 py-1 border border-emerald-300 rounded-lg font-bold text-lg text-emerald-900"
                  autoFocus
                />
              ) : (
                <div className="flex-1 flex items-center gap-3">
                  <h3 
                    className="font-bold text-lg text-emerald-900 cursor-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWeek(week.id);
                    }}
                  >
                    {week.title}
                  </h3>
                  {week.isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium px-3 py-1 bg-white rounded-full">
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
            <div className="p-5 space-y-3 bg-white">
              {week.lessons && week.lessons.length > 0 && week.lessons.map((lesson: Lesson) => (
                <div 
                  key={lesson.id}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-all"
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    {getContentIcon(lesson.content_type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{lesson.title}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="capitalize px-2 py-0.5 bg-white rounded">{lesson.content_type}</span>
                      {lesson.content_url && (
                        <a href={lesson.content_url} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                          View Link
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingLesson({ ...lesson, weekId: week.id, weekIndex })}
                      className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      onClick={() => deleteLesson(weekIndex, lesson.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Content Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <IslamicButton
                  variant="secondary"
                  className="border-2 border-dashed border-emerald-200 hover:border-emerald-400"
                  onClick={() => addLesson(week.id, weekIndex, 'video')}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Add Video
                </IslamicButton>
                <IslamicButton
                  variant="secondary"
                  className="border-2 border-dashed border-emerald-200 hover:border-emerald-400"
                  onClick={() => addLesson(week.id, weekIndex, 'quiz')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Add Quiz
                </IslamicButton>
                <IslamicButton
                  variant="secondary"
                  className="border-2 border-dashed border-emerald-200 hover:border-emerald-400"
                  onClick={() => addLesson(week.id, weekIndex, 'assignment')}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Assignment
                </IslamicButton>
                <IslamicButton
                  variant="secondary"
                  className="border-2 border-dashed border-emerald-200 hover:border-emerald-400"
                  onClick={() => addLesson(week.id, weekIndex, 'resource')}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add Resource/Link
                </IslamicButton>
              </div>
            </div>
          )}
        </IslamicCard>
      ))}

      {weeks.length === 0 && (
        <IslamicCard className="p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No weeks yet</h3>
          <p className="text-slate-500 mb-6">Start building your course content</p>
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

  const handleSave = () => {
    if (lesson.content_type === 'quiz') {
      setLesson({ ...lesson, quiz_questions: quizQuestions });
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <IslamicCard className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-emerald-900 mb-4">
            Edit {lesson.content_type}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
              <input
                type="text"
                value={lesson.title}
                onChange={(e) => setLesson({ ...lesson, title: e.target.value })}
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg"
              />
            </div>

            {lesson.content_type !== 'quiz' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {lesson.content_type === 'video' ? 'Video URL' : 
                   lesson.content_type === 'assignment' ? 'Assignment Instructions' : 
                   'Resource/Drive Link'}
                </label>
                <input
                  type="text"
                  value={lesson.content_url || ''}
                  onChange={(e) => setLesson({ ...lesson, content_url: e.target.value })}
                  placeholder={lesson.content_type === 'resource' ? 'https://drive.google.com/...' : ''}
                  className="w-full px-4 py-2 border border-emerald-200 rounded-lg"
                />
              </div>
            )}

            {lesson.content_type === 'quiz' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-emerald-900">Quiz Questions</h4>
                  <IslamicButton variant="secondary" onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </IslamicButton>
                </div>

                {quizQuestions.map((q, index) => (
                  <div key={q.id} className="p-4 border border-emerald-200 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-700">Question {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Marks:</label>
                        <input
                          type="number"
                          value={q.marks}
                          onChange={(e) => updateQuestion(index, 'marks', parseInt(e.target.value))}
                          className="w-16 px-2 py-1 border border-emerald-200 rounded"
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter question"
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg"
                    />

                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="px-3 py-2 border border-emerald-200 rounded-lg"
                    >
                      <option value="mcq">Multiple Choice</option>
                      <option value="fill">Fill in the Blank</option>
                    </select>

                    {q.type === 'mcq' && (
                      <div className="space-y-2">
                        {q.options?.map((opt, optIndex) => (
                          <input
                            key={optIndex}
                            type="text"
                            placeholder={`Option ${optIndex + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const newOptions = [...(q.options || [])];
                              newOptions[optIndex] = e.target.value;
                              updateQuestion(index, 'options', newOptions);
                            }}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg"
                          />
                        ))}
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Correct answer"
                      value={q.correct_answer}
                      onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                      className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-green-50"
                    />
                  </div>
                ))}

                <div className="bg-emerald-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-emerald-900">
                    Total Marks: {quizQuestions.reduce((sum, q) => sum + q.marks, 0)} / 100
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <IslamicButton variant="primary" onClick={handleSave} className="flex-1 bg-emerald-600">
              <Save className="w-4 h-4 mr-2" />
              Save
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const getStudentProgress = (studentId: string) => {
    const studentSubmissions = submissions.filter((s: Submission) => s.student_id === studentId);
    return studentSubmissions.length > 0 ? Math.round(studentSubmissions.reduce((sum: number, s: Submission) => sum + (s.grade || 0), 0) / studentSubmissions.length) : 0;
  };

  const overallStats = () => {
    if (!students || students.length === 0) return { avgProgress: 0, total: 0 };
    const avg = Math.round(students.reduce((sum: number, s: Student) => sum + (s.progress || 0), 0) / students.length);
    return { avgProgress: avg, total: students.length };
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar stats */}
        <div className="lg:col-span-1">
          <IslamicCard className="p-4 sticky top-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Students Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Enrolled</p>
                  <p className="text-2xl font-bold text-slate-900">{overallStats().total}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Avg Progress</p>
                  <p className="text-2xl font-bold text-indigo-700">{overallStats().avgProgress}%</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Quick Insights</p>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li>Completed lessons: {students.reduce((sum: number, s: Student) => sum + Math.round((s.progress || 0) / 10), 0)}</li>
                  <li>Pending submissions: {submissions.filter((s: Submission) => s.status === 'pending').length}</li>
                  <li>Certificate eligible: {students.filter((s: Student) => getStudentProgress(s.id) >= 70).length}</li>
                </ul>
              </div>
            </div>
          </IslamicCard>

          <IslamicCard className="p-4 mt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Filters</h4>
            <div className="flex flex-col gap-2">
              <button className="text-left px-3 py-2 rounded-lg hover:bg-slate-50">All Students</button>
              <button className="text-left px-3 py-2 rounded-lg hover:bg-slate-50">Active</button>
              <button className="text-left px-3 py-2 rounded-lg hover:bg-slate-50">At-risk</button>
              <button className="text-left px-3 py-2 rounded-lg hover:bg-slate-50">Certificate Eligible</button>
            </div>
          </IslamicCard>
        </div>

        {/* Students grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student: Student) => (
              <div key={student.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer" onClick={() => setSelectedStudent(student)}>
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div>
                      {student.profile_image_url ? (
                        <img src={student.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold text-lg">
                          {student.name ? student.name.split(' ').map(n => n[0]).slice(0,2).join('') : 'S'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{student.name}</p>
                      <p className="text-sm text-slate-500">{student.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Enrolled</p>
                      <p className="text-sm font-medium text-slate-700">{new Date(student.enrolled_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">Progress</p>
                      <p className="text-sm font-semibold text-slate-800">{student.progress}%</p>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full mt-2 overflow-hidden">
                      <div className="h-3 bg-indigo-600 rounded-full" style={{ width: `${student.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm text-slate-600">Grade</div>
                    <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-semibold text-sm">{getStudentProgress(student.id)}%</div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t bg-slate-50 rounded-b-lg text-right">
                  <button className="text-sm text-indigo-700 font-medium" onClick={(e) => { e.stopPropagation(); setSelectedStudent(student); }}>View Details</button>
                </div>
              </div>
            ))}
          </div>

          {students.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No students enrolled yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <IslamicCard className="max-w-3xl w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-2xl">
                {selectedStudent.name ? selectedStudent.name.split(' ').map(n => n[0]).slice(0,2).join('') : 'S'}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-slate-900">{selectedStudent.name}</h3>
                <p className="text-sm text-slate-600">{selectedStudent.email}</p>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-xs text-slate-500">Progress</p>
                    <p className="text-lg font-bold text-indigo-700">{selectedStudent.progress}%</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-xs text-slate-500">Overall Grade</p>
                    <p className="text-lg font-bold text-slate-900">{getStudentProgress(selectedStudent.id)}%</p>
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-slate-800">Overview</h4>
                  <p className="text-sm text-slate-600 mt-2">Completed lessons: {Math.round(selectedStudent.progress / 10)}</p>
                  <p className="text-sm text-slate-600">Quizzes completed: {submissions.filter((s: Submission) => s.student_id === selectedStudent.id).length}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <IslamicButton variant="secondary" onClick={() => setSelectedStudent(null)}>Close</IslamicButton>
              <OpenProfileButton student={selectedStudent} />
            </div>
          </IslamicCard>
        </div>
      )}
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
    <div className="max-w-6xl space-y-4">
      <h3 className="text-lg font-bold text-emerald-900">Student Submissions</h3>

      {submissions.map((submission: Submission) => (
        <IslamicCard key={submission.id} className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="font-bold text-slate-900">{submission.student_name}</h4>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  submission.status === 'graded' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {submission.status === 'graded' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                  {submission.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-2">{submission.assignment_title}</p>
              <p className="text-xs text-slate-500">
                Submitted: {new Date(submission.submitted_at).toLocaleString()}
              </p>
              <a 
                href={submission.drive_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline text-sm mt-2 inline-flex items-center gap-1"
              >
                <LinkIcon className="w-4 h-4" />
                View Submission
              </a>

              {submission.status === 'graded' && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-semibold text-green-900">Grade: {submission.grade}/100</p>
                  {submission.feedback && (
                    <p className="text-sm text-green-700 mt-1">Feedback: {submission.feedback}</p>
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
                className="bg-emerald-600"
              >
                <Award className="w-4 h-4 mr-2" />
                Grade
              </IslamicButton>
            )}
          </div>
        </IslamicCard>
      ))}

      {submissions.length === 0 && (
        <IslamicCard className="p-12 text-center">
          <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No submissions yet</p>
        </IslamicCard>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <IslamicCard className="max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-emerald-900 mb-4">Grade Submission</h3>
            <p className="text-sm text-slate-600 mb-4">
              Student: <span className="font-semibold">{gradingSubmission.student_name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Grade (out of 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={grade}
                  onChange={(e) => setGrade(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-emerald-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-emerald-200 rounded-lg"
                  placeholder="Provide feedback to the student..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <IslamicButton variant="primary" onClick={gradeSubmission} className="flex-1 bg-emerald-600">
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
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="max-w-4xl">
      <IslamicCard className="p-6">
        <h3 className="text-lg font-bold text-emerald-900 mb-4">Discussion Forum</h3>
        
        <div className="mb-6">
          <textarea
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Start a new discussion..."
            rows={3}
            className="w-full px-4 py-2 border border-emerald-200 rounded-lg mb-2"
          />
          <IslamicButton variant="primary" className="bg-emerald-600">
            <MessageSquare className="w-4 h-4 mr-2" />
            Post Discussion
          </IslamicButton>
        </div>

        <div className="text-center py-12 text-slate-500">
          <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p>No discussions yet. Start the conversation!</p>
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
    <div className="max-w-4xl space-y-6">
      <IslamicCard className="p-6">
        <h3 className="text-lg font-bold text-emerald-900 mb-4">Create Announcement</h3>
        
        <div className="space-y-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Announcement Title"
            className="w-full px-4 py-2 border border-emerald-200 rounded-lg"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Announcement Content"
            rows={4}
            className="w-full px-4 py-2 border border-emerald-200 rounded-lg"
          />
          <IslamicButton variant="primary" onClick={addAnnouncement} className="bg-emerald-600">
            <Bell className="w-4 h-4 mr-2" />
            Post Announcement
          </IslamicButton>
        </div>
      </IslamicCard>

      <div className="space-y-4">
        {announcements.map((announcement: Announcement) => (
          <IslamicCard key={announcement.id} className="p-5">
            <h4 className="font-bold text-lg text-emerald-900 mb-2">{announcement.title}</h4>
            <p className="text-slate-700 mb-3">{announcement.content}</p>
            <p className="text-xs text-slate-500">
              {new Date(announcement.created_at).toLocaleString()}
            </p>
          </IslamicCard>
        ))}

        {announcements.length === 0 && (
          <IslamicCard className="p-12 text-center">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No announcements yet</p>
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
    <div className="max-w-5xl space-y-6">
      <IslamicCard className="p-6">
        <h3 className="text-lg font-bold text-emerald-900 mb-4">Schedule New Class</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            value={newClass.topic}
            onChange={(e) => setNewClass({ ...newClass, topic: e.target.value })}
            placeholder="Class Topic"
            className="px-4 py-2 border border-emerald-200 rounded-lg"
          />
          <input
            type="date"
            value={newClass.date}
            onChange={(e) => setNewClass({ ...newClass, date: e.target.value })}
            className="px-4 py-2 border border-emerald-200 rounded-lg"
          />
          <input
            type="time"
            value={newClass.time}
            onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
            className="px-4 py-2 border border-emerald-200 rounded-lg"
          />
          <input
            type="text"
            value={newClass.meeting_link}
            onChange={(e) => setNewClass({ ...newClass, meeting_link: e.target.value })}
            placeholder="Meeting Link"
            className="px-4 py-2 border border-emerald-200 rounded-lg"
          />
        </div>
        <IslamicButton variant="primary" onClick={scheduleClass} className="mt-4 bg-emerald-600">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Class
        </IslamicButton>
      </IslamicCard>

      <div className="space-y-4">
        {scheduledClasses.map((cls: ScheduledClass) => (
          <IslamicCard key={cls.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-lg text-emerald-900 mb-2">{cls.topic}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(cls.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {cls.time}
                  </span>
                </div>
                {cls.meeting_link && (
                  <a 
                    href={cls.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline text-sm inline-flex items-center gap-1"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Join Meeting
                  </a>
                )}
                {cls.attendance_count !== undefined && (
                  <p className="text-sm text-slate-600 mt-2">
                    Attendance: {cls.attendance_count} students
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
          <IslamicCard className="p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No classes scheduled yet</p>
          </IslamicCard>
        )}
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ gradingPolicy, setGradingPolicy, setHasUnsavedChanges }: any) {
  const updatePolicy = (field: string, value: number) => {
    setGradingPolicy((prev: any) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const totalPercentage = gradingPolicy.quiz_percentage + gradingPolicy.activity_percentage + gradingPolicy.final_exam_percentage;

  return (
    <div className="max-w-4xl">
      <IslamicCard className="p-6">
        <h3 className="text-lg font-bold text-emerald-900 mb-4">Grading Policy</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Quiz Percentage (Current: {gradingPolicy.quiz_percentage}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={gradingPolicy.quiz_percentage}
              onChange={(e) => updatePolicy('quiz_percentage', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Activity Percentage (Current: {gradingPolicy.activity_percentage}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={gradingPolicy.activity_percentage}
              onChange={(e) => updatePolicy('activity_percentage', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Final Exam Percentage (Current: {gradingPolicy.final_exam_percentage}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={gradingPolicy.final_exam_percentage}
              onChange={(e) => updatePolicy('final_exam_percentage', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className={`p-4 rounded-lg ${totalPercentage === 100 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`font-semibold ${totalPercentage === 100 ? 'text-green-900' : 'text-red-900'}`}>
              Total: {totalPercentage}%
              {totalPercentage !== 100 && ' (Must equal 100%)'}
              {totalPercentage === 100 && ' ✓'}
            </p>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <h4 className="font-semibold text-emerald-900 mb-2">Certificate Requirements</h4>
            <p className="text-sm text-emerald-700">
              Students must achieve a minimum of 70% overall grade to receive a certificate.
            </p>
          </div>
        </div>
      </IslamicCard>
    </div>
  );
}
