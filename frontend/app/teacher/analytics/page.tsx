'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { 
  Activity, GraduationCap, Users, Video, BookOpen, 
  CheckCircle, Calendar, TrendingUp, DollarSign, Award, Target
} from 'lucide-react';

interface TeacherProfile {
  full_name: string;
  email: string;
  hourly_price: number;
  teacher_price: number;
  is_free: boolean;
}

interface Analytics {
  totalMeetings: number;
  completedMeetings: number;
  pendingMeetings: number;
  totalRevenue: number;
  studentsCount: number;
  averageRating: number;
  attendanceRate: number;
}

export default function TeacherAnalytics() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalMeetings: 0,
    completedMeetings: 0,
    pendingMeetings: 0,
    totalRevenue: 0,
    studentsCount: 0,
    averageRating: 0,
    attendanceRate: 0,
  });

  const navItems = [
    { label: 'Dashboard', href: '/teacher', icon: Activity },
    { label: 'My Classes', href: '/teacher/classes', icon: GraduationCap },
    { label: 'Students', href: '/teacher/students', icon: Users },
    { label: 'Meetings', href: '/teacher/meetings', icon: Video },
    { label: 'Assignments', href: '/teacher/assignments', icon: BookOpen },
    { label: 'Attendance', href: '/teacher/attendance', icon: CheckCircle },
    { label: 'Availability', href: '/teacher/availability', icon: Calendar },
    { label: 'Analytics', href: '/teacher/analytics', icon: TrendingUp },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = await getToken();
      
      // Fetch teacher data from the correct endpoint
      const response = await fetch('/api/teacher/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teacher data');
      }
      
      const data = await response.json();
      
      if (data.meetings && data.profile) {
        setProfile(data.profile);
        
        // Calculate analytics
        const meetings = data.meetings;
        const completed = meetings.filter((m: any) => m.approval_status === 'approved' && m.attendance === 'present');
        const pending = meetings.filter((m: any) => m.approval_status === 'pending');
        
        // Calculate revenue (only for PAID teachers)
        const revenue = data.profile.is_free ? 0 : meetings
          .filter((m: any) => m.payment_status === 'paid')
          .reduce((sum: number, m: any) => sum + (m.payment_amount || 0), 0);
        
        // Calculate unique students
        const uniqueStudents = new Set(meetings.map((m: any) => m.student_id));
        
        // Calculate attendance rate
        const attendedMeetings = meetings.filter((m: any) => m.attendance === 'present').length;
        const totalCompletedMeetings = meetings.filter((m: any) => m.attendance !== 'pending').length;
        const attendanceRate = totalCompletedMeetings > 0 ? (attendedMeetings / totalCompletedMeetings) * 100 : 0;
        
        setAnalytics({
          totalMeetings: meetings.length,
          completedMeetings: completed.length,
          pendingMeetings: pending.length,
          totalRevenue: revenue,
          studentsCount: uniqueStudents.size,
          averageRating: 4.8, // Placeholder
          attendanceRate: Math.round(attendanceRate),
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <IslamicPatternBackground>{null}</IslamicPatternBackground>
      
      <main className="min-h-screen">
        <IslamicPageHeader
          title="Analytics & Performance"
          subtitle="Track your teaching performance and earnings"
          icon={TrendingUp}
        />

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <>
              {/* Pricing Info Card */}
              <IslamicCard>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <DollarSign className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Your Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {profile?.is_free ? (
                          <span className="text-green-600">FREE Teacher</span>
                        ) : (
                          <span>₹{profile?.teacher_price || profile?.hourly_price || 0}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">Per session rate set by admin</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-semibold ${
                    profile?.is_free || (!profile?.teacher_price && !profile?.hourly_price) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {profile?.is_free || (!profile?.teacher_price && !profile?.hourly_price) ? 'FREE' : 'PAID'}
                  </div>
                </div>
              </IslamicCard>

              {/* Stats Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <IslamicCard>
                  <div className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                      <Video className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Total Meetings</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.totalMeetings}</p>
                  </div>
                </IslamicCard>

                <IslamicCard>
                  <div className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Completed</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.completedMeetings}</p>
                  </div>
                </IslamicCard>

                <IslamicCard>
                  <div className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mb-3">
                      <Calendar className="h-6 w-6 text-yellow-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Pending</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.pendingMeetings}</p>
                  </div>
                </IslamicCard>

                <IslamicCard>
                  <div className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-gray-600 text-sm mb-1">Students</p>
                    <p className="text-3xl font-bold text-gray-900">{analytics.studentsCount}</p>
                  </div>
                </IslamicCard>
              </div>

              {/* Performance Metrics */}
              <div className="grid md:grid-cols-2 gap-4">
                <IslamicCard>
                  <div className="p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <Target className="h-6 w-6 text-emerald-600" />
                      <h3 className="text-lg font-bold text-gray-900">Attendance Rate</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Overall Attendance</span>
                        <span className="font-bold text-emerald-600">{analytics.attendanceRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all"
                          style={{ width: `${analytics.attendanceRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </IslamicCard>

                <IslamicCard>
                  <div className="p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <Award className="h-6 w-6 text-emerald-600" />
                      <h3 className="text-lg font-bold text-gray-900">Average Rating</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-6 h-6 ${star <= analytics.averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-2xl font-bold text-gray-900">{analytics.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                </IslamicCard>
              </div>

              {/* Revenue Card - Only show for PAID teachers */}
              {!profile?.is_free && (
                <IslamicCard>
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-4 bg-white rounded-xl shadow-md">
                          <DollarSign className="h-10 w-10 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Revenue Earned</p>
                          <p className="text-4xl font-bold text-gray-900">₹{analytics.totalRevenue.toLocaleString()}</p>
                          <p className="text-sm text-gray-500 mt-1">From {analytics.completedMeetings} completed sessions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </IslamicCard>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
