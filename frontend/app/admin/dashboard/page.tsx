'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { 
  Calendar, Users, DollarSign, CheckCircle, Clock, TrendingUp,
  ArrowUpRight, BookOpen, Award, Settings, Video, Megaphone, GraduationCap, Layers3, ShieldCheck
} from 'lucide-react'
import Card from '@/components/ui/Card'

interface DashboardStats {
  totalCourses: number
  publishedCourses: number
  draftCourses: number
  totalStudents: number
  totalRevenue: number
  pendingApprovals: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#587067]">
          <div className="h-12 w-12 rounded-full border-2 border-[#1f5b4b] border-t-transparent animate-spin" />
          <p className="text-sm font-medium">Loading command center</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page-wrap space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(230,225,213,0.95)] bg-[#1f2f28] text-white p-8 lg:p-10 shadow-[0_20px_55px_rgba(18,30,24,0.18)]">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(199,169,107,0.28) 0, transparent 28%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.12) 0, transparent 24%), radial-gradient(circle at 100% 100%, rgba(31,91,75,0.32) 0, transparent 30%)' }} />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.5fr_1fr] items-end">
          <div>
            <p className="admin-kicker !bg-white/10 !text-white !border-white/15 mb-4">Administrative overview</p>
            <h1 className="text-3xl lg:text-5xl font-semibold tracking-tight leading-tight">Run the academy from one elegant control room.</h1>
            <p className="mt-4 max-w-2xl text-white/78 text-base lg:text-lg leading-7">Track approvals, manage people, review course quality, and keep announcements, meetings, and certificates aligned in a calm premium interface.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/admin/approvals" className="admin-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
                Review approvals <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/courses/manage" className="admin-btn-muted inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-white/10 text-white border border-white/15 hover:bg-white/15">
                Manage courses <BookOpen className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Pending approvals" value={stats.pendingApprovals} icon={<Clock className="h-4 w-4" />} />
            <MiniStat label="Active students" value={stats.totalStudents} icon={<Users className="h-4 w-4" />} />
            <MiniStat label="Published courses" value={stats.publishedCourses} icon={<CheckCircle className="h-4 w-4" />} />
            <MiniStat label="Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <StatsCard title="Total Courses" value={stats.totalCourses} icon={<Calendar className="h-8 w-8 text-[#1f5b4b]" />} trend="+12%" trendUp accent="Courses" />
        <StatsCard title="Published Courses" value={stats.publishedCourses} icon={<CheckCircle className="h-8 w-8 text-emerald-600" />} subtitle={`${stats.draftCourses} drafts`} accent="Publishing" />
        <StatsCard title="Total Students" value={stats.totalStudents} icon={<Users className="h-8 w-8 text-sky-600" />} trend="+8%" trendUp accent="Community" />
        <StatsCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-8 w-8 text-amber-600" />} trend="+15%" trendUp accent="Finance" />
        <StatsCard title="Pending Approvals" value={stats.pendingApprovals} icon={<Clock className="h-8 w-8 text-amber-600" />} subtitle="Requires attention" accent="Review" />
        <StatsCard title="Active Now" value="47" icon={<TrendingUp className="h-8 w-8 text-teal-600" />} subtitle="Users online" accent="Realtime" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="admin-panel p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="admin-kicker mb-2">Operational flow</p>
              <h2 className="admin-section-title">Recent course submissions</h2>
            </div>
            <Link href="/admin/approvals" className="text-sm font-semibold text-[#1f5b4b] hover:underline inline-flex items-center gap-1">
              Open queue <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Advanced Tajweed Course', owner: 'by Teacher Name', status: 'Pending', tone: 'amber' },
              { name: 'Quran Memorization Basics', owner: 'by Teacher Name', status: 'Ready', tone: 'emerald' },
              { name: 'Arabic Grammar Foundations', owner: 'by Teacher Name', status: 'Draft', tone: 'slate' },
              { name: 'Fiqh Essentials', owner: 'by Teacher Name', status: 'Review', tone: 'amber' },
              { name: 'Adab for Young Learners', owner: 'by Teacher Name', status: 'Published', tone: 'emerald' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[#ece7db] bg-[#fbfaf7]">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1f2a24] truncate">{item.name}</p>
                  <p className="text-sm text-[#6f7a72]">{item.owner}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : item.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="admin-panel p-6">
          <div className="mb-5">
            <p className="admin-kicker mb-2">Platform pulse</p>
            <h2 className="admin-section-title">Activity and shortcuts</h2>
          </div>
          <div className="space-y-4">
            <ActivityItem icon={<ShieldCheck className="h-5 w-5 text-[#1f5b4b]" />} title="Course Published" description="Quran Memorization Basics went live" time="5 minutes ago" />
            <ActivityItem icon={<Users className="h-5 w-5 text-sky-600" />} title="New Enrollment" description="15 students enrolled in Arabic Grammar" time="12 minutes ago" />
            <ActivityItem icon={<DollarSign className="h-5 w-5 text-amber-600" />} title="Payment Received" description="₹2,500 from student enrollment" time="1 hour ago" />
          </div>

          <div className="admin-divider my-6" />

          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/admin/users" icon={<Users className="h-4 w-4" />} label="Users" />
            <QuickLink href="/admin/teachers" icon={<GraduationCap className="h-4 w-4" />} label="Teachers" />
            <QuickLink href="/admin/courses/manage" icon={<BookOpen className="h-4 w-4" />} label="Courses" />
            <QuickLink href="/admin/certificates/design" icon={<Award className="h-4 w-4" />} label="Certificates" />
            <QuickLink href="/admin/all-meetings" icon={<Video className="h-4 w-4" />} label="Meetings" />
            <QuickLink href="/admin/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
            <QuickLink href="/admin/announcements" icon={<Megaphone className="h-4 w-4" />} label="Announcements" />
            <QuickLink href="/admin/resources" icon={<Layers3 className="h-4 w-4" />} label="Resources" />
          </div>
        </Card>
      </section>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon,
  trend,
  trendUp,
  subtitle,
  accent,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean
  subtitle?: string
  accent: string
}) {
  return (
    <Card className="admin-metric p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="admin-kicker mb-3">{accent}</span>
          <div className="mt-3 p-3 rounded-2xl bg-white border border-[#ebe5d7] shadow-sm w-fit">
            {icon}
          </div>
        </div>
        {trend && (
          <span className={`text-sm font-semibold ${trendUp ? 'text-emerald-700' : 'text-rose-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-semibold text-[#1f2a24] mb-1">{value}</h3>
      <p className="text-[#5d6a63] font-medium">{title}</p>
      {subtitle && <p className="text-sm text-[#7b857d] mt-1">{subtitle}</p>}
    </Card>
  )
}

function ActivityItem({
  icon,
  title,
  description,
  time
}: {
  icon: React.ReactNode
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl p-3 border border-[#ebe5d7] bg-[#fbfaf7]">
      <div className="p-2.5 bg-white rounded-xl border border-[#ece7db] flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1f2a24]">{title}</p>
        <p className="text-sm text-[#6f7a72] truncate">{description}</p>
        <p className="text-xs text-[#8b948c] mt-1">{time}</p>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-3 text-white/80 mb-3">
        <span className="text-xs uppercase tracking-[0.18em] font-semibold">{label}</span>
        <span className="rounded-full bg-white/10 p-2">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-white truncate">{value}</p>
    </div>
  )
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link href={href} className="group rounded-2xl border border-[#e6e1d5] bg-white p-3 hover:border-[#1f5b4b]/30 hover:bg-[#fbfaf7]">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-[#f4f1ea] p-2 text-[#1f5b4b] group-hover:bg-[#1f5b4b] group-hover:text-white transition-colors">{icon}</div>
        <span className="text-sm font-semibold text-[#24322c]">{label}</span>
      </div>
    </Link>
  )
}
