/**
 * Islamic-Themed Admin Dashboard - New Redesigned Version
 * Professional, elegant design with full functionality preservation
 */

'use client';

import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, UserCheck, GraduationCap, Shield, 
  Calendar, TrendingUp, Activity, BookOpen,
  Settings, Bell, BarChart3, Package, DollarSign,
  Video, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicCard, IslamicStatCard, IslamicActionCard } from '@/components/ui/IslamicCards';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { BRAND_CONFIG, getGreeting } from '@/lib/brand-config';

interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: string;
}

interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalTeachers: number;
  totalStudents: number;
  activeMeetings: number;
  pendingApprovals: number;
  totalRevenue: number;
  completionRate: number;
}

export default function IslamicAdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalTeachers: 0,
    totalStudents: 0,
    activeMeetings: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const navItems = [
    { 
      label: 'Dashboard', 
      href: '/admin', 
      icon: Activity 
    },
    { 
      label: 'Teachers', 
      href: '/admin/teachers', 
      icon: GraduationCap,
      subItems: [
        { label: 'All Teachers', href: '/admin/teachers' },
        { label: 'Teacher Pricing', href: '/admin/teacher-pricing' }
      ]
    },
    { 
      label: 'Students', 
      href: '/admin/students', 
      icon: Users 
    },
    { 
      label: 'Meetings', 
      href: '/admin/meetings', 
      icon: Video,
      badge: stats.pendingApprovals,
      subItems: [
        { label: 'Pending Approval', href: '/admin/meetings/approval' },
        { label: 'All Meetings', href: '/admin/meetings/all' }
      ]
    },
    { 
      label: 'Time Slots', 
      href: '/admin/boxes', 
      icon: Calendar 
    },
    { 
      label: 'Analytics', 
      href: '/admin/analytics', 
      icon: BarChart3 
    },
    { 
      label: 'Payments', 
      href: '/admin/payments', 
      icon: DollarSign 
    },
    { 
      label: 'Settings', 
      href: '/admin/settings', 
      icon: Settings 
    },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      if (!token) {
        setTimeout(fetchDashboardData, 1000);
        return;
      }

      // Fetch users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const usersList = usersData.data || [];

        setStats(prev => ({
          ...prev,
          totalUsers: usersList.length,
          totalAdmins: usersList.filter((u: User) => u.role === 'admin').length,
          totalTeachers: usersList.filter((u: User) => u.role === 'teacher').length,
          totalStudents: usersList.filter((u: User) => u.role === 'student').length,
        }));
      }

      // Fetch pending meetings count
      const meetingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/admin/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json();
        setStats(prev => ({
          ...prev,
          pendingApprovals: meetingsData?.length || 0,
        }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-primary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-islamic-primary-200 border-t-islamic-primary-600 mx-auto mb-4"></div>
          <p className="text-islamic-primary-700 font-semibold">Loading {BRAND_CONFIG.shortName}...</p>
          <p className="text-sm text-gray-500 mt-2 font-arabic">{BRAND_CONFIG.phrases.bismillah}</p>
        </div>
      </div>
    );
  }

  const greeting = getGreeting('admin', user?.firstName || undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-emerald-50">
      {/* Main Content */}
      <div className="flex-1">
        <IslamicPatternBackground pattern="mashrabiya" opacity={0.03}>
          {/* Top Header Bar */}
          <div className="bg-white/80 backdrop-blur-md border-b border-islamic-primary-100/50 sticky top-0 z-40">
            <div className="px-8 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-islamic-primary-900">
                  {greeting.english} 👋
                </h1>
                <p className="text-sm text-gray-600 mt-1">Welcome to {BRAND_CONFIG.shortName} Admin Dashboard</p>
              </div>
              <div className="flex items-center gap-4">
                <button className="relative p-2 hover:bg-islamic-primary-50 rounded-xl transition-colors">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {stats.pendingApprovals > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {stats.pendingApprovals}
                    </span>
                  )}
                </button>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10 rounded-xl border-2 border-islamic-primary-200"
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="p-8 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <IslamicStatCard
                icon={Users}
                label="Total Students"
                value={stats.totalStudents}
                iconColor="text-islamic-emerald-600"
                iconBg="bg-islamic-emerald-50"
                trend="up"
                trendValue="+12%"
              />
              <IslamicStatCard
                icon={GraduationCap}
                label="Total Teachers"
                value={stats.totalTeachers}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
              <IslamicStatCard
                icon={Video}
                label="Active Meetings"
                value={stats.activeMeetings}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
                subtext="This week"
              />
              <IslamicStatCard
                icon={AlertCircle}
                label="Pending Approvals"
                value={stats.pendingApprovals}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
                trend={stats.pendingApprovals > 0 ? 'up' : 'neutral'}
                trendValue={stats.pendingApprovals > 0 ? 'Action needed' : 'All clear'}
              />
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-bold text-islamic-primary-900 mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <IslamicActionCard
                  icon={CheckCircle}
                  title="Approve Meetings"
                  description="Review and approve pending student meetings"
                  href="/admin/meetings/approval"
                  gradient="from-islamic-primary-600 to-islamic-emerald-600"
                />
                <IslamicActionCard
                  icon={Users}
                  title="Manage Users"
                  description="View and manage all platform users"
                  href="/admin/users"
                  gradient="from-blue-600 to-indigo-600"
                />
                <IslamicActionCard
                  icon={Calendar}
                  title="Time Slots"
                  description="Configure available time slots"
                  href="/admin/boxes"
                  gradient="from-purple-600 to-pink-600"
                />
                <IslamicActionCard
                  icon={Settings}
                  title="Settings"
                  description="Platform configuration and settings"
                  href="/admin/settings"
                  gradient="from-gray-700 to-gray-900"
                />
              </div>
            </div>

            {/* Analytics Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <IslamicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-islamic-primary-900">User Growth</h3>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-islamic-sand-50 to-islamic-emerald-50 rounded-xl">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-islamic-primary-300 mx-auto mb-4" />
                    <p className="text-gray-600">Analytics chart will be rendered here</p>
                    <p className="text-sm text-gray-400 mt-2">Integration with Chart.js or Recharts</p>
                  </div>
                </div>
              </IslamicCard>

              {/* Recent Activity */}
              <IslamicCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-islamic-primary-900">Recent Activity</h3>
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex items-start gap-3 p-3 bg-islamic-sand-50/50 rounded-lg hover:bg-islamic-sand-100/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-islamic-primary-100 flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-islamic-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">New student enrolled</p>
                        <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </IslamicCard>
            </div>

            {/* Islamic Decorative Footer */}
            <div className="mt-12 text-center">
              <div className="inline-block px-8 py-4 bg-gradient-to-r from-islamic-primary-600 to-islamic-emerald-600 rounded-2xl text-white shadow-lg">
                <p className="font-arabic text-xl mb-2">{BRAND_CONFIG.phrases.bismillah}</p>
                <p className="text-sm opacity-90">{BRAND_CONFIG.phrases.bismillahTranslation}</p>
              </div>
            </div>
          </div>
        </IslamicPatternBackground>
      </div>
    </div>
  );
}
