'use client';

import Link from 'next/link';
import { Bell, CalendarPlus, Search } from 'lucide-react';

export function StudentHeader() {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="px-6 py-3.5 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 font-serif tracking-wide leading-none">Little Muslimah</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/student/courses/browse"
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Browse Courses"
          >
            <Search className="w-5 h-5" />
          </Link>

          <Link
            href="/student/announcements"
            className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Announcements"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </Link>

          <Link
            href="/student/meetings/select-teacher"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm shadow-emerald-200 whitespace-nowrap"
          >
            <CalendarPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Book Session</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
