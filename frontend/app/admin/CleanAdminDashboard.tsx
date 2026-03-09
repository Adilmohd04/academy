/**
 * Little Muslima Academy - Clean Modern Admin Dashboard
 * Simple, professional design focused on functionality
 */

'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, GraduationCap, Video, AlertCircle,
  TrendingUp, DollarSign, Calendar, Settings,
  Bell, Search, BarChart3, BookOpen, Activity
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  activeMeetings: number;
  pendingApprovals: number;
}

export default function CleanAdminDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    activeMeetings: 0,
    pendingApprovals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      const teachers = data.users?.filter((u: any) => u.role === 'teacher') || [];
      const students = data.users?.filter((u: any) => u.role === 'student') || [];

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        activeMeetings: 48,
        pendingApprovals: 3,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900">Little Muslima</h1>
          <p className="text-sm text-gray-500">Admin Portal</p>
        </div>

        <nav className="space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium">
            <BarChart3 className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/teachers" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <Users className="w-5 h-5" />
            Teachers
          </Link>
          <Link href="/admin/students" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <GraduationCap className="w-5 h-5" />
            Students
          </Link>
          <Link href="/admin/meetings" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <Video className="w-5 h-5" />
            Meetings
            {stats.pendingApprovals > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {stats.pendingApprovals}
              </span>
            )}
          </Link>
          <Link href="/admin/boxes" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5" />
            Time Slots
          </Link>
          <Link href="/admin/analytics" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <Activity className="w-5 h-5" />
            Analytics
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName || 'Admin'}
            </h1>
            <p className="text-gray-600 mt-1">Here's what's happening today</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-6 h-6 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Students Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +12%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalStudents}</h3>
            <p className="text-gray-600 text-sm mt-1">Total Students</p>
          </div>

          {/* Teachers Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +8%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</h3>
            <p className="text-gray-600 text-sm mt-1">Active Teachers</p>
          </div>

          {/* Meetings Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Video className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +15%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.activeMeetings}</h3>
            <p className="text-gray-600 text-sm mt-1">Active Meetings</p>
          </div>

          {/* Pending Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              {stats.pendingApprovals > 0 && (
                <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded-full">
                  URGENT
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</h3>
            <p className="text-gray-600 text-sm mt-1">Pending Approvals</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/meetings/pending">
              <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <AlertCircle className="w-8 h-8 text-orange-500 mb-2" />
                <h3 className="font-semibold text-gray-900">Approve Meetings</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {stats.pendingApprovals} requests waiting
                </p>
              </button>
            </Link>

            <Link href="/admin/teachers">
              <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <Users className="w-8 h-8 text-green-500 mb-2" />
                <h3 className="font-semibold text-gray-900">Manage Teachers</h3>
                <p className="text-sm text-gray-600 mt-1">
                  View and manage {stats.totalTeachers} teachers
                </p>
              </button>
            </Link>

            <Link href="/admin/students">
              <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <GraduationCap className="w-8 h-8 text-blue-500 mb-2" />
                <h3 className="font-semibold text-gray-900">Manage Students</h3>
                <p className="text-sm text-gray-600 mt-1">
                  View and manage {stats.totalStudents} students
                </p>
              </button>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New student enrolled</p>
                <p className="text-xs text-gray-500 mt-1">Fatima Ahmed joined Quran Memorization</p>
                <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Meeting approval needed</p>
                <p className="text-xs text-gray-500 mt-1">Ali Hassan requested a session</p>
                <p className="text-xs text-gray-400 mt-1">15 minutes ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Payment received</p>
                <p className="text-xs text-gray-500 mt-1">$120 from Aisha Mohammed</p>
                <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
