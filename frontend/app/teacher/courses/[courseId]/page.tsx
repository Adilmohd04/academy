'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  GraduationCap,
  Layers3,
  RefreshCw,
  Settings2,
  Users,
  Video,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface CourseLesson {
  id: string;
  title?: string;
  content_type?: string;
  is_published?: boolean;
}

interface CourseWeek {
  id: string;
  title?: string;
  week_number?: number;
  order_index?: number;
  course_lessons?: CourseLesson[];
}

interface LiveSession {
  id: string;
  title?: string;
  scheduled_at?: string;
  status?: string;
  duration_minutes?: number;
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  syllabus?: string | null;
  category?: string | null;
  level?: string | null;
  price?: number | string | null;
  status?: string | null;
  approval_status?: string | null;
  is_published?: boolean | null;
  course_image_url?: string | null;
  thumbnail_url?: string | null;
  duration_weeks?: number | null;
  enrollment_limit?: number | null;
  capacity?: number | null;
  enrolled_count?: number | null;
  student_count?: number | null;
  enrollments?: Array<{ count?: number }>;
  course_type?: string | null;
}

interface CourseDetailsResponse {
  course?: Course;
  weeks?: CourseWeek[];
  sessions?: LiveSession[];
  access_settings?: {
    is_public?: boolean;
    requires_approval?: boolean;
  } | null;
}

