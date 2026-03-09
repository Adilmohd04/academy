/**
 * Islamic-Themed Teacher Dashboard - New Redesigned Version
 * Professional, elegant design for teachers
 */

'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, Users, Video, BookOpen, 
  Calendar, Clock, CheckCircle, TrendingUp,
  Award, Activity, Bell, Settings
} from 'lucide-react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicCard, IslamicStatCard, IslamicActionCard, IslamicInfoCard } from '@/components/ui/IslamicCards';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { BRAND_CONFIG, getGreeting } from '@/lib/brand-config';

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  upcomingSessions: number;
  completedSessions: number;
  averageRating: number;
  pendingAssignments: number;
}

interface UpcomingSession {
  id: string;
  title: string;
  studentName: string;
  date: string;
  time: string;
  meetingLink?: string;
}

interface TeacherDashboardProps {
  courses?: any[];
  meetings?: any[];
}

export default function IslamicTeacherDashboard({ courses = [], meetings = [] }: TeacherDashboardProps) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeacherStats>({
    totalClasses: 0,
    totalStudents: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    averageRating: 0,
    pendingAssignments: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);

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
    fetchTeacherData();
  }, [meetings, courses]);

  const fetchTeacherData = async () => {
    try {
      setLoading(true);
      
      // Use passed meetings data if available
      if (meetings && meetings.length > 0) {
        const upcoming = meetings.filter((m: any) => 
          new Date(m.meeting_date) >= new Date() && m.approval_status === 'approved'
        );
        
        setUpcomingSessions(upcoming.slice(0, 5).map((m: any) => ({
          id: m.id,
          title: m.slot_name || 'Class Session',
          studentName: m.student_name || 'Student',
          date: new Date(m.meeting_date).toLocaleDateString(),
          time: m.meeting_time || '',
          meetingLink: m.meeting_link || undefined,
        })));
        
        setStats(prev => ({
          ...prev,
          totalClasses: courses?.length || 0,
          totalStudents: new Set(meetings.map((m: any) => m.student_id)).size,
          upcomingSessions: upcoming.length,
          completedSessions: meetings.filter((m: any) => m.attendance === 'present').length,
        }));
        
        setLoading(false);
        return;
      }

      const token = await getToken();

      if (!token) {
        setTimeout(fetchTeacherData, 1000);
        return;
      }

      // Fetch teacher's meetings
      const meetingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teacher/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json();
        // Process meetings data
        const upcoming = meetingsData.filter((m: any) => 
          new Date(m.date) >= new Date() && m.approval_status === 'approved'
        );
        
        setUpcomingSessions(upcoming.slice(0, 5)); // Get next 5
        setStats(prev => ({
          ...prev,
          upcomingSessions: upcoming.length,
          completedSessions: meetingsData.filter((m: any) => 
            m.attendance === 'present'
          ).length,
        }));
      }

      // TODO: Fetch additional stats (students, classes, etc.)

    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-islamic-emerald-200 border-t-islamic-emerald-600 mx-auto mb-4"></div>
          <p className="text-islamic-primary-700 font-semibold">Loading {BRAND_CONFIG.shortName}...</p>
          <p className="text-sm text-gray-500 mt-2 font-arabic">{BRAND_CONFIG.phrases.bismillah}</p>
        </div>
      </div>
    );
  }

  const greeting = getGreeting('teacher', user?.firstName || undefined);

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-sand-50 via-white to-islamic-emerald-50">
      <IslamicPatternBackground pattern="arabesque" opacity={0.03}>
        {/* Page Header */}
        <IslamicPageHeader
          title={`${greeting.english} 👋`}
          subtitle={`Welcome to ${BRAND_CONFIG.shortName} Teacher Portal`}
          arabicTitle={greeting.arabic}
          icon={GraduationCap}
          actions={[
            {
              label: 'Start Class',
              icon: Video,
              variant: 'primary',
              href: '/teacher/meetings'
            },
            {
              label: 'Upload Lesson',
              icon: BookOpen,
              variant: 'gold',
              href: '/teacher/lessons/upload'
            }
          ]}
        />

        {/* Dashboard Content */}
        <div className="p-8 space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <IslamicStatCard
              icon={GraduationCap}
              label="Total Classes"
              value={stats.totalClasses}
                iconColor="text-islamic-primary-600"
                iconBg="bg-islamic-primary-50"
              />
              <IslamicStatCard
                icon={Users}
                label="Total Students"
                value={stats.totalStudents}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
              <IslamicStatCard
                icon={Clock}
                label="Upcoming Sessions"
                value={stats.upcomingSessions}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
                subtext="This week"
              />
              <IslamicStatCard
                icon={Award}
                label="Average Rating"
                value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                iconColor="text-islamic-gold-600"
                iconBg="bg-islamic-gold-50"
                trend="up"
                trendValue="+0.3"
              />
            </div>

            {/* Info Banner */}
            <IslamicInfoCard
              title="Teaching Tip of the Day"
              variant="info"
              icon={BookOpen}
            >
              <p className="text-gray-700">
                Remember to start each class with Bismillah and maintain a positive learning environment. 
                Patience and clear communication are keys to effective teaching.
              </p>
            </IslamicInfoCard>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upcoming Sessions - Takes 2 columns */}
              <div className="lg:col-span-2">
                <IslamicCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-islamic-primary-900 flex items-center gap-2">
                      <Calendar className="w-6 h-6" />
                      Upcoming Sessions
                    </h3>
                    <Link href="/teacher/meetings">
                      <IslamicButton size="sm" variant="outline">
                        View All
                      </IslamicButton>
                    </Link>
                  </div>

                  {upcomingSessions.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingSessions.map((session) => (
                        <div 
                          key={session.id}
                          className="p-4 bg-gradient-to-r from-islamic-sand-50 to-islamic-emerald-50/30 rounded-xl hover:shadow-md transition-all border border-islamic-primary-100/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{session.title}</h4>
                              <p className="text-sm text-gray-600 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Student: {session.studentName}
                              </p>
                              <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                <Clock className="w-4 h-4" />
                                {session.date} at {session.time}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {session.meetingLink && (
                                <Link href={session.meetingLink} target="_blank">
                                  <IslamicButton size="sm" variant="primary">
                                    Join
                                  </IslamicButton>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No upcoming sessions</p>
                      <p className="text-sm text-gray-400 mt-1">Check your availability settings</p>
                    </div>
                  )}
                </IslamicCard>
              </div>

              {/* Quick Stats - Takes 1 column */}
              <div className="space-y-6">
                {/* Pending Tasks */}
                <IslamicCard className="p-6">
                  <h3 className="text-lg font-bold text-islamic-primary-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Pending Tasks
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Assignments to Grade</span>
                      <span className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                        {stats.pendingAssignments}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Attendance to Mark</span>
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                        3
                      </span>
                    </div>
                  </div>
                </IslamicCard>

                {/* Performance */}
                <IslamicCard className="p-6 bg-gradient-to-br from-islamic-primary-600 to-islamic-emerald-600 text-white">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold mb-1">This Month</h4>
                      <p className="text-sm text-white/80">{stats.completedSessions} sessions completed</p>
                    </div>
                  </div>
                  <div className="border-t border-white/20 pt-4">
                    <p className="text-sm text-white/90">Keep up the great work! 🌟</p>
                  </div>
                </IslamicCard>
              </div>
            </div>

            {/* My Availability - Show teacher's selected slots */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-islamic-primary-900">My Availability</h2>
                <Link href="/teacher/availability">
                  <IslamicButton variant="outline" size="sm">
                    Manage Schedule
                  </IslamicButton>
                </Link>
              </div>
              <IslamicCard className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  View and manage your teaching availability slots
                </p>
                <Link href="/teacher/availability">
                  <IslamicButton variant="primary" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Available Time Slots
                  </IslamicButton>
                </Link>
              </IslamicCard>
            </div>

            {/* Quick Actions Grid */}
            <div>
              <h2 className="text-xl font-bold text-islamic-primary-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <IslamicActionCard
                  icon={BookOpen}
                  title="Create Assignment"
                  description="Add new homework for students"
                  href="/teacher/assignments/create"
                  gradient="from-purple-600 to-indigo-600"
                />
                <IslamicActionCard
                  icon={CheckCircle}
                  title="Mark Attendance"
                  description="Record student attendance"
                  href="/teacher/attendance"
                  gradient="from-green-600 to-emerald-600"
                />
                <IslamicActionCard
                  icon={Calendar}
                  title="Set Availability"
                  description="Update your teaching schedule"
                  href="/teacher/availability"
                  gradient="from-blue-600 to-cyan-600"
                />
                <IslamicActionCard
                  icon={TrendingUp}
                  title="View Analytics"
                  description="Check your teaching stats"
                  href="/teacher/analytics"
                  gradient="from-islamic-gold-500 to-amber-500"
                />
              </div>
            </div>

            {/* Islamic Footer Quote */}
            <div className="mt-12 text-center">
              <div className="inline-block px-8 py-4 bg-gradient-to-r from-islamic-emerald-600 to-islamic-primary-600 rounded-2xl text-white shadow-lg">
                <p className="font-arabic text-xl mb-2">{BRAND_CONFIG.phrases.iqra}</p>
                <p className="text-sm opacity-90">{BRAND_CONFIG.phrases.iqraTranslation}</p>
              </div>
            </div>
          </div>
        </IslamicPatternBackground>
    </div>
  );
}
