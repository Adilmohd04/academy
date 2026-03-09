'use client';

import { useState, useEffect } from 'react';
import { 
  Video, 
  Calendar, 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  Bell,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
  ExternalLink,
  Radio
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
  teacher_name: string;
  teacher_avatar?: string;
  meeting_link?: string;
  recording_url?: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  attendees_count?: number;
}

interface WeekGroup {
  week_number: number;
  week_title: string;
  classes: LiveClass[];
}

// Mock data for demonstration
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
    teacher_name: 'Ustadh Ahmad',
    status: 'completed',
    recording_url: 'https://example.com/recording/1',
    attendees_count: 45
  },
  {
    id: '2',
    title: 'Verb Conjugation Basics',
    description: 'Understanding past tense verbs',
    course_id: 'c1',
    course_title: 'Arabic Language Fundamentals',
    week_number: 1,
    chapter_title: 'Basic Verbs',
    scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins from now - LIVE
    duration_minutes: 45,
    teacher_name: 'Ustadh Ahmad',
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    status: 'live',
    attendees_count: 32
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
    teacher_name: 'Ustadh Ahmad',
    status: 'upcoming'
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
    teacher_name: 'Ustadh Ahmad',
    status: 'upcoming'
  },
  {
    id: '5',
    title: 'Sentence Structure Deep Dive',
    course_id: 'c1',
    course_title: 'Arabic Language Fundamentals',
    week_number: 3,
    chapter_title: 'Complex Sentences',
    scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    teacher_name: 'Ustadh Ahmad',
    status: 'upcoming'
  }
];

// Group classes by week
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

// Status Badge Component
function StatusBadge({ status }: { status: LiveClass['status'] }) {
  const config = {
    live: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: Radio,
      label: 'LIVE NOW',
      animate: true
    },
    upcoming: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: Clock,
      label: 'Upcoming',
      animate: false
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: CheckCircle2,
      label: 'Completed',
      animate: false
    },
    cancelled: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      icon: Circle,
      label: 'Cancelled',
      animate: false
    }
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
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let relative = '';
  if (diffMs < 0) {
    relative = 'Ended';
  } else if (diffMins < 60) {
    relative = `Starts in ${diffMins} min`;
  } else if (diffHours < 24) {
    relative = `Starts in ${diffHours} hours`;
  } else if (diffDays === 1) {
    relative = 'Tomorrow';
  } else if (diffDays < 7) {
    relative = `In ${diffDays} days`;
  } else {
    relative = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    relative
  };
}

