'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  Loader2,
  PencilLine,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface RawCourse {
  id?: string;
  course_id?: string;
  title?: string;
  description?: string | null;
  course_type?: string | null;
  category?: string | null;
  level?: string | null;
  price?: number | string | null;
  is_free?: boolean | null;
  enrollment_cap?: number | null;
  enrollment_limit?: number | null;
  teacher_name?: string | null;
  teacher?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  created_at?: string | null;
  sections_count?: number | null;
  lessons_count?: number | null;
  course_weeks?: Array<{ course_lessons?: unknown[] }> | null;
}

interface PendingCourse {
  id: string;
  title: string;
  description: string;
  courseType: string;
  category: string;
  level: string;
  price: number;
  isFree: boolean;
  enrollmentCap: number | null;
  teacherName: string;
  createdAt: string | null;
  sectionsCount: number;
  lessonsCount: number;
}

function humanize(value?: string | null) {
  if (!value) return 'Not specified';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function readErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object') {
    const value = body as { error?: unknown; message?: unknown };
    if (typeof value.error === 'string' && value.error) return value.error;
    if (typeof value.message === 'string' && value.message) return value.message;
  }
  return fallback;
}

function formatPrice(value: number) {
  if (value <= 0) return 'Complimentary';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Date not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not available';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function normalizeCourse(raw: RawCourse): PendingCourse | null {
  const id = raw.id || raw.course_id;
  if (!id) return null;

  const priceValue = Number(raw.price ?? 0);
  const price = Number.isFinite(priceValue) ? priceValue : 0;
  const teacherName = raw.teacher_name
    || raw.teacher?.full_name
    || [raw.teacher?.first_name, raw.teacher?.last_name].filter(Boolean).join(' ')
    || raw.teacher?.email
    || 'Teacher not assigned';
  const weeks = Array.isArray(raw.course_weeks) ? raw.course_weeks : [];
  const derivedLessons = weeks.reduce((total, week) => total + (Array.isArray(week.course_lessons) ? week.course_lessons.length : 0), 0);

  return {
    id,
    title: raw.title || 'Untitled course',
    description: raw.description || 'No course description has been provided.',
    courseType: humanize(raw.course_type),
    category: raw.category || 'Uncategorised',
    level: humanize(raw.level),
    price,
    isFree: raw.is_free === true || price <= 0,
    enrollmentCap: raw.enrollment_limit ?? raw.enrollment_cap ?? null,
    teacherName,
    createdAt: raw.created_at || null,
    sectionsCount: raw.sections_count ?? weeks.length,
    lessonsCount: raw.lessons_count ?? derivedLessons,
  };
}

