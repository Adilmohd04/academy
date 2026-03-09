'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/teacher/courses')}
            className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Courses
          </button>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-600">
              Course Builder
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
