'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import { Mail, Phone, Users } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

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
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${API}/api/meetings/teacher/assigned`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Unable to load students');
      }
      const data = await response.json();
      // `/teacher/assigned` returns `{ data: [...] }`. Support the old
      // `{ meetings: [...] }` contract while any cached client is updated.
      const meetings = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.meetings)
            ? data.meetings
            : [];

      // Group meetings by student
      const studentMap = new Map<string, Student>();
      meetings.forEach((meeting: any) => {
        const studentId = meeting.student_id;
        if (!studentId) return;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            id: studentId,
            name: meeting.student_name || 'Student',
            email: meeting.student_email || '',
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

      const studentList = Array.from(studentMap.values()).map(student => ({
        ...student,
        attendanceRate: student.totalClasses > 0
          ? Math.round((student.attendedClasses / student.totalClasses) * 100)
          : 0,
      }));

      setStudents(studentList);
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50/40">
      <TeacherPageContainer className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Students</h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage your students across all assigned classes.
          </p>
        </section>

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : students.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900">No Students Yet</h3>
            <p className="mt-1 text-sm text-slate-600">
              Your students will appear here once sessions are assigned.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <article
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{student.name}</h3>
                    <p className="text-xs text-slate-500">{student.totalClasses} classes</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    <span className="truncate">{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 text-emerald-600" />
                      <span>{student.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Attendance</span>
                    <span className="font-semibold text-emerald-700">{student.attendanceRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${student.attendanceRate}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {student.attendedClasses} of {student.totalClasses} classes attended
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}
      </TeacherPageContainer>
    </div>
  );
}
