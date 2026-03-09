'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, GraduationCap, Calendar, Clock,
  CheckCircle
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  pendingMeetings: number;
  totalSlots: number;
}

export default function IslamicDashboard() {
  const { getToken } = useAuth();
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
      
      // Fetch users for student/teacher counts
      const usersRes = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersRes.json();
      
      const teachers = users?.filter((u: any) => u.role === 'teacher') || [];
      const students = users?.filter((u: any) => u.role === 'student') || [];

      // Fetch pending meetings and slots count
      const statsRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        pendingMeetings: statsData.pending || 0,
        totalSlots: statsData.total_slots || 0,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">
            السلام عليكم, {user?.firstName} 
          </h2>
          <p className="text-emerald-100">Welcome to Little Muslima Academy Admin Dashboard</p>
        </div>
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stats.totalStudents}</p>
              <p className="text-sm text-slate-500 font-medium">Students</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stats.totalTeachers}</p>
              <p className="text-sm text-slate-500 font-medium">Teachers</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stats.pendingMeetings}</p>
              <p className="text-sm text-slate-500 font-medium">Pending Approvals</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '30%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-800">{loading ? '...' : stats.totalSlots}</p>
              <p className="text-sm text-slate-500 font-medium">Time Slots</p>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <div className="w-1 h-5 bg-emerald-500 rounded-full mr-3"></div>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/users">
            <div className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Manage Users</h4>
                  <p className="text-sm text-slate-500">View and edit all users</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/admin/meetings/pending-approval">
            <div className="p-4 border border-slate-200 rounded-xl hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Pending Approvals</h4>
                  <p className="text-sm text-slate-500">Review meeting requests</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
