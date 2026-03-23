'use client';

import { useState } from 'react';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import { BookOpen, FileText, Plus } from 'lucide-react';

export default function TeacherAssignments() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-full bg-slate-50/40">
      <TeacherPageContainer className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage assignments for your students.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <FileText className="h-8 w-8 text-emerald-700" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Assignment Management</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Create, distribute, and track assignments for your students. This feature is coming soon.
          </p>
          <button
            onClick={() => alert('Assignment creation feature coming soon!')}
            disabled={loading}
            className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Create New Assignment
          </button>
        </section>

        <section className="grid gap-4 opacity-50 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <article key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-200" />
                <div className="space-y-2 pt-3">
                  <div className="h-2 rounded bg-slate-200" />
                  <div className="h-2 w-5/6 rounded bg-slate-200" />
                </div>
              </div>
            </article>
          ))}
        </section>
      </TeacherPageContainer>
    </div>
  );
}
