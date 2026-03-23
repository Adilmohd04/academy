'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BookOpen, Calendar, Trophy, ArrowRight,
  CalendarPlus, Play, CheckCircle2, GraduationCap,
  Search, Sparkles,
} from 'lucide-react';
import { useUser, useAuth } from '@clerk/nextjs';

interface DashboardStats {
  enrolledCourses: number;
  totalMeetings: number;
  upcomingMeetings: number;
  completedCourses: number;
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  progress: number;
  thumbnail?: string;
  teacher?: string;
}

const quickActions = [
  {
    title: 'Browse Courses',
    description: 'Explore new subjects',
    href: '/student/courses/browse',
    icon: Search,
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    border: 'hover:border-violet-200',
  },
  {
    title: 'My Schedule',
    description: 'View upcoming classes',
    href: '/student/meetings',
    icon: Calendar,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    border: 'hover:border-blue-200',
  },
  {
    title: 'Certificates',
    description: 'Your achievements',
    href: '/student/certificates',
    icon: Trophy,
    bg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    border: 'hover:border-amber-200',
  },
  {
    title: 'Library',
    description: 'Resources & notes',
    href: '/student/library',
    icon: BookOpen,
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    border: 'hover:border-emerald-200',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

export default function StudentDashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    totalMeetings: 0,
    upcomingMeetings: 0,
    completedCourses: 0,
  });
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/student/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-clerk-user-id': user?.id || '',
          },
        }
      );
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      setStats(data.overall_stats || stats);
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName =
    user?.firstName || user?.fullName?.split(' ')[0] || 'Student';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center animate-pulse shadow-lg shadow-purple-200">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-slate-400">Loading your garden…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Welcome Hero ── */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#4f46e5] p-8 md:p-10 shadow-xl shadow-purple-200/60"
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full blur-sm pointer-events-none" />
        <div className="absolute -bottom-14 -left-14 w-64 h-64 bg-white/5 rounded-full blur-sm pointer-events-none" />
        <div className="absolute top-8 right-28 w-20 h-20 bg-white/5 rounded-full pointer-events-none" />
        {/* Islamic pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-purple-200 text-sm font-medium tracking-wide mb-1">
              Good {timeOfDay} ✨
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Welcome back, {firstName}!
            </h1>
            <p className="text-purple-100/75 mt-2 text-sm max-w-md">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم — May your learning be
              blessed today.
            </p>

            {/* Inline stats — subtle pills */}
            <div className="flex flex-wrap items-center gap-4 mt-5">
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-200" />
                <span className="text-xs font-semibold text-white">
                  {stats.enrolledCourses} Courses
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-xs font-semibold text-white">
                  {stats.completedCourses} Completed
                </span>
              </div>
              {stats.upcomingMeetings > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-xs font-semibold text-white">
                    {stats.upcomingMeetings} Upcoming
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 md:flex-col md:items-stretch">
            <Link
              href="/student/meetings/select-teacher"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-purple-700 font-bold text-sm rounded-2xl hover:bg-purple-50 transition-all shadow-lg shadow-purple-500/20 whitespace-nowrap"
            >
              <CalendarPlus className="w-4 h-4" />
              Book Session
            </Link>
            <Link
              href="/student/courses/browse"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white/15 text-white font-semibold text-sm rounded-2xl hover:bg-white/25 transition-all border border-white/20 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Browse Courses
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Access ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.href}
              {...fadeUp}
              transition={{ duration: 0.4, delay: i * 0.07 }}
            >
              <Link href={action.href} className="block group">
                <div
                  className={`rounded-2xl bg-white border border-slate-100 ${action.border} p-5 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${action.bg} flex items-center justify-center mb-4`}
                  >
                    <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                  </div>
                  <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 leading-tight">
                    {action.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {action.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Continue Learning ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
            Continue Learning
          </h2>
          <Link
            href="/student/courses"
            className="flex items-center gap-1 text-sm text-purple-600 font-semibold hover:text-purple-800 transition-colors"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((course, i) => (
              <motion.div
                key={course.courseId}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.09 }}
              >
                <Link
                  href={`/student/courses/${course.courseId}/overview`}
                  className="block group"
                >
                  <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300">
                    {/* Thumbnail */}
                    <div className="relative h-36 bg-gradient-to-br from-purple-100 via-violet-50 to-indigo-100 overflow-hidden">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.courseTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <GraduationCap
                            className="w-12 h-12 text-purple-200"
                            strokeWidth={1}
                          />
                        </div>
                      )}
                      {/* Progress badge */}
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-purple-700 shadow-sm">
                        {course.progress}%
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
                        {course.courseTitle}
                      </h3>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>

                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 group-hover:text-purple-800 transition-colors">
                        <Play className="w-3 h-3 fill-current" />
                        Continue
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen
                className="w-8 h-8 text-purple-300"
                strokeWidth={1}
              />
            </div>
            <h3 className="font-bold text-slate-700 mb-1.5">
              No courses yet
            </h3>
            <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
              Start your learning journey — browse our courses and enroll
              today.
            </p>
            <Link
              href="/student/courses/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-bold rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all shadow-md shadow-purple-200"
            >
              <Search className="w-4 h-4" />
              Browse Courses
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
