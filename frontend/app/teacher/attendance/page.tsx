'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { 
  Activity, GraduationCap, Users, Video, BookOpen, 
  CheckCircle, Calendar, TrendingUp, Clock, User
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  studentName: string;
  studentEmail: string;
  status: 'present' | 'absent' | 'pending';
  meetingLink?: string;
}

export default function TeacherAttendance() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'present' | 'absent' | 'pending'>('all');

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
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/teacher/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.meetings) {
        const attendanceRecords = data.meetings.map((meeting: any) => ({
          id: meeting.id,
          date: meeting.meeting_date,
          time: meeting.meeting_time || 'Time not set',
          studentName: meeting.student_name,
          studentEmail: meeting.student_email,
          status: meeting.attendance,
          meetingLink: meeting.meeting_link,
        }));
        setAttendance(attendanceRecords);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter(record => 
    selectedFilter === 'all' || record.status === selectedFilter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: attendance.length,
    present: attendance.filter(r => r.status === 'present').length,
    absent: attendance.filter(r => r.status === 'absent').length,
    pending: attendance.filter(r => r.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <IslamicPatternBackground>{null}</IslamicPatternBackground>
      
      <main className="min-h-screen">
        <IslamicPageHeader
          title="Attendance"
          subtitle="Track and manage student attendance"
          icon={CheckCircle}
        />

        <div className="p-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid md:grid-cols-4 gap-4">
            <IslamicCard>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </IslamicCard>
            <IslamicCard>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Present</p>
                <p className="text-3xl font-bold text-green-600">{stats.present}</p>
              </div>
            </IslamicCard>
            <IslamicCard>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Absent</p>
                <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </IslamicCard>
            <IslamicCard>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </IslamicCard>
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2">
            {['all', 'present', 'absent', 'pending'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter as any)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  selectedFilter === filter
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Attendance Records */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredAttendance.length === 0 ? (
            <IslamicCard>
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Attendance Records</h3>
                <p className="text-gray-600">Attendance records will appear here</p>
              </div>
            </IslamicCard>
          ) : (
            <div className="space-y-3">
              {filteredAttendance.map((record) => (
                <IslamicCard key={record.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                            {record.studentName.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{record.studentName}</h3>
                          <p className="text-sm text-gray-600">{record.studentEmail}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="flex items-center text-gray-700 mb-1">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className="text-sm">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="text-sm">{record.time}</span>
                        </div>
                      </div>
                      
                      <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </IslamicCard>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
