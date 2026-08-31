'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';

type PlatformStats = {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  totalRevenue: number;
  pendingApprovals: number;
};

type StatsResponse = {
  stats: PlatformStats;
  pending?: number;
  total_slots?: number;
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/stats', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load the live platform snapshot.');
      }

      setData(payload as StatsResponse);
      setRefreshedAt(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the live platform snapshot.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading && !data) {
    return <LoadingSnapshot />;
  }

  if (!data) {
    return (
      <main className="min-h-[64vh] px-5 py-8 lg:px-8">
        <section className="mx-auto flex max-w-xl flex-col items-center rounded-[2rem] border border-rose-100 bg-white px-6 py-12 text-center shadow-[0_20px_60px_-45px_rgba(15,23,42,0.55)]">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-700"><Activity className="h-6 w-6" /></div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">The platform snapshot is unavailable</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{error || 'Please try again in a moment.'}</p>
          <button
            type="button"
            onClick={() => void loadStats()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#175c4d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-[transform,background-color] duration-200 ease-out hover:bg-[#104b3e] active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </section>
      </main>
    );
  }

  const { stats } = data;
  const insights = [
    stats.pendingApprovals > 0
      ? `${stats.pendingApprovals} course ${stats.pendingApprovals === 1 ? 'is' : 'are'} waiting for an approval decision.`
      : 'The course approval queue is clear.',
    stats.draftCourses > 0
      ? `${stats.draftCourses} course ${stats.draftCourses === 1 ? 'remains' : 'remain'} in draft and can be reviewed with its owner.`
      : 'Every current course is published or already in review.',
    (data.pending || 0) > 0
      ? `${data.pending} paid booking ${data.pending === 1 ? 'box needs' : 'boxes need'} attention.`
      : 'There are no paid booking boxes waiting for approval.',
  ];

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_15%_0%,rgba(201,169,107,0.15),transparent_28%),radial-gradient(circle_at_100%_25%,rgba(17,133,102,0.12),transparent_30%),#f8faf8] px-5 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#173c37] px-6 py-7 text-white shadow-[0_24px_65px_-38px_rgba(15,45,40,0.82)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-amber-100/15 bg-amber-200/10" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                <ShieldCheck className="h-3.5 w-3.5" /> Live academy records
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">A clear view of the academy today.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Operational totals from the protected academy data source — no simulated trends, placeholder charts, or fabricated insights.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-white/60">{refreshedAt ? `Updated ${refreshedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Live snapshot'}</p>
              <button
                type="button"
                onClick={() => void loadStats()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#f3df7a] px-4 py-2.5 text-sm font-semibold text-[#173c37] shadow-lg shadow-amber-950/15 transition-[transform,background-color] duration-200 ease-out hover:bg-[#f8e88e] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Learners" value={stats.totalStudents.toLocaleString()} detail="Student profiles" icon={Users} tone="emerald" />
          <MetricCard label="Published courses" value={stats.publishedCourses.toLocaleString()} detail={`${stats.totalCourses.toLocaleString()} total courses`} icon={GraduationCap} tone="sky" />
          <MetricCard label="Awaiting review" value={stats.pendingApprovals.toLocaleString()} detail="Course approvals" icon={Clock3} tone="amber" />
          <MetricCard label="Collected revenue" value={currency.format(stats.totalRevenue)} detail="Successful payments" icon={CircleDollarSign} tone="violet" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <article className="rounded-[1.75rem] border border-slate-200/85 bg-white p-5 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.5)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Operational reading</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">What needs attention</h2>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><Activity className="h-5 w-5" /></div>
            </div>
            <div className="mt-6 space-y-3">
              {insights.map((insight, index) => (
                <div key={insight} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#175c4d] shadow-sm">{index + 1}</span>
                  <p className="text-sm leading-6 text-slate-650">{insight}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200/85 bg-white p-5 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.5)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Scheduling pulse</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Sessions at a glance</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <SmallMetric label="Available slots" value={(data.total_slots || 0).toLocaleString()} icon={CalendarDays} />
              <SmallMetric label="Paid boxes pending" value={(data.pending || 0).toLocaleString()} icon={Clock3} />
            </div>
            <Link href="/admin/meetings" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#175c4d]/15 bg-[#f3fbf7] px-4 py-3 text-sm font-semibold text-[#175c4d] transition-[transform,background-color,border-color] duration-200 ease-out hover:border-[#175c4d]/30 hover:bg-[#e8f7f0] active:scale-[0.985]">
              Review meetings <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <ActionCard href="/admin/approvals" title="Review course approvals" description="Publish or return submitted courses with a clear decision." icon={BookOpen} />
          <ActionCard href="/admin/courses/manage" title="Manage the catalogue" description="Keep the public course experience accurate and complete." icon={GraduationCap} />
          <ActionCard href="/admin/certificates/requests" title="Review certificate exceptions" description="Approve eligible exceptions with a complete audit trail." icon={ShieldCheck} />
        </section>
      </div>
    </main>
  );
}

function LoadingSnapshot() {
  return (
    <main className="min-h-[64vh] flex items-center justify-center px-5">
      <div className="text-center text-slate-600">
        <div className="mx-auto h-11 w-11 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin" />
        <p className="mt-4 text-sm font-medium">Loading the live platform snapshot…</p>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: 'emerald' | 'sky' | 'amber' | 'violet';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <article className="rounded-[1.5rem] border border-slate-200/85 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.6)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.48)]">
      <div className={`inline-flex rounded-2xl p-3 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function SmallMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <Icon className="h-4 w-4 text-[#175c4d]" />
      <p className="mt-4 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <Link href={href} className="group rounded-[1.5rem] border border-slate-200/85 bg-white p-5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.6)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_24px_50px_-36px_rgba(15,23,42,0.48)] active:scale-[0.99]">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl bg-[#eff8f3] p-3 text-[#175c4d]"><Icon className="h-5 w-5" /></div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-[#175c4d]" />
      </div>
      <h2 className="mt-5 font-semibold text-slate-900">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}
