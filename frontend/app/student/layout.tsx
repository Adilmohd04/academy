import React from 'react';
import { StudentSidebar } from '@/components/ui/StudentSidebar';
import { StudentHeader } from '@/components/ui/StudentHeader';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#FDFBF7] relative overflow-hidden font-sans text-[#1B365D] selection:bg-[#C5A059] selection:text-white">
      {/* Islamic Geometric Pattern Overlay - Ultra Subtle */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C5A059' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Sidebar */}
      <StudentSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen relative z-10">
        <StudentHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent pt-0">
          <div className="max-w-7xl mx-auto p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
