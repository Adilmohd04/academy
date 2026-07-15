'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, GraduationCap, Calendar, Clock,
  CheckCircle, ArrowUpRight, BookOpen, Award, Video, Megaphone, Settings, Layers3, DollarSign, ShieldCheck
} from 'lucide-react';

interface Stats {
  totalStudents: number;
  totalTeachers: number;
  pendingMeetings: number;
  totalSlots: number;
}

export default function IslamicDashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    pendingMeetings: 0,
    totalSlots: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      
      // Fetch users for student/teacher counts
      const usersRes = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = await usersRes.json();
      
      const teachers = users?.filter((u: any) => u.role === 'teacher') || [];
      const students = users?.filter((u: any) => u.role === 'student') || [];

      // Fetch pending meetings and slots count
      const statsRes = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();

      setStats({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        pendingMeetings: statsData.pending || 0,
        totalSlots: statsData.total_slots || 0,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-wrap space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(230,225,213,0.95)] bg-[#20342d] p-8 text-white shadow-[0_20px_55px_rgba(18,30,24,0.18)]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(199,169,107,0.32) 0, transparent 30%), radial-gradient(circle at 85% 0%, rgba(255,255,255,0.10) 0, transparent 24%), radial-gradient(circle at 100% 100%, rgba(31,91,75,0.34) 0, transparent 30%)' }} />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-kicker !bg-white/10 !text-white !border-white/10 mb-3">السلام عليكم</p>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">Welcome back, {user?.firstName || 'Admin'}.</h2>
            <p className="mt-3 max-w-2xl text-white/75 leading-7">A calm control surface for the academy: watch activity, route approvals, and jump into every major admin section without losing context.</p>
          </div>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15">
            Open dashboard <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard title="Students" value={loading ? '...' : stats.totalStudents} icon={<Users className="h-6 w-6 text-sky-600" />} tone="Students" progress="75%" />
        <MetricCard title="Teachers" value={loading ? '...' : stats.totalTeachers} icon={<GraduationCap className="h-6 w-6 text-emerald-600" />} tone="Teachers" progress="60%" />
        <MetricCard title="Pending approvals" value={loading ? '...' : stats.pendingMeetings} icon={<CheckCircle className="h-6 w-6 text-amber-600" />} tone="Approvals" progress="30%" />
        <MetricCard title="Time slots" value={loading ? '...' : stats.totalSlots} icon={<Clock className="h-6 w-6 text-violet-600" />} tone="Schedule" progress="85%" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="admin-panel p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="admin-kicker mb-2">Fast access</p>
              <h3 className="admin-section-title">Primary admin actions</h3>
            </div>
            <span className="text-sm text-[#6f7a72]">Everything in one place</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminShortcut href="/admin/users" icon={<Users className="h-5 w-5" />} title="Manage users" description="Review roles and permissions" />
            <AdminShortcut href="/admin/teachers" icon={<GraduationCap className="h-5 w-5" />} title="Teacher management" description="Adjust availability and pricing" />
            <AdminShortcut href="/admin/approvals" icon={<CheckCircle className="h-5 w-5" />} title="Pending approvals" description="Clear the review queue" />
            <AdminShortcut href="/admin/courses/manage" icon={<BookOpen className="h-5 w-5" />} title="Course management" description="Shape published content" />
            <AdminShortcut href="/admin/certificates/design" icon={<Award className="h-5 w-5" />} title="Certificate design" description="Edit templates and branding" />
            <AdminShortcut href="/admin/all-meetings" icon={<Video className="h-5 w-5" />} title="Meetings" description="Monitor scheduled sessions" />
            <AdminShortcut href="/admin/announcements" icon={<Megaphone className="h-5 w-5" />} title="Announcements" description="Broadcast platform updates" />
            <AdminShortcut href="/admin/settings" icon={<Settings className="h-5 w-5" />} title="Settings" description="Tune the platform" />
          </div>
        </div>

        <div className="admin-panel p-6">
          <div className="mb-5">
            <p className="admin-kicker mb-2">Today’s focus</p>
            <h3 className="admin-section-title">Priority areas</h3>
          </div>
          <div className="space-y-3">
            <FocusRow icon={<ShieldCheck className="h-4 w-4" />} title="Approval queue" value={`${stats.pendingMeetings} pending`} />
            <FocusRow icon={<DollarSign className="h-4 w-4" />} title="Revenue watch" value={`₹${stats.totalSlots.toLocaleString()} sessions`} />
            <FocusRow icon={<Layers3 className="h-4 w-4" />} title="Platform assets" value="Announcements, resources, certificates" />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, icon, tone, progress }: { title: string; value: string | number; icon: React.ReactNode; tone: string; progress: string }) {
  return (
    <div className="admin-metric p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <span className="admin-kicker mb-3">{tone}</span>
          <div className="mt-3 p-3 rounded-2xl bg-white border border-[#ebe5d7] shadow-sm w-fit">{icon}</div>
        </div>
        <span className="text-xs font-semibold text-[#7a6130]">{progress}</span>
      </div>
      <p className="text-2xl font-semibold text-[#1f2a24]">{value}</p>
      <p className="text-sm font-medium text-[#5d6a63] mt-1">{title}</p>
    </div>
  )
}

function AdminShortcut({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-[#e6e1d5] bg-white p-4 hover:border-[#1f5b4b]/30 hover:bg-[#fbfaf7]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#f4f1ea] p-2 text-[#1f5b4b] group-hover:bg-[#1f5b4b] group-hover:text-white transition-colors">{icon}</div>
        <div>
          <p className="font-semibold text-[#24322c]">{title}</p>
          <p className="text-sm text-[#6f7a72]">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function FocusRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ebe5d7] bg-[#fbfaf7] p-4">
      <div className="rounded-xl bg-white border border-[#ece7db] p-2 text-[#1f5b4b] shadow-sm">{icon}</div>
      <div className="min-w-0">
        <p className="font-semibold text-[#1f2a24]">{title}</p>
        <p className="text-sm text-[#6f7a72] truncate">{value}</p>
      </div>
    </div>
  )
}
