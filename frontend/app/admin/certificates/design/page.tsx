'use client';

import { useAuth } from '@clerk/nextjs';
import { Layers3, Sparkles } from 'lucide-react';
import { CertificateTemplateDesigner } from '@/features/certificates';

export default function AdminCertificateDesignPage() {
  const { userId } = useAuth();

  return (
    <div className="admin-page-wrap space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(230,225,213,0.95)] bg-[#20342d] p-8 text-white shadow-[0_20px_55px_rgba(18,30,24,0.18)]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(199,169,107,0.32) 0, transparent 30%), radial-gradient(circle at 85% 0%, rgba(255,255,255,0.10) 0, transparent 24%), radial-gradient(circle at 100% 100%, rgba(31,91,75,0.34) 0, transparent 30%)' }} />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-kicker !bg-white/10 !text-white !border-white/10 mb-3">Certificate system</p>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Certificate designer studio</h1>
            <p className="mt-3 max-w-2xl text-white/80 leading-7">Create global and course-level certificate templates with precise placement controls, polished presets, and approval-ready workflows.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <MiniStat label="Studio" value="Live" icon={<Sparkles className="h-4 w-4" />} />
            <MiniStat label="Mode" value="Admin" icon={<Layers3 className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="admin-panel p-4 md:p-6">
        <CertificateTemplateDesigner mode="admin" userId={userId} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
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
