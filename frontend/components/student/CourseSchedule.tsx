'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Video, PlayCircle, CheckCircle, 
  ExternalLink, Radio, Lock, ChevronDown, ChevronUp,
  FileText, Award, BookOpen, Download, Link as LinkIcon, X, Circle
} from 'lucide-react';
import { 
  CourseWeek, WeekClass, WeekVideo, WeekTopic, 
  WeekQuiz, WeekActivity, TopicResource, WeekChapter
} from '@/types/lms';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

interface CourseScheduleProps {
  courseId: string;
}

export default function CourseSchedule({ courseId }: CourseScheduleProps) {
  const [weeks, setWeeks] = useState<CourseWeek[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeks();
  }, [courseId]);

  const fetchWeeks = async () => {
    // TODO: Fetch from API
    setLoading(false);
    // Mock data for demonstration
    setWeeks([
      {
        id: '1',
        courseId: courseId,
        weekNumber: 1,
        title: 'Introduction to Islamic Studies',
        description: 'Foundation concepts and overview',
        status: 'completed',
        isUnlocked: true,
        chapters: [],
        topics: [],
        classes: [],
        videos: [],
        activities: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ]);
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekId)) {
        newSet.delete(weekId);
      } else {
        newSet.add(weekId);
      }
      return newSet;
    });
  };

  const getWeekStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'current':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'upcoming':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Schedule Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Schedule</h2>
            <p className="text-gray-600">
              {weeks.length} weeks • Track your progress through each week's content
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {weeks.filter(w => w.status === 'completed').length}
              </p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {weeks.filter(w => w.status === 'current').length}
              </p>
              <p className="text-xs text-gray-500">Current</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">
                {weeks.filter(w => w.status === 'upcoming').length}
              </p>
              <p className="text-xs text-gray-500">Upcoming</p>
            </div>
          </div>
        </div>
      </div>

      {/* Week Cards */}
      {weeks.map((week) => (
        <WeekCard 
          key={week.id} 
          week={week}
          isExpanded={expandedWeeks.has(week.id)}
          onToggle={() => toggleWeek(week.id)}
        />
      ))}

      {weeks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">No schedule available yet</p>
        </div>
      )}
    </div>
  );
}

