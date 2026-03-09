'use client';

import { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Radio,
  Link as LinkIcon,
  ClipboardList,
  Eye,
  Send
} from 'lucide-react';

// Types
interface LiveClass {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  course_title: string;
  week_id?: string;
  week_number: number;
  chapter_title?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link?: string;
  recording_url?: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  attendees_count?: number;
  total_enrolled?: number;
}

interface WeekGroup {
  week_number: number;
  week_title: string;
  classes: LiveClass[];
}

interface Course {
  id: string;
  title: string;
  weeks: { id: string; number: number; title: string }[];
}

// Mock data
const mockCourses: Course[] = [
  {
    id: 'c1',
    title: 'Arabic Language Fundamentals',
    weeks: [
      { id: 'w1', number: 1, title: 'Introduction' },
      { id: 'w2', number: 2, title: 'Grammar Basics' },
      { id: 'w3', number: 3, title: 'Vocabulary Building' },
    ]
  },
  {
    id: 'c2',
    title: 'Islamic Studies',
    weeks: [
      { id: 'w1', number: 1, title: 'Fundamentals of Faith' },
      { id: 'w2', number: 2, title: 'Pillars of Islam' },
    ]
  }
];

const mockClasses: LiveClass[] = [
  {
    id: '1',
    title: 'Introduction to Arabic Grammar',
    description: 'Learn the basics of Arabic sentence structure',
    course_id: 'c1',
    course_title: 'Arabic Language Fundamentals',
    week_number: 1,
    chapter_title: 'The Arabic Alphabet',
    scheduled_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'completed',
    recording_url: 'https://example.com/recording/1',
    attendees_count: 45,
    total_enrolled: 52
  },
  {
    id: '2',
    title: 'Verb Conjugation Basics',
    description: 'Understanding past tense verbs',
    course_id: 'c1',
    course_title: 'Arabic Language Fundamentals',
    week_number: 1,
    chapter_title: 'Basic Verbs',
    scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    duration_minutes: 45,
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    status: 'live',
    attendees_count: 32,
    total_enrolled: 52
  },
  {
    id: '3',
    title: 'Noun Cases (إعراب)',
    description: 'Introduction to grammatical cases',
    course_id: 'c1',
    course_title: 'Arabic Language Fundamentals',
    week_number: 2,
    chapter_title: 'Nouns and Cases',
    scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: 'upcoming',
    total_enrolled: 52
  },
  {
    id: '4',
    title: 'Practice Session: Reading',
    description: 'Practice reading Arabic texts',
    course_id: 'c1',
    course_title: 'Arabic Language Fundamentals',
    week_number: 2,
    chapter_title: 'Reading Practice',
    scheduled_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 90,
    status: 'upcoming',
    total_enrolled: 52
  }
];

// Group by week
function groupByWeek(classes: LiveClass[]): WeekGroup[] {
  const grouped = classes.reduce((acc, cls) => {
    const weekNum = cls.week_number;
    if (!acc[weekNum]) {
      acc[weekNum] = {
        week_number: weekNum,
        week_title: `Week ${weekNum}`,
        classes: []
      };
    }
    acc[weekNum].classes.push(cls);
    return acc;
  }, {} as Record<number, WeekGroup>);

  return Object.values(grouped).sort((a, b) => a.week_number - b.week_number);
}