// Single Class Card
function LiveClassCard({ liveClass, onJoin, onWatchRecording }: { 
  liveClass: LiveClass; 
  onJoin: (id: string, link?: string) => void;
  onWatchRecording: (url: string) => void;
}) {
  const { date, time, relative } = formatDateTime(liveClass.scheduled_at);
  const isLive = liveClass.status === 'live';
  const isUpcoming = liveClass.status === 'upcoming';
  const isCompleted = liveClass.status === 'completed';

  // Check if class starts within 15 minutes
  const startsWithin15Mins = () => {
    const diff = new Date(liveClass.scheduled_at).getTime() - Date.now();
    return diff > 0 && diff <= 15 * 60 * 1000;
  };

  return (
    <div className={`bg-white rounded-xl border-2 p-4 transition-all hover:shadow-md ${
      isLive ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Class Info */}
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
          
          {liveClass.description && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{liveClass.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{time} • {liveClass.duration_minutes} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-gray-400" />
              <span>{liveClass.teacher_name}</span>
            </div>
          </div>

          {isLive && liveClass.attendees_count && (
            <div className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
              <Users className="h-4 w-4" />
              {liveClass.attendees_count} students attending
            </div>
          )}
        </div>

        {/* Right: Action Button */}
        <div className="flex flex-col items-end gap-2">
          <span className={`text-sm font-medium ${isLive ? 'text-red-600' : 'text-gray-500'}`}>
            {relative}
          </span>

          {isLive && (
            <button
              onClick={() => onJoin(liveClass.id, liveClass.meeting_link)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium animate-pulse"
            >
              <Video className="h-5 w-5" />
              Join Now
            </button>
          )}

          {isUpcoming && startsWithin15Mins() && (
            <button
              onClick={() => onJoin(liveClass.id, liveClass.meeting_link)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              <Video className="h-5 w-5" />
              Join Class
            </button>
          )}

          {isUpcoming && !startsWithin15Mins() && (
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed font-medium"
              disabled
            >
              <Bell className="h-5 w-5" />
              Remind Me
            </button>
          )}

          {isCompleted && liveClass.recording_url && (
            <button
              onClick={() => onWatchRecording(liveClass.recording_url!)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
            >
              <PlayCircle className="h-5 w-5" />
              Watch Recording
            </button>
          )}

          {isCompleted && !liveClass.recording_url && (
            <span className="text-sm text-gray-400 italic">No recording</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Week Section with Collapsible List
function WeekSection({ weekGroup, onJoin, onWatchRecording }: {
  weekGroup: WeekGroup;
  onJoin: (id: string, link?: string) => void;
  onWatchRecording: (url: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const liveCount = weekGroup.classes.filter(c => c.status === 'live').length;
  const upcomingCount = weekGroup.classes.filter(c => c.status === 'upcoming').length;
  const completedCount = weekGroup.classes.filter(c => c.status === 'completed').length;

  return (
    <div className="mb-6">
      {/* Week Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:border-emerald-300 transition-colors mb-3"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-emerald-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-emerald-600" />
          )}
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-gray-800 text-lg">
            Week {weekGroup.week_number}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse" />
              {liveCount} Live
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              {upcomingCount} Upcoming
            </span>
          )}
          {completedCount > 0 && (
            <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              {completedCount} Completed
            </span>
          )}
          <span className="text-gray-500 text-sm">
            {weekGroup.classes.length} classes
          </span>
        </div>
      </button>

      {/* Classes List */}
      {isExpanded && (
        <div className="space-y-3 pl-4 border-l-2 border-emerald-200 ml-6">
          {weekGroup.classes.map((liveClass) => (
            <LiveClassCard
              key={liveClass.id}
              liveClass={liveClass}
              onJoin={onJoin}
              onWatchRecording={onWatchRecording}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main Page Component
export default function StudentLiveClassesPage() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setClasses(mockClasses);
      setLoading(false);
    }, 500);
  }, []);

  const handleJoin = (classId: string, meetingLink?: string) => {
    if (meetingLink) {
      window.open(meetingLink, '_blank');
    } else {
      alert(`Joining class ${classId}...`);
    }
  };

  const handleWatchRecording = (url: string) => {
    window.open(url, '_blank');
  };

  // Filter classes
  const filteredClasses = filter === 'all' 
    ? classes 
    : classes.filter(c => c.status === filter);

  const weekGroups = groupByWeek(filteredClasses);

  // Stats
  const liveNow = classes.filter(c => c.status === 'live').length;
  const upcoming = classes.filter(c => c.status === 'upcoming').length;
  const completed = classes.filter(c => c.status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Video className="h-8 w-8 text-emerald-600" />
            Live Class Schedule
          </h1>
          <p className="text-gray-500">View and join your scheduled live classes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div 
            onClick={() => setFilter(filter === 'live' ? 'all' : 'live')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              filter === 'live' 
                ? 'bg-red-100 border-red-300' 
                : 'bg-white border-gray-200 hover:border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Radio className="h-6 w-6 text-red-600 animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{liveNow}</p>
                <p className="text-sm text-gray-500">Live Now</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setFilter(filter === 'upcoming' ? 'all' : 'upcoming')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              filter === 'upcoming' 
                ? 'bg-blue-100 border-blue-300' 
                : 'bg-white border-gray-200 hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{upcoming}</p>
                <p className="text-sm text-gray-500">Upcoming</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              filter === 'completed' 
                ? 'bg-green-100 border-green-300' 
                : 'bg-white border-gray-200 hover:border-green-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{completed}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Reset */}
        {filter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Showing:</span>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              filter === 'live' ? 'bg-red-100 text-red-700' :
              filter === 'upcoming' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)} classes
            </span>
            <button 
              onClick={() => setFilter('all')}
              className="text-sm text-emerald-600 hover:underline"
            >
              Show all
            </button>
          </div>
        )}

        {/* Week-wise Schedule */}
        {weekGroups.length > 0 ? (
          <div>
            {weekGroups.map((weekGroup) => (
              <WeekSection
                key={weekGroup.week_number}
                weekGroup={weekGroup}
                onJoin={handleJoin}
                onWatchRecording={handleWatchRecording}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">No Classes Found</h3>
            <p className="text-gray-500">
              {filter !== 'all' 
                ? `No ${filter} classes at the moment.`
                : 'No live classes scheduled for your courses yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
