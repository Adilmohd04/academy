'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { 
  Activity, GraduationCap, Users, Video, BookOpen, 
  CheckCircle, Calendar, TrendingUp, Mail, Phone
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalClasses: number;
  attendedClasses: number;
  attendanceRate: number;
}

export default function TeacherStudents() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

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
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/teacher/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.meetings) {
        // Group meetings by student
        const studentMap = new Map<string, Student>();
        
        data.meetings.forEach((meeting: any) => {
          const studentId = meeting.student_id;
          
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: studentId,
              name: meeting.student_name,
              email: meeting.student_email,
              phone: meeting.student_phone,
              totalClasses: 0,
              attendedClasses: 0,
              attendanceRate: 0,
            });
          }
          
          const student = studentMap.get(studentId)!;
          student.totalClasses++;
          
          if (meeting.attendance === 'present') {
            student.attendedClasses++;
          }
        });
        
        // Calculate attendance rates
        const studentList = Array.from(studentMap.values()).map(student => ({
          ...student,
          attendanceRate: student.totalClasses > 0 
            ? Math.round((student.attendedClasses / student.totalClasses) * 100)
            : 0,
        }));
        
        setStudents(studentList);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <IslamicPatternBackground>{null}</IslamicPatternBackground>
      
      <main className="min-h-screen">
        <IslamicPageHeader
          title="My Students"
          subtitle="View and manage your students"
          icon={Users}
        />

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
          ) : students.length === 0 ? (
            <IslamicCard>
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Students Yet</h3>
                <p className="text-gray-600">Your students will appear here once they book sessions</p>
              </div>
            </IslamicCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <IslamicCard key={student.id}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{student.name}</h3>
                        <p className="text-xs text-gray-600">{student.totalClasses} classes</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-700">
                        <Mail className="h-4 w-4 mr-2 text-emerald-600" />
                        <span className="truncate">{student.email}</span>
                      </div>
                      
                      {student.phone && (
                        <div className="flex items-center text-gray-700">
                          <Phone className="h-4 w-4 mr-2 text-emerald-600" />
                          <span>{student.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Attendance Rate</span>
                        <span className="text-sm font-semibold text-emerald-600">
                          {student.attendanceRate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${student.attendanceRate}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        {student.attendedClasses} of {student.totalClasses} classes attended
                      </div>
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
