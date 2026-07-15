'use client';

import Link from 'next/link';
import { Bell, CalendarPlus, Search, Sparkles } from 'lucide-react';
import { useCollapsedState } from '@/contexts/CollapsedStateContext';

export function StudentHeader() {
  const { collapsed } = useCollapsedState();
  return (
    <header className="bg-gradient-to-r from-white to-emerald-50/40 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        {/* Branding Text - Shows only when sidebar is collapsed */}
        {collapsed && (
          <div className="flex flex-col justify-center min-w-0">
            <div className="font-bold text-base sm:text-lg leading-tight tracking-[0.02em] text-slate-900">
              Little Muslimah
            </div>
            <div className="text-[9px] sm:text-[10px] tracking-[0.12em] uppercase font-semibold opacity-70 text-slate-700">
              Academy
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/student/courses/browse"
            className="group relative inline-flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 hover:from-blue-100 hover:to-blue-200 text-blue-600 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-300"
            title="Browse Courses"
          >
            <Search className="w-5 h-5" />
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-semibold bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Browse Courses
            </span>
          </Link>

          <Link
            href="/student/announcements"
            className="group relative inline-flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 hover:from-amber-100 hover:to-amber-200 text-amber-600 hover:text-amber-700 transition-all duration-200 shadow-sm hover:shadow-md border border-amber-200 hover:border-amber-300"
            title="Announcements"
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
            </div>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-semibold bg-slate-900 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Announcements
            </span>
          </Link>

          <Link
            href="/student/meetings/select-teacher"
            className="group relative flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-600 hover:from-emerald-600 hover:via-teal-600 hover:to-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-md shadow-emerald-300/40 hover:shadow-lg hover:shadow-emerald-300/60 border border-emerald-400/50 hover:border-emerald-300 whitespace-nowrap hover:scale-105 active:scale-95"
          >
            <CalendarPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Book Session</span>
            <span className="sm:hidden">Book</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
