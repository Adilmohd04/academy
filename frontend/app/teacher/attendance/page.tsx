'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

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
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'present' | 'absent' | 'pending'>('all');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API}/api/meetings/teacher/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Unable to load attendance records');
      }
      const data = await response.json();
      // The protected endpoint returns `{ data: [...] }`; tolerate the old
      // response shape during rollout so teachers do not see an empty screen.
      const meetings = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.meetings)
            ? data.meetings
            : [];

      const attendanceRecords = meetings.map((meeting: any) => {
        const timeSlot = Array.isArray(meeting.time_slots)
          ? meeting.time_slots[0]
          : meeting.time_slots;
        const startTime = timeSlot?.start_time || meeting.meeting_time || '';
        const endTime = timeSlot?.end_time || '';

        return {
          id: meeting.id,
          date: meeting.meeting_date,
          time: startTime && endTime ? `${startTime} – ${endTime}` : startTime || 'Time not set',
          studentName: meeting.student_name || 'Student',
          studentEmail: meeting.student_email || '',
          status: meeting.attendance || 'pending',
          meetingLink: meeting.meeting_link,
        };
      });
      setAttendance(attendanceRecords);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendance([]);
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
    <div className="min-h-full bg-slate-50/40">
      <TeacherPageContainer className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance</h1>
          <p className="mt-1 text-sm text-slate-600">Track and manage student attendance records.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Classes', value: stats.total, valueClass: 'text-slate-900' },
            { label: 'Present', value: stats.present, valueClass: 'text-emerald-700' },
            { label: 'Absent', value: stats.absent, valueClass: 'text-rose-700' },
            { label: 'Pending', value: stats.pending, valueClass: 'text-amber-700' },
          ].map((item) => (
            <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">{item.label}</p>
              <p className={`mt-1 text-3xl font-bold ${item.valueClass}`}>{item.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {(['all', 'present', 'absent', 'pending'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  selectedFilter === filter
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : filteredAttendance.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No Attendance Records</h3>
            <p className="mt-1 text-sm text-slate-600">Attendance records will appear here.</p>
          </section>
        ) : (
          <section className="space-y-3">
            {filteredAttendance.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                        {record.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">{record.studentName}</h3>
                        <p className="truncate text-sm text-slate-500">{record.studentEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span>
                          {new Date(record.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{record.time}</span>
                      </div>
                    </div>

                    <span className={`rounded-lg px-3 py-2 text-sm font-semibold ${getStatusColor(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </TeacherPageContainer>
    </div>
  );
}