// Week Card Component
function WeekCard({ 
  week, 
  isExpanded, 
  onToggle 
}: { 
  week: CourseWeek; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const statusColors = {
    completed: 'from-green-500 to-emerald-600',
    current: 'from-blue-500 to-indigo-600',
    upcoming: 'from-gray-400 to-gray-500'
  };

  const statusIcons = {
    completed: <CheckCircle className="h-5 w-5" />,
    current: <Radio className="h-5 w-5 animate-pulse" />,
    upcoming: <Lock className="h-5 w-5" />
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all ${
      week.status === 'current' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      {/* Week Header */}
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        {/* Week Number Badge */}
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${statusColors[week.status]} flex items-center justify-center flex-shrink-0 text-white shadow-lg`}>
          <div className="text-center">
            <p className="text-xs font-medium opacity-90">Week</p>
            <p className="text-2xl font-bold">{week.weekNumber}</p>
          </div>
        </div>

        {/* Week Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-800">{week.title}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              week.status === 'completed' ? 'bg-green-100 text-green-700' :
              week.status === 'current' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {statusIcons[week.status]}
              {week.status === 'completed' ? 'Completed' : 
               week.status === 'current' ? 'In Progress' : 'Locked'}
            </span>
          </div>
          <p className="text-gray-600 text-sm">{week.description}</p>
          
          {/* Week Dates */}
          {week.startDate && week.endDate && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(week.startDate), 'MMM d')} - {format(new Date(week.endDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mr-4">
          {week.topics.length > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{week.topics.length}</p>
              <p className="text-xs text-gray-500">Topics</p>
            </div>
          )}
          {week.classes.length > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{week.classes.length}</p>
              <p className="text-xs text-gray-500">Classes</p>
            </div>
          )}
          {week.videos.length > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold text-gray-800">{week.videos.length}</p>
              <p className="text-xs text-gray-500">Videos</p>
            </div>
          )}
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && week.isUnlocked && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-6 space-y-6">
            {/* Chapters */}
            {week.chapters && week.chapters.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  Chapters
                </h4>
                {week.chapters.map((chapter) => (
                  <ChapterSection key={chapter.id} chapter={chapter} />
                ))}
              </div>
            )}

            {/* Topics and Classes */}
            {week.topics.map((topic) => (
              <TopicSection key={topic.id} topic={topic} />
            ))}

            {/* Standalone Classes (not linked to topics) */}
            {week.classes.filter(c => !c.topicId).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Video className="h-4 w-4 text-emerald-600" />
                  Live Classes
                </h4>
                {week.classes.filter(c => !c.topicId).map((classItem) => (
                  <ClassCard key={classItem.id} classItem={classItem} />
                ))}
              </div>
            )}

            {/* Standalone Videos */}
            {week.videos.filter(v => !v.topicId).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-emerald-600" />
                  Recorded Videos
                </h4>
                <div className="grid gap-3">
                  {week.videos.filter(v => !v.topicId).map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}

            {/* Quiz */}
            {week.quiz && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <QuizCard quiz={week.quiz} />
              </div>
            )}

            {/* Activities */}
            {week.activities.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Activities & Assignments
                </h4>
                {week.activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Locked State */}
      {isExpanded && !week.isUnlocked && (
        <div className="border-t border-gray-200 bg-gray-50 p-8 text-center">
          <Lock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">This week will unlock when you complete the previous week</p>
        </div>
      )}
    </div>
  );
}

// Topic Section Component
function TopicSection({ topic }: { topic: WeekTopic }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <div className="text-left">
            <h4 className="font-semibold text-gray-800">{topic.title}</h4>
            {topic.description && (
              <p className="text-sm text-gray-500">{topic.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {topic.duration_minutes && (
            <span className="text-sm text-gray-500">{topic.duration_minutes} min</span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {/* Topic Videos */}
          {topic.videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}

          {/* Topic Resources */}
          {topic.resources.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Resources</h5>
              {topic.resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Chapter Section Component
function ChapterSection({ chapter }: { chapter: WeekChapter }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completionPercent = chapter.isCompleted ? 100 : 0;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-emerald-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold">
            {chapter.chapterNumber}
          </div>
          <div className="text-left">
            <h4 className="font-bold text-gray-800">Chapter {chapter.chapterNumber}: {chapter.title}</h4>
            {chapter.description && (
              <p className="text-sm text-gray-600">{chapter.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {chapter.isCompleted && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Completed
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-emerald-200 p-4 bg-white space-y-4">
          {/* Chapter Topics */}
          {chapter.topics.map((topic) => (
            <TopicSection key={topic.id} topic={topic} />
          ))}

          {/* Chapter Videos */}
          {chapter.videos.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-emerald-600" />
                Chapter Videos
              </h5>
              {chapter.videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}

          {/* Chapter Resources */}
          {chapter.resources.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-gray-700">Chapter Resources</h5>
              {chapter.resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Class Card Component
function ClassCard({ classItem }: { classItem: WeekClass }) {
  const scheduledDate = new Date(classItem.scheduledAt);
  const now = new Date();
  const isCancelled = classItem.status === 'cancelled';
  const isCompleted = classItem.status === 'completed';
  const isLive = classItem.isLive;
  const canJoin = classItem.canJoin;

  return (
    <div className={`border rounded-lg p-4 hover:border-emerald-300 transition-colors ${
      isCancelled ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className={`font-bold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {classItem.title}
            </h4>
            {isCancelled && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
                <X className="h-3 w-3" />
                CANCELLED
              </span>
            )}
            {isLive && !isCancelled && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1 animate-pulse">
                <Circle className="h-2 w-2 fill-red-600" />
                LIVE
              </span>
            )}
            {isCompleted && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Completed
              </span>
            )}
          </div>
          
          {classItem.description && (
            <p className={`text-sm mb-3 ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
              {classItem.description}
            </p>
          )}

          {isCancelled && classItem.cancellationReason && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-700 mb-1">Cancellation Reason:</p>
              <p className="text-sm text-red-600">{classItem.cancellationReason}</p>
              {classItem.rescheduledTo && (
                <p className="text-sm text-gray-600 mt-2">
                  🔄 Rescheduled to: {format(new Date(classItem.rescheduledTo), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
          )}

          <div className={`flex flex-wrap gap-4 text-sm ${isCancelled ? 'text-gray-400' : 'text-gray-600'}`}>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(scheduledDate, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{format(scheduledDate, 'h:mm a')} • {classItem.duration_minutes} min</span>
            </div>
          </div>
        </div>

        {!isCancelled && (
          <div className="flex flex-col gap-2">
            {isLive && classItem.meetingUrl && (
              <a
                href={classItem.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 animate-pulse"
              >
                <ExternalLink className="h-4 w-4" />
                Join Now
              </a>
            )}

            {!isLive && canJoin && classItem.meetingUrl && (
              <a
                href={classItem.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Join
              </a>
            )}

            {isCompleted && classItem.recordingUrl && (
              <a
                href={classItem.recordingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Recording
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Video Card Component
function VideoCard({ video }: { video: WeekVideo }) {
  const durationMinutes = Math.floor(video.duration_seconds / 60);
  const durationSeconds = video.duration_seconds % 60;

  return (
    <a
      href={video.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow flex items-center gap-4 group"
    >
      {/* Thumbnail */}
      <div className="relative w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {video.thumbnailUrl ? (
          <img 
            src={video.thumbnailUrl} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlayCircle className="h-8 w-8 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlayCircle className="h-10 w-10 text-white" />
        </div>
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
          {durationMinutes}:{durationSeconds.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h5 className="font-medium text-gray-800 group-hover:text-emerald-600 transition-colors line-clamp-1">
          {video.title}
        </h5>
        {video.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{video.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{video.views} views</span>
          <span>•</span>
          <span>{format(new Date(video.uploadedAt), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </a>
  );
}

// Resource Card Component
function ResourceCard({ resource }: { resource: TopicResource }) {
  const iconMap = {
    pdf: FileText,
    document: FileText,
    slides: FileText,
    link: LinkIcon,
    other: Download
  };

  const Icon = iconMap[resource.type] || Download;
  const url = resource.fileUrl || resource.externalUrl;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
    >
      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 text-sm truncate">{resource.title}</p>
        {resource.fileSize && (
          <p className="text-xs text-gray-500">
            {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>
      <Download className="h-4 w-4 text-gray-400" />
    </a>
  );
}

// Quiz Card Component
function QuizCard({ quiz }: { quiz: WeekQuiz }) {
  const isAvailable = !quiz.availableFrom || isAfter(new Date(), new Date(quiz.availableFrom));
  const isExpired = quiz.availableTo && isAfter(new Date(), new Date(quiz.availableTo));

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-5 w-5 text-purple-600" />
          <h5 className="font-semibold text-gray-800">{quiz.title}</h5>
        </div>
        <p className="text-sm text-gray-600 mb-3">{quiz.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>📝 {quiz.questions.length} questions</span>
          <span>⭐ {quiz.totalMarks} marks</span>
          {quiz.timeLimit_minutes && <span>⏱️ {quiz.timeLimit_minutes} minutes</span>}
          <span>🔄 {quiz.attemptsAllowed} {quiz.attemptsAllowed === 1 ? 'attempt' : 'attempts'}</span>
        </div>
      </div>

      {isAvailable && !isExpired && quiz.isPublished && (
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors">
          Start Quiz
        </button>
      )}
      {!isAvailable && (
        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
          Available {format(new Date(quiz.availableFrom!), 'MMM d')}
        </span>
      )}
      {isExpired && (
        <span className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm">
          Expired
        </span>
      )}
    </div>
  );
}

// Activity Card Component
function ActivityCard({ activity }: { activity: WeekActivity }) {
  const dueDate = new Date(activity.dueDate);
  const isOverdue = isAfter(new Date(), dueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const typeColors = {
    quiz: 'bg-purple-100 text-purple-700',
    activity: 'bg-blue-100 text-blue-700',
    assignment: 'bg-emerald-100 text-emerald-700',
    midterm: 'bg-amber-100 text-amber-700',
    final_exam: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[activity.type]}`}>
              {activity.type.replace('_', ' ').toUpperCase()}
            </span>
            <h5 className="font-semibold text-gray-800">{activity.title}</h5>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">{activity.description}</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Clock className="h-4 w-4" />
              Due: {format(dueDate, 'MMM d, h:mm a')}
              {!isOverdue && daysUntilDue <= 3 && (
                <span className="text-amber-600 font-medium ml-1">
                  ({daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'} left)
                </span>
              )}
            </span>
            <span className="text-gray-600">⭐ {activity.totalMarks} marks</span>
          </div>
        </div>

        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap">
          View Details
        </button>
      </div>
    </div>
  );
}
