'use client';

import React from 'react';
import { Trophy, Medal, Crown, Star, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  profile_image_url?: string;
  total_score: number;
  quiz_points?: number;
  attendance_points?: number;
  participation_points?: number;
  trend?: 'up' | 'down' | 'same';
}

interface LeaderboardProps {
  title?: string;
  entries: LeaderboardEntry[];
  currentUserId?: string;
  showDetails?: boolean;
  variant?: 'compact' | 'full';
  maxDisplay?: number;
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-gray-500">#{rank}</span>;
  }
};

const getRankBgClass = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
    case 3:
      return 'bg-gradient-to-r from-amber-50 to-orange-100 border-amber-200';
    default:
      return 'bg-white border-gray-100';
  }
};

export function Leaderboard({
  title = "Leaderboard",
  entries,
  currentUserId,
  showDetails = false,
  variant = 'compact',
  maxDisplay = 5
}: LeaderboardProps) {
  const displayEntries = entries.slice(0, maxDisplay);
  const currentUserEntry = currentUserId 
    ? entries.find(e => e.student_id === currentUserId)
    : null;
  const currentUserInTop = displayEntries.some(e => e.student_id === currentUserId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-50">
        {displayEntries.map((entry) => (
          <div
            key={entry.student_id}
            className={`px-4 py-3 flex items-center gap-3 transition-colors hover:bg-gray-50 
              ${entry.student_id === currentUserId ? 'ring-2 ring-emerald-500 ring-inset' : ''}
              ${getRankBgClass(entry.rank)} border-l-4`}
          >
            {/* Rank */}
            <div className="w-8 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>

            {/* Avatar */}
            <div className="relative">
              {entry.profile_image_url ? (
                <img
                  src={entry.profile_image_url}
                  alt={entry.student_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                  {entry.student_name.charAt(0).toUpperCase()}
                </div>
              )}
              {entry.rank <= 3 && (
                <div className="absolute -top-1 -right-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </div>

            {/* Name & Details */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">
                {entry.student_name}
                {entry.student_id === currentUserId && (
                  <span className="ml-2 text-xs text-emerald-600 font-normal">(You)</span>
                )}
              </p>
              {showDetails && variant === 'full' && (
                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                  {entry.quiz_points !== undefined && (
                    <span>Quiz: {entry.quiz_points}</span>
                  )}
                  {entry.attendance_points !== undefined && (
                    <span>Attendance: {entry.attendance_points}</span>
                  )}
                </div>
              )}
            </div>

            {/* Score */}
            <div className="flex items-center gap-2">
              {entry.trend && entry.trend !== 'same' && (
                <TrendingUp 
                  className={`h-4 w-4 ${
                    entry.trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
                  }`} 
                />
              )}
              <span className="font-bold text-emerald-600">
                {entry.total_score.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400">pts</span>
            </div>
          </div>
        ))}
      </div>

      {/* Current User Position (if not in top) */}
      {currentUserEntry && !currentUserInTop && (
        <>
          <div className="px-4 py-2 text-center text-gray-400 text-sm">
            • • •
          </div>
          <div className={`px-4 py-3 flex items-center gap-3 bg-emerald-50 border-l-4 border-emerald-500`}>
            <div className="w-8 flex justify-center">
              <span className="text-sm font-medium text-gray-600">#{currentUserEntry.rank}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
              {currentUserEntry.student_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">
                {currentUserEntry.student_name}
                <span className="ml-2 text-xs text-emerald-600 font-normal">(You)</span>
              </p>
            </div>
            <span className="font-bold text-emerald-600">
              {currentUserEntry.total_score.toLocaleString()}
            </span>
          </div>
        </>
      )}

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          <Trophy className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p>No rankings yet</p>
          <p className="text-sm">Complete activities to earn points!</p>
        </div>
      )}
    </div>
  );
}

// Top 5 Widget (smaller version for dashboard)
export function LeaderboardTop5({
  entries,
  currentUserId,
  onViewAllAction
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onViewAllAction?: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-800">Top 5</h3>
        </div>
        {onViewAllAction && (
          <button
            onClick={onViewAllAction}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All
          </button>
        )}
      </div>

      <div className="p-4 space-y-2">
        {entries.slice(0, 5).map((entry, index) => (
          <div
            key={entry.student_id}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              entry.student_id === currentUserId ? 'bg-emerald-50' : ''
            }`}
          >
            <div className="w-6 flex justify-center">
              {getRankIcon(index + 1)}
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
              {entry.student_name.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-medium truncate">
              {entry.student_name}
            </span>
            <span className="text-sm font-bold text-emerald-600">
              {entry.total_score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
