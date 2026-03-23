'use client';

import { Award, BookOpen, Download, Eye } from 'lucide-react';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';

export default function TeacherCertificatesPage() {
  return (
    <div className="min-h-full bg-slate-50/40">
      <TeacherPageContainer className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Certificates</h1>
          <p className="mt-1 text-sm text-slate-600">Issue and manage certificates for course completions.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Award className="mx-auto mb-4 h-16 w-16 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">Certificate Management</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            View and manage certificates for students who completed your courses.
            Certificates are generated once all requirements are met.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Auto-generated</span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Downloadable PDF</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>Shareable</span>
            </div>
          </div>
        </section>
      </TeacherPageContainer>
    </div>
  );
}