// Status Badge
function StatusBadge({ status }: { status: LiveClass['status'] }) {
  const config = {
    live: { bg: 'bg-red-100', text: 'text-red-700', icon: Radio, label: 'LIVE', animate: true },
    upcoming: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock, label: 'Scheduled', animate: false },
    completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, label: 'Completed', animate: false },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Circle, label: 'Cancelled', animate: false }
  };

  const { bg, text, icon: Icon, label, animate } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon className={`h-3.5 w-3.5 ${animate ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}

// Format date/time
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    iso: date.toISOString().slice(0, 16)
  };
}

// Schedule Modal
function ScheduleClassModal({ 
  isOpen, 
  onClose, 
  courses,
  editingClass,
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  courses: Course[];
  editingClass?: LiveClass | null;
  onSave: (data: Partial<LiveClass>) => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    week_number: 1,
    chapter_title: '',
    scheduled_at: '',
    duration_minutes: 60,
    meeting_link: ''
  });

  useEffect(() => {
    if (editingClass) {
      setFormData({
        title: editingClass.title,
        description: editingClass.description || '',
        course_id: editingClass.course_id,
        week_number: editingClass.week_number,
        chapter_title: editingClass.chapter_title || '',
        scheduled_at: formatDateTime(editingClass.scheduled_at).iso,
        duration_minutes: editingClass.duration_minutes,
        meeting_link: editingClass.meeting_link || ''
      });
    } else {
      // Set default date/time to tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setFormData({
        title: '',
        description: '',
        course_id: courses[0]?.id || '',
        week_number: 1,
        chapter_title: '',
        scheduled_at: tomorrow.toISOString().slice(0, 16),
        duration_minutes: 60,
        meeting_link: ''
      });
    }
  }, [editingClass, courses, isOpen]);

  const selectedCourse = courses.find(c => c.id === formData.course_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      course_title: selectedCourse?.title || '',
      status: 'upcoming'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingClass ? 'Edit Live Class' : 'Schedule New Live Class'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            >
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          {/* Week Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
            <select
              value={formData.week_number}
              onChange={(e) => setFormData({ ...formData, week_number: parseInt(e.target.value) })}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            >
              {selectedCourse?.weeks.map(week => (
                <option key={week.id} value={week.number}>Week {week.number}: {week.title}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Arabic Grammar"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Chapter/Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter/Topic (Optional)</label>
            <input
              type="text"
              value={formData.chapter_title}
              onChange={(e) => setFormData({ ...formData, chapter_title: e.target.value })}
              placeholder="e.g., Lesson 1: The Alphabet"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what will be covered..."
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Meeting Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link (Optional)</label>
            <input
              type="url"
              value={formData.meeting_link}
              onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              placeholder="https://meet.google.com/..."
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">Google Meet, Zoom, or any video call link</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              {editingClass ? 'Update Class' : 'Schedule Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Teacher Class Card
function TeacherClassCard({ 
  liveClass, 
  onEdit, 
  onDelete,
  onStartClass,
  onEndClass,
  onViewAttendance
}: { 
  liveClass: LiveClass;
  onEdit: () => void;
  onDelete: () => void;
  onStartClass: () => void;
  onEndClass: () => void;
  onViewAttendance: () => void;
}) {
  const { date, time } = formatDateTime(liveClass.scheduled_at);
  const isLive = liveClass.status === 'live';
  const isUpcoming = liveClass.status === 'upcoming';
  const isCompleted = liveClass.status === 'completed';

  const attendanceRate = liveClass.attendees_count && liveClass.total_enrolled 
    ? Math.round((liveClass.attendees_count / liveClass.total_enrolled) * 100) 
    : null;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${
      isLive ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Class Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={liveClass.status} />
            {liveClass.chapter_title && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {liveClass.chapter_title}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-gray-800 text-lg mb-1">{liveClass.title}</h3>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{time} • {liveClass.duration_minutes} min</span>
            </div>
          </div>

          {/* Attendance Info */}
          {(isLive || isCompleted) && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users className="h-4 w-4" />
                <span>
                  {liveClass.attendees_count || 0}/{liveClass.total_enrolled || 0} attended
                </span>
              </div>
              {attendanceRate !== null && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  attendanceRate >= 80 ? 'bg-green-100 text-green-700' :
                  attendanceRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {attendanceRate}% attendance
                </span>
              )}
            </div>
          )}

          {/* Meeting Link */}
          {liveClass.meeting_link && (
            <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
              <LinkIcon className="h-4 w-4" />
              <a href={liveClass.meeting_link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">
                {liveClass.meeting_link}
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isUpcoming && (
            <>
              <button
                onClick={onStartClass}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
              >
                <Video className="h-4 w-4" />
                Start Class
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {isLive && (
            <>
              <button
                onClick={() => window.open(liveClass.meeting_link, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm animate-pulse"
              >
                <Video className="h-4 w-4" />
                Join Class
              </button>
              <button
                onClick={onEndClass}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                End Class
              </button>
              <button
                onClick={onViewAttendance}
                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                <ClipboardList className="h-4 w-4" />
                Attendance
              </button>
            </>
          )}

          {isCompleted && (
            <>
              <button
                onClick={onViewAttendance}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 font-medium text-sm"
              >
                <Eye className="h-4 w-4" />
                View Report
              </button>
              {liveClass.recording_url && (
                <a
                  href={liveClass.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <PlayCircle className="h-4 w-4" />
                  Recording
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Teacher Week Section
function TeacherWeekSection({ 
  weekGroup, 
  onEdit,
  onDelete,
  onStartClass,
  onEndClass,
  onViewAttendance
}: {
  weekGroup: WeekGroup;
  onEdit: (cls: LiveClass) => void;
  onDelete: (id: string) => void;
  onStartClass: (id: string) => void;
  onEndClass: (id: string) => void;
  onViewAttendance: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const liveCount = weekGroup.classes.filter(c => c.status === 'live').length;
  const upcomingCount = weekGroup.classes.filter(c => c.status === 'upcoming').length;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:border-emerald-300 transition-colors mb-3"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="h-5 w-5 text-emerald-600" /> : <ChevronRight className="h-5 w-5 text-emerald-600" />}
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-gray-800 text-lg">Week {weekGroup.week_number}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse" /> {liveCount} Live
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              {upcomingCount} Scheduled
            </span>
          )}
          <span className="text-gray-500 text-sm">{weekGroup.classes.length} classes</span>
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3 pl-4 border-l-2 border-emerald-200 ml-6">
          {weekGroup.classes.map((liveClass) => (
            <TeacherClassCard
              key={liveClass.id}
              liveClass={liveClass}
              onEdit={() => onEdit(liveClass)}
              onDelete={() => onDelete(liveClass.id)}
              onStartClass={() => onStartClass(liveClass.id)}
              onEndClass={() => onEndClass(liveClass.id)}
              onViewAttendance={() => onViewAttendance(liveClass.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Teacher Page
export default function TeacherLiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [courses] = useState<Course[]>(mockCourses);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  useEffect(() => {
    setTimeout(() => {
      setClasses(mockClasses);
      setLoading(false);
    }, 500);
  }, []);

  const handleSaveClass = (data: Partial<LiveClass>) => {
    if (editingClass) {
      setClasses(classes.map(c => c.id === editingClass.id ? { ...c, ...data } : c));
    } else {
      const newClass: LiveClass = {
        id: Date.now().toString(),
        title: data.title || '',
        description: data.description,
        course_id: data.course_id || '',
        course_title: data.course_title || '',
        week_number: data.week_number || 1,
        chapter_title: data.chapter_title,
        scheduled_at: data.scheduled_at || new Date().toISOString(),
        duration_minutes: data.duration_minutes || 60,
        meeting_link: data.meeting_link,
        status: 'upcoming',
        total_enrolled: 52
      };
      setClasses([...classes, newClass]);
    }
    setShowScheduleModal(false);
    setEditingClass(null);
  };

  const handleDeleteClass = (id: string) => {
    if (confirm('Are you sure you want to delete this class?')) {
      setClasses(classes.filter(c => c.id !== id));
    }
  };

  const handleStartClass = (id: string) => {
    setClasses(classes.map(c => c.id === id ? { ...c, status: 'live' } : c));
  };

  const handleEndClass = (id: string) => {
    setClasses(classes.map(c => c.id === id ? { ...c, status: 'completed' } : c));
  };

  const handleViewAttendance = (id: string) => {
    alert(`Viewing attendance for class ${id}`);
  };

  const filteredClasses = selectedCourse === 'all' 
    ? classes 
    : classes.filter(c => c.course_id === selectedCourse);

  const weekGroups = groupByWeek(filteredClasses);

  // Stats
  const liveNow = classes.filter(c => c.status === 'live').length;
  const upcoming = classes.filter(c => c.status === 'upcoming').length;
  const totalStudents = classes.reduce((acc, c) => acc + (c.total_enrolled || 0), 0) / classes.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Video className="h-8 w-8 text-emerald-600" />
              Live Class Management
            </h1>
            <p className="text-gray-500">Schedule and manage your live classes</p>
          </div>
          
          <button
            onClick={() => {
              setEditingClass(null);
              setShowScheduleModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-200"
          >
            <Plus className="h-5 w-5" />
            Schedule New Class
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Radio className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{liveNow}</p>
                <p className="text-sm text-gray-500">Live Now</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{upcoming}</p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{Math.round(totalStudents)}</p>
                <p className="text-sm text-gray-500">Avg. Students</p>
              </div>
            </div>
          </div>
        </div>

        {/* Course Filter */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-600">Filter by Course:</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        </div>

        {/* Week-wise Schedule */}
        {weekGroups.length > 0 ? (
          <div>
            {weekGroups.map((weekGroup) => (
              <TeacherWeekSection
                key={weekGroup.week_number}
                weekGroup={weekGroup}
                onEdit={(cls) => {
                  setEditingClass(cls);
                  setShowScheduleModal(true);
                }}
                onDelete={handleDeleteClass}
                onStartClass={handleStartClass}
                onEndClass={handleEndClass}
                onViewAttendance={handleViewAttendance}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Classes Scheduled</h3>
            <p className="text-gray-500 mb-4">Start by scheduling your first live class</p>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5" />
              Schedule Class
            </button>
          </div>
        )}

        {/* Schedule Modal */}
        <ScheduleClassModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingClass(null);
          }}
          courses={courses}
          editingClass={editingClass}
          onSave={handleSaveClass}
        />
      </div>
    </div>
  );
}
