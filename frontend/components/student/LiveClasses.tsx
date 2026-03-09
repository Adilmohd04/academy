'use client';

import React from 'react';
import { 
  Video, Calendar, Clock, Play, CheckCircle, Users, 
  ExternalLink, PlayCircle, Radio, MonitorPlay 
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';

interface LiveClass {
  id: string;
  title: string;
  course_title: string;
  course_thumbnail?: string;
  week_number: number;
  week_title?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string;
  recording_url?: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  teacher_name?: string;
  teacher_image?: string;
  attended?: boolean;
  minutes_elapsed?: number;
  hours_until?: number;
}

interface LiveClassCardProps {
  liveClass: LiveClass;
  onJoin?: (id: string) => void;
  onViewRecording?: (id: string) => void;
}

interface LiveClassesViewProps {
  upcoming: LiveClass[];
  live: LiveClass[];
  completed: LiveClass[];
  onJoin?: (id: string) => void;
  onViewRecording?: (id: string) => void;
}

const getStatusBadge = (status: string, attended?: boolean) => {
  switch (status) {
    case 'live':
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full animate-pulse">
          <Radio className="h-3 w-3" />
          LIVE
        </span>
      );
    case 'scheduled':
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          Upcoming
        </span>
      );
    case 'completed':
      return attended ? (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle className="h-3 w-3" />
          Attended
        </span>
      ) : (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          Missed
        </span>
      );
    case 'cancelled':
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          Cancelled
        </span>
      );
    default:
      return null;
  }
};

const formatScheduledDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'EEE, MMM d • h:mm a');
};

export function LiveClassCard({ liveClass, onJoin, onViewRecording }: LiveClassCardProps) {
  const isLive = liveClass.status === 'live';
  const isCompleted = liveClass.status === 'completed';
  const isScheduled = liveClass.status === 'scheduled';

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md ${
      isLive ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'
    }`}>
      {/* Course Thumbnail/Header */}
      <div className="relative h-24 bg-gradient-to-br from-emerald-500 to-teal-600">
        {liveClass.course_thumbnail && (
          <img 
            src={liveClass.course_thumbnail} 
            alt={liveClass.course_title}
            className="w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {getStatusBadge(liveClass.status, liveClass.attended)}
        </div>
        
        {/* Week Number */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 text-gray-700 text-xs font-medium rounded">
          Week {liveClass.week_number}
        </div>
        
        {/* Course Title */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white/80 text-xs">{liveClass.course_title}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{liveClass.title}</h3>
        
        {/* Meta Info */}
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>
              {isLive ? (
                <span className="text-red-600 font-medium">Started {formatDistanceToNow(new Date(liveClass.scheduled_at))} ago</span>
              ) : isCompleted ? (
                format(new Date(liveClass.scheduled_at), 'MMM d, yyyy • h:mm a')
              ) : (
                formatScheduledDate(liveClass.scheduled_at)
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span>{liveClass.duration_minutes} minutes</span>
          </div>
          {liveClass.teacher_name && (
            <div className="flex items-center gap-2">
              {liveClass.teacher_image ? (
                <img 
                  src={liveClass.teacher_image} 
                  alt={liveClass.teacher_name}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <Users className="h-4 w-4 text-gray-400" />
              )}
              <span>{liveClass.teacher_name}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {isLive && onJoin && (
          <button
            onClick={() => onJoin(liveClass.id)}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 animate-pulse"
          >
            <Play className="h-4 w-4" />
            Join Live Class
          </button>
        )}
        
        {isScheduled && liveClass.hours_until !== undefined && liveClass.hours_until <= 0.5 && onJoin && (
          <button
            onClick={() => onJoin(liveClass.id)}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Join Waiting Room
          </button>
        )}
        
        {isCompleted && liveClass.recording_url && onViewRecording && (
          <button
            onClick={() => onViewRecording(liveClass.id)}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Watch Recording
          </button>
        )}
      </div>
    </div>
  );
}

export function LiveClassesCategorized({ 
  upcoming, 
  live, 
  completed,
  onJoin,
  onViewRecording 
}: LiveClassesViewProps) {
  return (
    <div className="space-y-8">
      {/* Live Now Section */}
      {live.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative">
              <Radio className="h-5 w-5 text-red-600" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Live Now</h2>
            <span className="text-sm text-gray-500">({live.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map((liveClass) => (
              <LiveClassCard 
                key={liveClass.id} 
                liveClass={liveClass}
                onJoin={onJoin}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Upcoming Classes</h2>
          <span className="text-sm text-gray-500">({upcoming.length})</span>
        </div>
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((liveClass) => (
              <LiveClassCard 
                key={liveClass.id} 
                liveClass={liveClass}
                onJoin={onJoin}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600">No upcoming classes scheduled</p>
          </div>
        )}
      </div>

      {/* Completed Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">Completed Classes</h2>
          <span className="text-sm text-gray-500">({completed.length})</span>
        </div>
        {completed.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map((liveClass) => (
              <LiveClassCard 
                key={liveClass.id} 
                liveClass={liveClass}
                onViewRecording={onViewRecording}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600">No completed classes yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Next Up Widget (for dashboard)
export function NextClassWidget({ 
  nextClass,
  onJoinAction 
}: { 
  nextClass: LiveClass | null;
  onJoinAction?: (id: string) => void;
}) {
  if (!nextClass) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MonitorPlay className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">Next Class</h3>
        </div>
        <div className="text-center py-4">
          <Video className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-gray-500">No upcoming classes</p>
        </div>
      </div>
    );
  }

  const isStartingSoon = nextClass.hours_until !== undefined && nextClass.hours_until <= 1;
  const isLive = nextClass.status === 'live';

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${
      isLive ? 'border-red-300 ring-2 ring-red-100' : 
      isStartingSoon ? 'border-amber-300' : 'border-gray-200'
    }`}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MonitorPlay className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">Next Class</h3>
        </div>
        {getStatusBadge(nextClass.status)}
      </div>

      <div className="p-4">
        <h4 className="font-medium text-gray-800 mb-2">{nextClass.title}</h4>
        <p className="text-sm text-gray-500 mb-3">{nextClass.course_title}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatScheduledDate(nextClass.scheduled_at)}</span>
          </div>
        </div>

        {(isLive || isStartingSoon) && onJoinAction && (
          <button
            onClick={() => onJoinAction(nextClass.id)}
            className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isLive 
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Play className="h-4 w-4" />
            {isLive ? 'Join Live Class' : 'Join Now'}
          </button>
        )}
      </div>
    </div>
  );
}

// Recordings List
export function RecordingsList({
  recordings,
  onWatchAction
}: {
  recordings: LiveClass[];
  onWatchAction?: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PlayCircle className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-800">Class Recordings</h2>
      </div>

      {recordings.length > 0 ? (
        <div className="space-y-3">
          {recordings.map((recording) => (
            <div 
              key={recording.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onWatchAction?.(recording.id)}
            >
              <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <PlayCircle className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-800 truncate">{recording.title}</h4>
                <p className="text-sm text-gray-500">{recording.course_title} • Week {recording.week_number}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{format(new Date(recording.scheduled_at), 'MMM d')}</p>
                <p>{recording.duration_minutes} min</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <PlayCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">No recordings available</p>
        </div>
      )}
    </div>
  );
}
