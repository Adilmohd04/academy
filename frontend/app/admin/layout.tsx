'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { 
  Users, Calendar, Settings, CheckCircle, 
  LayoutDashboard, School, Bell, FileText, BookOpen, ClipboardCheck
} from 'lucide-react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Users Management', href: '/admin/users', icon: Users },
    { label: 'Teacher Management', href: '/admin/teachers', icon: School },
    { label: 'Pending Approvals', href: '/admin/approvals', icon: CheckCircle },
    { label: 'Course Management', href: '/admin/courses/manage', icon: BookOpen },
    { label: 'All Meetings', href: '/admin/all-meetings', icon: Calendar },
    { label: 'Announcements', href: '/admin/announcements', icon: Bell },
    { label: 'Resources', href: '/admin/resources', icon: FileText },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Islamic Sidebar */}
      <IslamicSidebar 
        navItems={navItems}
        userRole="admin"
        userName={user?.fullName || 'Admin'}
        userEmail={user?.primaryEmailAddress?.emailAddress || ''}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {navItems.find(i => i.href === pathname)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                  {user?.firstName?.charAt(0)}
                </div>
                <span className="text-sm font-medium text-slate-700 pr-2">{user?.firstName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