function humanize(value?: string | null) {
  if (!value) return 'Not set';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string) {
  if (!value) return 'To be scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be scheduled';

  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatPrice(value?: number | string | null) {
  const price = Number(value ?? 0);
  if (!Number.isFinite(price) || price <= 0) return 'Complimentary';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

function getCourseStatus(course: Course) {
  if (course.is_published || course.status === 'published') return 'Published';
  return humanize(course.status || course.approval_status || 'draft');
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('published') || normalized.includes('approved')) {
    return 'border-emerald-200/70 bg-emerald-400/15 text-emerald-50';
  }
  if (normalized.includes('reject')) {
    return 'border-rose-200/50 bg-rose-400/15 text-rose-50';
  }
  if (normalized.includes('pending')) {
    return 'border-amber-200/60 bg-amber-300/15 text-amber-50';
  }
  return 'border-white/20 bg-white/10 text-white/90';
}

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const courseId = params.courseId as string;

  const [details, setDetails] = useState<CourseDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!courseId || !isLoaded) return;

    setLoading(true);
    setError(null);

    try {
      if (!isSignedIn) {
        throw new Error('Your session has expired. Please sign in again to manage this course.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('We could not verify your session. Please sign in again and retry.');
      }

      const response = await fetch(API_URL + '/api/teacher/my-courses/' + courseId, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'We could not load this course.');
      }

      const payload = await response.json();
      const course = payload.course || payload.data || payload;

      if (!course?.id) {
        throw new Error('The course record was incomplete. Please try again.');
      }

      setDetails({
        ...payload,
        course,
        weeks: Array.isArray(payload.weeks) ? payload.weeks : [],
        sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
      });
    } catch (caught) {
      console.error('Failed to load teacher course overview:', caught);
      setDetails(null);
      setError(caught instanceof Error ? caught.message : 'We could not load this course.');
    } finally {
      setLoading(false);
    }
  }, [courseId, getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const overview = useMemo(() => {
    const course = details?.course;
    const weeks = [...(details?.weeks || [])].sort(
      (left, right) => (left.order_index ?? left.week_number ?? 0) - (right.order_index ?? right.week_number ?? 0),
    );
    const sessions = details?.sessions || [];
    const lessons = weeks.flatMap((week) => week.course_lessons || []);
    const publishedLessons = lessons.filter((lesson) => lesson.is_published).length;
    const assessmentCount = lessons.filter((lesson) => ['quiz', 'assignment', 'exam'].includes(String(lesson.content_type).toLowerCase())).length;
    const learnerCount = course?.enrolled_count
      ?? course?.student_count
      ?? course?.enrollments?.[0]?.count
      ?? null;
    const upcomingSession = [...sessions]
      .filter((session) => {
        if (!session.scheduled_at) return false;
        return new Date(session.scheduled_at).getTime() >= Date.now()
          && !['cancelled', 'completed'].includes(String(session.status).toLowerCase());
      })
      .sort((left, right) => new Date(left.scheduled_at || 0).getTime() - new Date(right.scheduled_at || 0).getTime())[0];

    return {
      course,
      weeks,
      sessions,
      lessons,
      publishedLessons,
      assessmentCount,
      learnerCount,
      upcomingSession,
    };
  }, [details]);

  if (loading || !isLoaded) return <CourseOverviewLoading />;

  if (error || !overview.course) {
    return (
      <main className="min-h-screen bg-[#f7f7f3] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[72vh] max-w-xl items-center">
          <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <CircleAlert className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-rose-700">Course workspace</p>
            <h1 className="mt-2 font-serif text-3xl text-slate-950">This course could not be opened</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
              {error || 'The course no longer exists or you do not have access to it.'}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadCourse()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 active:scale-[0.98]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => router.push('/teacher/courses')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All courses
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { course, weeks, sessions, lessons, publishedLessons, assessmentCount, learnerCount, upcomingSession } = overview;
  const status = getCourseStatus(course);
  const courseImage = course.course_image_url || course.thumbnail_url;
  const capacity = course.enrollment_limit ?? course.capacity;
  const builderPath = '/teacher/courses/' + courseId + '/builder';
  const liveClassesPath = '/teacher/courses/' + courseId + '/live-classes';
  const studentsPath = '/teacher/courses/' + courseId + '/students';

  const metricCards = [
    {
      label: 'Modules',
      value: String(weeks.length),
      detail: weeks.length === 1 ? 'one learning module' : 'learning modules',
      icon: Layers3,
      tone: 'bg-violet-50 text-violet-700 ring-violet-100',
    },
    {
      label: 'Learning items',
      value: String(lessons.length),
      detail: String(assessmentCount) + ' assessment' + (assessmentCount === 1 ? '' : 's') + ' included',
      icon: BookOpen,
      tone: 'bg-sky-50 text-sky-700 ring-sky-100',
    },
    {
      label: 'Live sessions',
      value: String(sessions.length),
      detail: upcomingSession ? 'next one is scheduled' : 'none scheduled yet',
      icon: Video,
      tone: 'bg-amber-50 text-amber-700 ring-amber-100',
    },
    {
      label: 'Learners',
      value: learnerCount === null ? '—' : String(learnerCount),
      detail: learnerCount === null ? 'open student workspace' : 'currently enrolled',
      icon: Users,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f7f3] text-slate-900">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-emerald-100/45 blur-3xl" />
        <div className="absolute -right-40 top-52 h-[30rem] w-[30rem] rounded-full bg-amber-100/45 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <button
          type="button"
          onClick={() => router.push('/teacher/courses')}
          className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-slate-600 transition-colors duration-200 ease-out hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-200 active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to my courses
        </button>

        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/10 bg-[#0b2438] px-6 py-7 text-white shadow-[0_28px_80px_rgba(12,34,54,0.24)] sm:px-8 sm:py-9 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_83%_20%,rgba(237,203,87,0.28),transparent_26%),radial-gradient(circle_at_10%_100%,rgba(16,185,129,0.28),transparent_30%)]" aria-hidden="true" />
          <div className="absolute -right-12 -top-14 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute right-24 top-8 h-36 w-36 rounded-full border border-white/10" aria-hidden="true" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ' + getStatusTone(status)}>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {status}
                </span>
                {course.category ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm">
                    {course.category}
                  </span>
                ) : null}
                {course.level ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm">
                    {humanize(course.level)}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 max-w-4xl font-serif text-4xl leading-[0.98] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">
                {course.description || 'Shape a thoughtful learning experience, manage its content, and stay close to every learner.'}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => router.push(builderPath)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2df63] px-4 py-3 text-sm font-extrabold text-[#173247] shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition-colors duration-200 ease-out hover:bg-[#f7e975] focus:outline-none focus:ring-4 focus:ring-[#f2df63]/30 active:scale-[0.98]"
                >
                  <Settings2 className="h-4 w-4" aria-hidden="true" />
                  Open course builder
                </button>
                <button
                  type="button"
                  onClick={() => router.push(liveClassesPath)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors duration-200 ease-out hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/15 active:scale-[0.98]"
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Plan live sessions
                </button>
              </div>
            </div>

            <div className="relative min-h-52 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-sm">
              {courseImage ? (
                <img
                  src={courseImage}
                  alt=""
                  className="h-full min-h-52 w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <div className={'absolute inset-0 ' + (courseImage
                ? 'bg-gradient-to-t from-[#0b2438]/75 via-transparent'
                : 'bg-[radial-gradient(circle_at_25%_20%,rgba(242,223,99,0.88),transparent_0_16%),radial-gradient(circle_at_78%_74%,rgba(52,211,153,0.68),transparent_0_23%),linear-gradient(135deg,#173247_0%,#0c5561_100%)]')} />
              {!courseImage ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-sm">
                    <GraduationCap className="h-12 w-12" aria-hidden="true" />
                  </div>
                </div>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">Teaching space</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatPrice(course.price)}</p>
                </div>
                <span className="rounded-full border border-white/20 bg-slate-950/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                  {course.duration_weeks ? String(course.duration_weeks) + ' weeks' : humanize(course.course_type || 'Self paced')}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            return (
              <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{metric.value}</p>
                  </div>
                  <div className={'rounded-xl p-2.5 ring-1 ' + metric.tone}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">{metric.detail}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <div className="space-y-6">
            <article className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)] sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Course rhythm</p>
                  <h2 className="mt-2 font-serif text-3xl tracking-[-0.025em] text-slate-950">Curriculum at a glance</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Keep the structure clear before learners arrive. Every module is one step in the student journey.</p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(builderPath + '?tab=content')}
                  className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 transition-colors duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]"
                >
                  Edit curriculum
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {weeks.length === 0 ? (
                <div className="mt-7 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 sm:p-7">
                  <BookOpen className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-slate-900">Your curriculum is ready for its first chapter</h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">Add a module, then fill it with lessons, activities, and the resources learners will need.</p>
                  <button
                    type="button"
                    onClick={() => router.push(builderPath + '?tab=content')}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 active:scale-[0.98]"
                  >
                    Start building
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="mt-7 space-y-3">
                  {weeks.slice(0, 4).map((week, index) => {
                    const weekLessons = week.course_lessons || [];
                    const weekAssessments = weekLessons.filter((lesson) => ['quiz', 'assignment', 'exam'].includes(String(lesson.content_type).toLowerCase())).length;
                    return (
                      <div key={week.id} className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:items-center sm:p-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#173247] text-sm font-extrabold text-[#f2df63]">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-extrabold text-slate-900">{week.title || 'Module ' + String(week.week_number || index + 1)}</h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {String(weekLessons.length) + ' lesson' + (weekLessons.length === 1 ? '' : 's')}
                            {weekAssessments ? ' · ' + String(weekAssessments) + ' assessment' + (weekAssessments === 1 ? '' : 's') : ''}
                          </p>
                        </div>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs font-bold text-slate-700">{String(weekLessons.filter((lesson) => lesson.is_published).length) + '/' + String(weekLessons.length)}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">published</p>
                        </div>
                      </div>
                    );
                  })}
                  {weeks.length > 4 ? <p className="pt-1 text-center text-xs font-medium text-slate-500">+ {weeks.length - 4} more modules in the builder</p> : null}
                </div>
              )}
            </article>

            <article className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)] sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Course overview</p>
                  <h2 className="mt-2 font-serif text-3xl tracking-[-0.025em] text-slate-950">The learning promise</h2>
                </div>
                <FileText className="h-6 w-6 text-sky-600" aria-hidden="true" />
              </div>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
                {course.syllabus || course.description || 'Add a course overview to help parents and learners understand the journey ahead.'}
              </p>
            </article>
          </div>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[1.75rem] border border-[#dce6dc] bg-[#edf6ef] shadow-[0_14px_44px_rgba(15,23,42,0.05)]">
              <div className="border-b border-emerald-950/10 px-6 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">Teaching controls</p>
                <h2 className="mt-2 font-serif text-2xl text-[#173247]">Keep the course moving</h2>
              </div>
              <div className="space-y-2 p-3">
                <OverviewAction icon={BookOpen} title="Course builder" description="Lessons, activities, access, and publishing" onClick={() => router.push(builderPath)} />
                <OverviewAction icon={Video} title="Live classroom" description="Schedule and run real-time sessions" onClick={() => router.push(liveClassesPath)} />
                <OverviewAction icon={Users} title="Students" description="See progress, grades, and enrolment" onClick={() => router.push(studentsPath)} />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Next live moment</p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-950">{upcomingSession?.title || 'Nothing is scheduled yet'}</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {upcomingSession
                  ? formatDate(upcomingSession.scheduled_at) + (upcomingSession.duration_minutes ? ' · ' + String(upcomingSession.duration_minutes) + ' minutes' : '')
                  : 'Create a session when your learners would benefit from a live check-in, Q&A, or lesson.'}
              </p>
              <button
                type="button"
                onClick={() => router.push(liveClassesPath)}
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#0a6b5d] transition-colors duration-200 ease-out hover:text-[#064f46] focus:outline-none focus:ring-4 focus:ring-emerald-100 active:scale-[0.98]"
              >
                {upcomingSession ? 'Manage session' : 'Schedule a live class'}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Course details</p>
              <dl className="mt-5 divide-y divide-slate-100">
                <DetailRow label="Learning format" value={humanize(course.course_type || 'Self paced')} />
                <DetailRow label="Duration" value={course.duration_weeks ? String(course.duration_weeks) + ' weeks' : 'Flexible'} />
                <DetailRow label="Places" value={capacity ? String(learnerCount ?? 0) + ' of ' + String(capacity) : 'Open enrolment'} />
                <DetailRow label="Access" value={details?.access_settings?.is_public === false ? 'Private course' : 'Visible to students'} />
                <DetailRow label="Published lessons" value={String(publishedLessons) + ' of ' + String(lessons.length)} />
              </dl>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function OverviewAction({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-200 ease-out hover:bg-white/85 focus:outline-none focus:ring-4 focus:ring-emerald-100 active:scale-[0.99]"
    >
      <span className="rounded-xl bg-white p-2.5 text-[#173247] shadow-sm ring-1 ring-emerald-950/5">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-slate-900">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-600">{description}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-800/70 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-bold text-slate-800">{value}</dd>
    </div>
  );
}

function CourseOverviewLoading() {
  return (
    <main className="min-h-screen bg-[#f7f7f3] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 h-7 w-36 animate-pulse rounded-full bg-slate-200" />
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b2438] p-7 shadow-[0_28px_80px_rgba(12,34,54,0.2)] sm:p-9">
          <div className="absolute -right-8 -top-8 h-56 w-56 rounded-full bg-white/5" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="space-y-4">
              <div className="h-7 w-40 animate-pulse rounded-full bg-white/10" />
              <div className="h-14 max-w-2xl animate-pulse rounded-2xl bg-white/10" />
              <div className="h-5 max-w-xl animate-pulse rounded-full bg-white/10" />
              <div className="flex gap-3 pt-2">
                <div className="h-11 w-44 animate-pulse rounded-xl bg-white/10" />
                <div className="h-11 w-40 animate-pulse rounded-xl bg-white/10" />
              </div>
            </div>
            <div className="min-h-52 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </section>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-white shadow-sm" />)}
        </div>
      </div>
    </main>
  );
}
