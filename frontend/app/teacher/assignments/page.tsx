'use client';

import Link from 'next/link';
import { ArrowRight, BookOpenCheck, FileText, GraduationCap } from 'lucide-react';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';

/**
 * Assignments are created against a specific lesson, so the supported entry
 * point is the course builder rather than a disconnected global form.
 */
export default function TeacherAssignments() {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#f6fbf8_55%,_#fffaf0)]">
      <TeacherPageContainer className="space-y-6 py-6 lg:py-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#123e42] px-6 py-8 text-white shadow-[0_24px_65px_-32px_rgba(15,45,48,0.72)] sm:px-8">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-amber-200/20 bg-amber-300/10" />
          <div className="relative max-w-2xl">
            <div className="inline-flex rounded-2xl bg-white/10 p-3 text-amber-100"><FileText className="h-6 w-6" /></div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">Build assignments where learning happens.</h1>
            <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
              Assignments belong to a lesson. Open a course, select the lesson, and create or edit the assignment from its authenticated course builder.
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <article className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 w-fit"><BookOpenCheck className="h-5 w-5" /></div>
            <h2 className="mt-5 text-xl font-bold text-slate-900">Choose a course to continue</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              This keeps assignment instructions, due dates, submissions, and grading connected to the exact lesson students are taking.
            </p>
            <Link href="/teacher/courses" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition-[transform,background-color] duration-200 ease-out hover:bg-[#0b615b] active:scale-[0.98]">
              Open my courses <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <aside className="rounded-[1.75rem] border border-amber-100 bg-amber-50/70 p-6">
            <GraduationCap className="h-6 w-6 text-amber-700" />
            <h2 className="mt-4 text-lg font-bold text-slate-900">A clearer teaching flow</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li><strong className="text-slate-900">1.</strong> Select one of your courses.</li>
              <li><strong className="text-slate-900">2.</strong> Open the course builder and choose a lesson.</li>
              <li><strong className="text-slate-900">3.</strong> Create the assignment, then review submissions from the course workspace.</li>
            </ol>
          </aside>
        </section>
      </TeacherPageContainer>
    </div>
  );
}
