/**
 * Little Muslima Academy - Professional Admin Dashboard
 * Clean, modern design with comprehensive functionality
 */

'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, UserCheck, GraduationCap, Video,
  TrendingUp, Activity, BarChart3, DollarSign,
  Bell, Clock, CheckCircle, AlertCircle, FileText,
  Calendar, Target, Award, MessageSquare, Search,
  Filter, Download, RefreshCw, ArrowUpRight, ArrowDownRight,
  BookOpen, Settings, Zap, Star
} from 'lucide-react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { BRAND_CONFIG, getGreeting } from '@/lib/brand-config';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  activeMeetings: number;
  pendingApprovals: number;
  monthlyRevenue: number;
  avgRating: number;
  activeClasses: number;
  completionRate: number;
  studentGrowth: number;
  teacherGrowth: number;
  meetingGrowth: number;
  revenueGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'enrollment' | 'meeting' | 'payment' | 'approval';
  message: string;
  user: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'warning';
}

export default function AdminDashboardNew() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    activeMeetings: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0,
    avgRating: 0,
    activeClasses: 0,
    completionRate: 0,
    studentGrowth: 0,
    teacherGrowth: 0,
    meetingGrowth: 0,
    revenueGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState(3);

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: Activity },
    { label: 'Teachers', href: '/admin/teachers', icon: Users },
    { label: 'Students', href: '/admin/students', icon: GraduationCap },
    { label: 'Meetings', href: '/admin/meetings', icon: Video, badge: stats.pendingApprovals },
    { label: 'Time Slots', href: '/admin/boxes', icon: Calendar },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Payments', href: '/admin/payments', icon: DollarSign },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      // Fetch users statistics
      const usersResponse = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const usersData = await usersResponse.json();

      // Calculate stats from users data
      const teachers = usersData?.filter((u: any) => u.role === 'teacher') || [];
      const students = usersData?.filter((u: any) => u.role === 'student') || [];

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        activeMeetings: 48, // Mock data - replace with actual API
        pendingApprovals: 0, // Mock data - replace when meetings API exists
        monthlyRevenue: 15420,
        avgRating: 4.7,
        activeClasses: 32,
        completionRate: 87,
        studentGrowth: 23,
        teacherGrowth: 12,
        meetingGrowth: 34,
        revenueGrowth: 18,
      });

      // Mock recent activity
      setRecentActivity([
        {
          id: '1',
          type: 'enrollment',
          message: 'Fatima Ahmed enrolled in Quran Memorization',
          user: 'Fatima Ahmed',
          timestamp: '2 minutes ago',
          status: 'success',
        },
        {
          id: '2',
          type: 'approval',
          message: 'Meeting request pending approval',
          user: 'Ali Hassan',
          timestamp: '15 minutes ago',
          status: 'pending',
        },
        {
          id: '3',
          type: 'payment',
          message: 'Payment received for Arabic Language course',
          user: 'Aisha Mohammed',
          timestamp: '1 hour ago',
          status: 'success',
        },
        {
          id: '4',
          type: 'meeting',
          message: 'Class completed successfully',
          user: 'Omar Abdullah',
          timestamp: '2 hours ago',
          status: 'success',
        },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const greeting = getGreeting('admin', user?.firstName || undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-emerald-50 flex items-center justify-center">
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-islamic-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-islamic-primary-700 font-semibold text-lg">Loading {BRAND_CONFIG.shortName}...</p>
          <p className="text-islamic-primary-500 text-sm mt-2">{BRAND_CONFIG.phrases.bismillah}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-emerald-50">
      <IslamicPatternBackground pattern="star" opacity={0.02}>
        <div className="h-full" />
      </IslamicPatternBackground>
      <IslamicSidebar 
        navItems={navItems}
        userRole="admin"
        userName={user?.firstName || 'Admin'}
        userEmail={user?.primaryEmailAddress?.emailAddress || ''}
      />

      <div className="relative z-10">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-islamic-primary-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold text-islamic-primary-900">
                {greeting.english} 👋
              </h1>
              <p className="text-sm text-islamic-primary-600 mt-1">
                {BRAND_CONFIG.name} - Admin Portal
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="hidden md:flex items-center bg-islamic-sand-100 rounded-xl px-4 py-2 min-w-[300px]">
                <Search className="w-5 h-5 text-islamic-primary-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search students, teachers, classes..."
                  className="bg-transparent border-none outline-none text-sm flex-1 text-islamic-primary-700 placeholder-islamic-primary-400"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-islamic-sand-100 transition-all">
                <Bell className="w-6 h-6 text-islamic-primary-600" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {notifications}
                  </span>
                )}
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchDashboardData}
                className="p-2 rounded-xl hover:bg-islamic-sand-100 transition-all"
              >
                <RefreshCw className="w-6 h-6 text-islamic-primary-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 space-y-6">
          {/* Key Metrics - 4 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Students Stat */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +{stats.studentGrowth}%
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stats.totalStudents}</h3>
              <p className="text-blue-100 text-sm">Total Students</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <Link href="/admin/students">
                  <span className="text-sm font-medium hover:underline flex items-center">
                    View all <ArrowUpRight className="w-4 h-4 ml-1" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Teachers Stat */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +{stats.teacherGrowth}%
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stats.totalTeachers}</h3>
              <p className="text-emerald-100 text-sm">Active Teachers</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <Link href="/admin/teachers">
                  <span className="text-sm font-medium hover:underline flex items-center">
                    Manage <ArrowUpRight className="w-4 h-4 ml-1" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Meetings Stat */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Video className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  +{stats.meetingGrowth}%
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-1">{stats.activeMeetings}</h3>
              <p className="text-purple-100 text-sm">Active Meetings</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <Link href="/admin/meetings">
                  <span className="text-sm font-medium hover:underline flex items-center">
                    View schedule <ArrowUpRight className="w-4 h-4 ml-1" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Approvals Stat */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="w-6 h-6" />
                </div>
                {stats.pendingApprovals > 0 && (
                  <div className="px-2 py-1 bg-red-500 rounded-lg text-xs font-bold animate-pulse">
                    ACTION NEEDED
                  </div>
                )}
              </div>
              <h3 className="text-3xl font-bold mb-1">{stats.pendingApprovals}</h3>
              <p className="text-orange-100 text-sm">Pending Approvals</p>
              <div className="mt-4 pt-4 border-t border-white/20">
                <Link href="/admin/meetings/pending-approval">
                  <span className="text-sm font-medium hover:underline flex items-center">
                    Review now <ArrowUpRight className="w-4 h-4 ml-1" />
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-5 border border-islamic-primary-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-islamic-primary-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-islamic-primary-900">
                    ${stats.monthlyRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    +{stats.revenueGrowth}% from last month
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-islamic-primary-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-islamic-primary-600 mb-1">Active Classes</p>
                  <p className="text-2xl font-bold text-islamic-primary-900">{stats.activeClasses}</p>
                  <p className="text-xs text-islamic-primary-500 mt-1">In progress</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-islamic-primary-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-islamic-primary-600 mb-1">Average Rating</p>
                  <p className="text-2xl font-bold text-islamic-primary-900">{stats.avgRating}</p>
                  <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(stats.avgRating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-islamic-primary-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-islamic-primary-600 mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-islamic-primary-900">{stats.completionRate}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions - 2/3 width */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-6 border border-islamic-primary-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-islamic-primary-900">Quick Actions</h2>
                  <Zap className="w-5 h-5 text-islamic-gold-500" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/admin/meetings/pending-approval">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-6 h-6 text-orange-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Approve Meetings</p>
                      {stats.pendingApprovals > 0 && (
                        <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold">
                          {stats.pendingApprovals} pending
                        </span>
                      )}
                    </div>
                  </Link>

                  <Link href="/admin/teachers">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <UserCheck className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Manage Teachers</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">{stats.totalTeachers} active</span>
                    </div>
                  </Link>

                  <Link href="/admin/students">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Manage Students</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">{stats.totalStudents} enrolled</span>
                    </div>
                  </Link>

                  <Link href="/admin/analytics">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">View Analytics</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">Full reports</span>
                    </div>
                  </Link>

                  <Link href="/admin/time-slots">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-islamic-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Calendar className="w-6 h-6 text-islamic-primary-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Time Slots</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">Manage schedule</span>
                    </div>
                  </Link>

                  <Link href="/admin/classes">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6 text-indigo-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Classes</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">{stats.activeClasses} active</span>
                    </div>
                  </Link>

                  <Link href="/admin/payments">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-islamic-gold-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <DollarSign className="w-6 h-6 text-islamic-gold-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Payments</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">View transactions</span>
                    </div>
                  </Link>

                  <Link href="/admin/settings">
                    <div className="group p-4 rounded-xl border-2 border-islamic-primary-100 hover:border-islamic-primary-400 hover:shadow-lg transition-all cursor-pointer text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                        <Settings className="w-6 h-6 text-gray-600" />
                      </div>
                      <p className="font-semibold text-sm text-islamic-primary-900">Settings</p>
                      <span className="inline-block mt-2 text-xs text-islamic-primary-500">Configure</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity - 1/3 width */}
            <div className="bg-white rounded-2xl p-6 border border-islamic-primary-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-islamic-primary-900">Recent Activity</h2>
                <Activity className="w-5 h-5 text-islamic-primary-500" />
              </div>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-islamic-primary-50 last:border-0">
                    <div
                      className={`p-2 rounded-lg ${
                        activity.status === 'success'
                          ? 'bg-emerald-100'
                          : activity.status === 'pending'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {activity.type === 'enrollment' && <GraduationCap className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'approval' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                      {activity.type === 'payment' && <DollarSign className="w-4 h-4 text-emerald-600" />}
                      {activity.type === 'meeting' && <Video className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-islamic-primary-900 font-medium mb-1">
                        {activity.message}
                      </p>
                      <p className="text-xs text-islamic-primary-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 py-2 text-sm font-semibold text-islamic-primary-600 hover:text-islamic-primary-800 hover:bg-islamic-sand-50 rounded-lg transition-all">
                View All Activity
              </button>
            </div>
          </div>

          {/* Islamic Footer */}
          <div className="bg-gradient-to-r from-islamic-primary-50 to-islamic-emerald-50 rounded-2xl p-6 border border-islamic-primary-100 text-center">
            <p className="text-islamic-primary-600 text-sm mb-2">{BRAND_CONFIG.phrases.bismillah}</p>
            <p className="text-xl font-arabic text-islamic-primary-800 mb-2">{BRAND_CONFIG.phrases.alhamdulillah}</p>
            <p className="text-islamic-primary-600 text-sm">
              {BRAND_CONFIG.tagline} • Empowering through Islamic Education
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
