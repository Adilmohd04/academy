'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Award,
  CheckCircle2,
  Clock3,
  FileWarning,
  GraduationCap,
  LoaderCircle,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';

const API = process.env.NEXT_PUBLIC_API_URL || '';

type Course = { id: string; title: string };
type Student = {
  student_id: string;
  student_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  progress_percentage?: number;
};
type CertificateRequest = {
  id: string;
  course_id?: string;
  student_id?: string;
  courseId?: string;
  studentId?: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  reason: string;
  created_at?: string;
  requestedAt?: string;
  reviewed_at?: string;
  reviewedAt?: string;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  certificate_id?: string | null;
  certificateId?: string | null;
  course?: { title?: string };
  student?: { full_name?: string; email?: string };
  course_title?: string;
  student_name?: string;
  courseTitle?: string;
  studentName?: string;
};

const statusStyles = {
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  processing: 'border-sky-200 bg-sky-50 text-sky-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-800',
};

const requestError = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  return body.error || body.message || 'Something went wrong. Please try again.';
};

const displayStudent = (student: Student) =>
  student.student_name || [student.first_name, student.last_name].filter(Boolean).join(' ') || student.email || 'Student';

export default function TeacherCertificatesPage() {
  const { getToken } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const apiFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  }, [getToken]);

  const loadRequests = useCallback(async () => {
    const response = await apiFetch('/api/teacher/certificate-exception-requests?status=all&page=1&pageSize=50');
    if (!response.ok) throw new Error(await requestError(response));
    const body = await response.json();
    setRequests(body.requests || body.data || []);
  }, [apiFetch]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [courseResponse] = await Promise.all([
        apiFetch('/api/teacher/my-courses'),
        loadRequests(),
      ]);
      if (!courseResponse.ok) throw new Error(await requestError(courseResponse));
      const courseBody = await courseResponse.json();
      setCourses(courseBody.courses || []);
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not load certificate tools.' });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, loadRequests]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!selectedCourseId) {
      setStudents([]);
      setSelectedStudentId('');
      return;
    }

    const loadStudents = async () => {
      setLoadingStudents(true);
      setSelectedStudentId('');
      try {
        const response = await apiFetch(`/api/courses/${selectedCourseId}/enrollments`);
        if (!response.ok) throw new Error(await requestError(response));
        const body = await response.json();
        setStudents(body.students || []);
      } catch (error) {
        setStudents([]);
        setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not load enrolled students.' });
      } finally {
        setLoadingStudents(false);
      }
    };

    void loadStudents();
  }, [apiFetch, selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );
  const selectedStudent = useMemo(
    () => students.find((student) => student.student_id === selectedStudentId),
    [students, selectedStudentId],
  );

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCourseId || !selectedStudentId || reason.trim().length < 8) {
      setNotice({ type: 'error', message: 'Choose a course and student, then add a clear reason (at least 8 characters).' });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const response = await apiFetch(
        `/api/teacher/courses/${selectedCourseId}/students/${selectedStudentId}/certificate-exception-requests`,
        { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) },
      );
      if (!response.ok) throw new Error(await requestError(response));
      const body = await response.json();
      setReason('');
      setNotice({
        type: 'success',
        message: body.alreadyPending
          ? 'There is already a pending request for this student.'
          : 'Request sent to the academy administrator for review.',
      });
      await loadRequests();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof Error ? error.message : 'Could not send the request.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(135deg,_#f8fafc,_#f6fbf8_55%,_#fffaf0)]">
      <TeacherPageContainer className="space-y-6 py-6 lg:py-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#123e42] px-6 py-8 text-white shadow-[0_24px_65px_-32px_rgba(15,45,48,0.72)] sm:px-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-amber-200/20 bg-amber-300/10" />
          <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                <ShieldCheck className="h-3.5 w-3.5" /> Certificate integrity
              </div>
              <h1 className="font-serif text-3xl leading-tight sm:text-4xl">Certificates are earned — exceptions are reviewed.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Certificate issuance stays automatic for eligible learners. Use this review path only when a genuine exception needs an administrator’s approval.
              </p>
            </div>
            <div className="grid grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-center backdrop-blur-sm">
                {(['pending', 'approved', 'rejected'] as const).map((status) => (
                <div key={status} className="min-w-[76px] border-r border-white/10 px-3 last:border-r-0">
                  <p className="text-xl font-semibold">{requests.filter((request) => request.status === status).length}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">{status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {notice ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">
            {notice.message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] sm:p-6">
            <div className="mb-6 flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700"><FileWarning className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Request an exception</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">Tell the administrator why this completion merits a manual review.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={submitRequest}>
              <label className="block text-sm font-semibold text-slate-700">
                Course
                <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)} disabled={loading} className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed">
                  <option value="">Choose one of your courses</option>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Student
                <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={!selectedCourseId || loadingStudents} className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed">
                  <option value="">{loadingStudents ? 'Loading enrolled students…' : 'Choose an enrolled student'}</option>
                  {students.map((student) => <option key={student.student_id} value={student.student_id}>{displayStudent(student)}{student.email ? ` — ${student.email}` : ''}</option>)}
                </select>
              </label>

              {selectedStudent ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-3 text-sm text-emerald-900">
                  <UserRound className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span><strong>{displayStudent(selectedStudent)}</strong>{typeof selectedStudent.progress_percentage === 'number' ? ` · ${selectedStudent.progress_percentage}% course progress` : ''}</span>
                </div>
              ) : null}

              <label className="block text-sm font-semibold text-slate-700">
                Review reason
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={1200} placeholder="For example: documented accessibility interruption, approved transfer credit, or verified completion evidence." className="mt-2 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
              </label>

              <button type="submit" disabled={submitting || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:bg-[#0b615b] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {submitting ? 'Sending for review…' : 'Send exception request'}
              </button>
              <p className="text-center text-xs leading-5 text-slate-400">An approval creates a new, individually verifiable certificate. A rejected request changes nothing.</p>
            </form>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Your review history</h2>
                <p className="mt-1 text-sm text-slate-500">Every decision is retained with its approval state.</p>
              </div>
              <Award className="h-6 w-6 text-amber-500" />
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading certificate requests…</div>
            ) : requests.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                <GraduationCap className="h-9 w-9 text-emerald-500" />
                <h3 className="mt-4 font-semibold text-slate-800">No exception requests yet</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Eligible students receive certificates automatically. This space stays empty unless a manual review is necessary.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{request.student?.full_name || request.studentName || request.student_name || 'Student'} <span className="font-normal text-slate-400">·</span> {request.course?.title || request.courseTitle || request.course_title || 'Course review'}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-500">{request.reason}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[request.status]}`}>
                        {request.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>{request.requestedAt || request.created_at ? `Requested ${new Date(request.requestedAt || request.created_at || '').toLocaleDateString()}` : 'Submitted for review'}</span>
                      {request.status === 'approved' && (request.certificateId || request.certificate_id) ? <span className="text-emerald-700">Certificate issued</span> : null}
                      {request.status === 'rejected' && (request.rejectionReason || request.rejection_reason) ? <span className="text-rose-700">Reason: {request.rejectionReason || request.rejection_reason}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </TeacherPageContainer>
    </div>
  );
}
