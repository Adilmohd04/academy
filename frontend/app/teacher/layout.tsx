'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { 
  Activity, GraduationCap, BookOpen,
  Calendar, TrendingUp, FileText, Bell, Users, Video, CheckCircle, Award
} from 'lucide-react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  
  // Check if we're on a specific course page (not the courses list)
  const isCoursePage = pathname?.match(/^\/teacher\/courses\/[^/]+/);

  const navItems = [
    { label: 'Dashboard', href: '/teacher', icon: Activity },
    { label: 'Announcements', href: '/teacher/announcements', icon: Bell },
    { label: 'My Classes', href: '/teacher/classes', icon: GraduationCap },
    { label: 'My Courses', href: '/teacher/courses', icon: BookOpen },
    { label: 'Students', href: '/teacher/students', icon: Users },
    { label: 'Meetings', href: '/teacher/meetings', icon: Video },
    { label: 'Interviews', href: '/teacher/interviews', icon: Video },
    { label: 'Attendance', href: '/teacher/attendance', icon: CheckCircle },
    { label: 'Certificates', href: '/teacher/certificates', icon: Award },
    { label: 'Resources', href: '/teacher/resources', icon: FileText },
    { label: 'Availability', href: '/teacher/availability', icon: Calendar },
    { label: 'Analytics', href: '/teacher/analytics', icon: TrendingUp },
  ];

  // If we're on a course detail page, don't show the teacher sidebar
  if (isCoursePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100/60 flex">
      {/* Sidebar */}
      <IslamicSidebar 
        navItems={navItems}
        userRole="teacher"
        userName={user?.fullName || 'Teacher'}
        userEmail={user?.primaryEmailAddress?.emailAddress || ''}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 transition-all duration-300 ease-in-out w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
