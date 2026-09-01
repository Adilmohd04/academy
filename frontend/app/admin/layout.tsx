'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Users, Calendar, Settings, CheckCircle, 
  LayoutDashboard, School, Bell, FileText, BookOpen, Award, Sparkles, ArrowUpRight
} from 'lucide-react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Users Management', href: '/admin/users', icon: Users },
    { label: 'Teacher Management', href: '/admin/teachers', icon: School },
    { label: 'Pending Approvals', href: '/admin/approvals', icon: CheckCircle },
    { label: 'Course Management', href: '/admin/courses/manage', icon: BookOpen },
    { label: 'Certificate Review', href: '/admin/certificates/requests', icon: Award },
    { label: 'Certificate Design', href: '/admin/certificates/design', icon: Award },
    { label: 'All Meetings', href: '/admin/all-meetings', icon: Calendar },
    { label: 'Announcements', href: '/admin/announcements', icon: Bell },
    { label: 'Resources', href: '/admin/resources', icon: FileText },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="admin-premium min-h-screen flex text-[15px]">
      {/* Islamic Sidebar */}
      <IslamicSidebar 
        navItems={navItems}
        userRole="admin"
        userName={user?.fullName || 'Admin'}
        userEmail={user?.primaryEmailAddress?.emailAddress || ''}
      />

      {/* Main Content Wrapper */}
      <div className="admin-main-bg flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b border-[rgba(230,225,213,0.9)] bg-[rgba(248,246,240,0.82)] backdrop-blur-xl">
          <div className="px-5 lg:px-8 py-4 flex items-center justify-end gap-4">
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(199,169,107,0.35)] bg-[rgba(255,248,232,0.9)] text-xs font-semibold text-[#7a6130]">
                <Sparkles className="h-4 w-4" />
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <a href="/admin/approvals" className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-[#1f5b4b] border border-[rgba(31,91,75,0.22)] bg-white px-3 py-1.5 rounded-full hover:bg-[#f7f5f0]">
                Review queue <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <div className="hidden md:flex h-7 w-px bg-[rgba(216,211,199,0.95)]" />
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-[rgba(216,211,199,0.95)] bg-white/85 shadow-sm" suppressHydrationWarning>
                <div className="w-8 h-8 bg-gradient-to-br from-[#1f5b4b] to-[#c7a96b] rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                  {mounted ? user?.firstName?.charAt(0) || 'A' : 'A'}
                </div>
                <span className="text-sm font-medium text-[#33413b] pr-2">{mounted ? (user?.firstName || 'User') : 'User'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content-shell m-4 lg:m-6 overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