export default function PendingCoursesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [courses, setCourses] = useState<PendingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<PendingCourse | null>(null);
  const [overridePrice, setOverridePrice] = useState<number>(0);
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | null>(null);

  const loadPendingCourses = useCallback(async () => {
    if (!isLoaded) return;

    setLoading(true);
    setRequestError(null);

    try {
      if (!isSignedIn) {
        throw new Error('Your session has expired. Please sign in again to review courses.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('We could not verify your administrator session. Please sign in again and retry.');
      }

      const response = await fetch(API_URL + '/api/admin/courses/pending', {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(readErrorMessage(data, 'Failed to load pending course approvals.'));
      }

      const rawCourses = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
      setCourses(rawCourses.map(normalizeCourse).filter((course): course is PendingCourse => Boolean(course)));
    } catch (error) {
      console.error('Failed to load pending courses:', error);
      setCourses([]);
      setRequestError(error instanceof Error ? error.message : 'Failed to load pending course approvals.');
    } finally {
      setLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadPendingCourses();
  }, [loadPendingCourses]);

  const closeModal = () => {
    setSelectedCourse(null);
    setShowPriceOverride(false);
    setShowRejectForm(false);
    setRejectReason('');
  };

  const openApproval = (course: PendingCourse) => {
    setSelectedCourse(course);
    setOverridePrice(course.price);
    setShowPriceOverride(true);
    setShowRejectForm(false);
    setNotice(null);
  };

  const openRejection = (course: PendingCourse) => {
    setSelectedCourse(course);
    setRejectReason('');
    setShowRejectForm(true);
    setShowPriceOverride(false);
    setNotice(null);
  };

  const handleApproveCourse = async () => {
    if (!selectedCourse || activeAction) return;

    setActiveAction('approve');
    setRequestError(null);
    setNotice(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('We could not verify your administrator session. Please sign in again and retry.');
      if (!Number.isFinite(overridePrice) || overridePrice < 0) {
        throw new Error('Enter a valid course price of zero or more.');
      }

      if (overridePrice !== selectedCourse.price) {
        const priceResponse = await fetch(API_URL + '/api/admin/courses/' + selectedCourse.id + '/price', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ price: overridePrice }),
        });
        const priceBody = await priceResponse.json().catch(() => ({}));

        if (!priceResponse.ok) {
          throw new Error(readErrorMessage(priceBody, 'The course price could not be updated.'));
        }
      }

      const response = await fetch(API_URL + '/api/admin/courses/' + selectedCourse.id + '/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(readErrorMessage(body, 'The course could not be approved.'));
      }

      closeModal();
      setNotice('Course approved and published successfully.');
      await loadPendingCourses();
    } catch (error) {
      console.error('Failed to approve course:', error);
      setRequestError(error instanceof Error ? error.message : 'The course could not be approved.');
    } finally {
      setActiveAction(null);
    }
  };

  const handleRejectCourse = async () => {
    if (!selectedCourse || activeAction) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRequestError('Please provide a clear reason before rejecting this course.');
      return;
    }

    setActiveAction('reject');
    setRequestError(null);
    setNotice(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('We could not verify your administrator session. Please sign in again and retry.');

      const response = await fetch(API_URL + '/api/admin/courses/' + selectedCourse.id + '/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(readErrorMessage(body, 'The course could not be rejected.'));
      }

      closeModal();
      setNotice('Course rejected. The teacher will be able to revise it.');
      await loadPendingCourses();
    } catch (error) {
      console.error('Failed to reject course:', error);
      setRequestError(error instanceof Error ? error.message : 'The course could not be rejected.');
    } finally {
      setActiveAction(null);
    }
  };

  if (loading || !isLoaded) {
    return <PendingCoursesLoading />;
  }

  return (
    <main className="admin-page-wrap space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/10 bg-[radial-gradient(circle_at_82%_18%,rgba(251,191,36,0.26),transparent_24%),radial-gradient(circle_at_12%_100%,rgba(16,185,129,0.24),transparent_30%),linear-gradient(135deg,#10283b_0%,#164e63_100%)] px-6 py-7 text-white shadow-[0_22px_65px_rgba(15,35,52,0.18)] sm:px-8 sm:py-9">
        <div className="absolute -right-12 -top-10 h-48 w-48 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-100/80">Quality review</p>
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Course approvals</h1>
            <p className="mt-3 text-sm leading-6 text-slate-100/85 sm:text-base">
              Review each teaching experience before it becomes visible to families and learners.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Awaiting a decision</p>
            <p className="mt-1 text-3xl font-black">{courses.length}</p>
          </div>
        </div>
      </section>

      {requestError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {requestError}
          </span>
          <button
            type="button"
            onClick={() => void loadPendingCourses()}
            className="inline-flex items-center gap-2 self-start rounded-lg px-2 py-1 font-bold text-rose-800 transition-colors duration-200 ease-out hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-100 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_14px_44px_rgba(15,23,42,0.06)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Ready for your review</h2>
            <p className="mt-1 text-sm text-slate-600">Approve only when the details, structure, and price are ready to publish.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadPendingCourses()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>

        {courses.length === 0 ? (
          <div className="mx-auto max-w-lg py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-5 text-xl font-extrabold text-slate-950">Nothing needs approval right now</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">New submissions will appear here as soon as teachers send them for review.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {courses.map((course) => (
              <article key={course.id} className="rounded-2xl border border-slate-200 bg-slate-50/65 p-5 transition-colors duration-200 ease-out hover:border-emerald-200 hover:bg-emerald-50/35 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">Pending</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{course.courseType}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{course.category}</span>
                    </div>
                    <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">{course.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{course.description}</p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoTile label="Teacher" value={course.teacherName} icon={Users} />
                      <InfoTile label="Price" value={course.isFree ? 'Complimentary' : formatPrice(course.price)} icon={PencilLine} />
                      <InfoTile label="Level" value={course.level} icon={BookOpen} />
                      <InfoTile label="Places" value={course.enrollmentCap ? String(course.enrollmentCap) : 'Open'} icon={Users} />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{course.sectionsCount} module{course.sectionsCount === 1 ? '' : 's'}</span>
                      <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />{course.lessonsCount} lesson{course.lessonsCount === 1 ? '' : 's'}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />Submitted {formatDate(course.createdAt)}</span>
                    </div>
                  </div>

                  <div className="grid shrink-0 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => openApproval(course)}
                      disabled={activeAction !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors duration-200 ease-out hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-emerald-100 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => openRejection(course)}
                      disabled={activeAction !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors duration-200 ease-out hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-rose-100 active:scale-[0.98]"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowPriceOverride(false);
                        setShowRejectForm(false);
                      }}
                      disabled={activeAction !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]"
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      Details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedCourse && !showPriceOverride && !showRejectForm ? (
        <Dialog title="Course details" onClose={closeModal}>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Course</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-950">{selectedCourse.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedCourse.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailTile label="Teacher" value={selectedCourse.teacherName} />
              <DetailTile label="Price" value={selectedCourse.isFree ? 'Complimentary' : formatPrice(selectedCourse.price)} />
              <DetailTile label="Category" value={selectedCourse.category} />
              <DetailTile label="Level" value={selectedCourse.level} />
              <DetailTile label="Learning format" value={selectedCourse.courseType} />
              <DetailTile label="Enrolment" value={selectedCourse.enrollmentCap ? String(selectedCourse.enrollmentCap) + ' places' : 'Open enrolment'} />
            </div>
          </div>
          <div className="mt-7 flex justify-end">
            <button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]">Close</button>
          </div>
        </Dialog>
      ) : null}

      {showPriceOverride && selectedCourse ? (
        <Dialog title="Approve course" onClose={activeAction ? undefined : closeModal}>
          <p className="text-sm leading-6 text-slate-600">Confirm the listing price before publishing <strong className="font-bold text-slate-900">{selectedCourse.title}</strong>.</p>
          <label className="mt-6 block">
            <span className="text-sm font-bold text-slate-700">Listing price</span>
            <input
              type="number"
              value={overridePrice}
              onChange={(event) => setOverridePrice(Number(event.target.value))}
              min="0"
              step="1"
              disabled={activeAction !== null}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">The original price is {formatPrice(selectedCourse.price)}. A changed price is saved before this course is published.</p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModal} disabled={activeAction !== null} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]">Cancel</button>
            <button type="button" onClick={() => void handleApproveCourse()} disabled={activeAction !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-emerald-100 active:scale-[0.98]">
              {activeAction === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {activeAction === 'approve' ? 'Publishing…' : 'Approve and publish'}
            </button>
          </div>
        </Dialog>
      ) : null}

      {showRejectForm && selectedCourse ? (
        <Dialog title="Reject course" onClose={activeAction ? undefined : closeModal}>
          <p className="text-sm leading-6 text-slate-600">Give the teacher a clear, actionable reason so they know what to revise before submitting again.</p>
          <label className="mt-6 block">
            <span className="text-sm font-bold text-slate-700">Reason for rejection</span>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={5}
              disabled={activeAction !== null}
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              placeholder="For example: Please add a clear weekly outline and set the intended learner level."
            />
          </label>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeModal} disabled={activeAction !== null} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]">Cancel</button>
            <button type="button" onClick={() => void handleRejectCourse()} disabled={activeAction !== null} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-4 focus:ring-rose-100 active:scale-[0.98]">
              {activeAction === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
              {activeAction === 'reject' ? 'Rejecting…' : 'Reject course'}
            </button>
          </div>
        </Dialog>
      ) : null}
    </main>
  );
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BookOpen }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-extrabold text-slate-800" title={value}>{value}</p>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose?: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-xl rounded-[1.5rem] bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:p-7">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Course approval</p>
            <h2 className="mt-2 font-serif text-3xl text-slate-950">{title}</h2>
          </div>
          {onClose ? (
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition-colors duration-200 ease-out hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]" aria-label="Close dialog">
              <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function PendingCoursesLoading() {
  return (
    <main className="admin-page-wrap space-y-6">
      <section className="rounded-[2rem] bg-[#10283b] px-6 py-8 sm:px-8">
        <div className="h-4 w-32 animate-pulse rounded-full bg-white/15" />
        <div className="mt-4 h-12 w-72 max-w-full animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-4 h-5 w-[28rem] max-w-full animate-pulse rounded-full bg-white/10" />
      </section>
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
        {[0, 1, 2].map((item) => (
          <div key={item} className="mb-4 h-56 animate-pulse rounded-2xl bg-slate-100 last:mb-0" />
        ))}
      </section>
    </main>
  );
}
