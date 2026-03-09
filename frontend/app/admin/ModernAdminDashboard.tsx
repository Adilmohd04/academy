'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, GraduationCap, Calendar, Clock,
  BookOpen, BarChart3, Settings, LogOut,
  ChevronRight, TrendingUp, AlertCircle
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  pendingMeetings: number;
  totalSlots: number;
}

interface MenuItem {
  title: string;
  icon: any;
  href: string;
  color: string;
  bgColor: string;
}

export default function ModernAdminDashboard() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    pendingMeetings: 0,
    totalSlots: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      
      // Fetch users
      const usersRes = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersRes.json();
      
      const teachers = users?.filter((u: any) => u.role === 'teacher') || [];
      const students = users?.filter((u: any) => u.role === 'student') || [];

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        pendingMeetings: 0,
        totalSlots: 0,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const menuItems: MenuItem[] = [
    { title: 'Teachers', icon: GraduationCap, href: '/admin/teachers', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { title: 'Students', icon: Users, href: '/admin/students', color: 'text-green-600', bgColor: 'bg-green-50' },
    { title: 'Meetings', icon: Calendar, href: '/admin/meetings', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { title: 'Time Slots', icon: Clock, href: '/admin/time-slots', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { title: 'Analytics', icon: BarChart3, href: '/admin/analytics', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { title: 'Settings', icon: Settings, href: '/admin/settings', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  ];

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-500', trend: '+12%' },
    { label: 'Total Teachers', value: stats.totalTeachers, icon: GraduationCap, color: 'bg-green-500', trend: '+5%' },
    { label: 'Pending Meetings', value: stats.pendingMeetings, icon: AlertCircle, color: 'bg-orange-500', trend: '-3%' },
    { label: 'Available Slots', value: stats.totalSlots, icon: Clock, color: 'bg-purple-500', trend: '+8%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Little Muslima Academy</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2 text-gray-400 hover:text-gray-600 transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName} 👋
          </h2>
          <p className="text-gray-600">Here&apos;s what&apos;s happening with your academy today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>{stat.trend}</span>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {loading ? '...' : stat.value}
              </h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Menu Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item, index) => (
              <Link key={index} href={item.href}>
                <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${item.bgColor} rounded-lg flex items-center justify-center group-hover:scale-110 transition`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-500">Manage {item.title.toLowerCase()}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
