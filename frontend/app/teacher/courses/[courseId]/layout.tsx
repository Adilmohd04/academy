'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { 
  BookOpen, Users, FileText, MessageSquare, 
  Bell, Calendar, Settings, BarChart, Home
} from 'lucide-react';

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { getToken } = useAuth();
  const courseId = params.courseId as string;
  
  const [course, setCourse] = useState<any>(null);
  
  useEffect(() => {
    if (courseId) {
      void fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teacher/my-courses/${courseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course || data);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    }
  };
  
  // Check if we're in the builder - if so, skip the sidebar
  if (pathname?.includes('/builder')) {
    return <>{children}</>;
  }

  // Check if we're on the overview page - if so, skip the sidebar
  if (pathname === `/teacher/courses/${courseId}`) {
    return <>{children}</>;
  }

  const navItems = [
    { label: 'Overview', href: `/teacher/courses/${courseId}`, icon: Home },
    { label: 'Content', href: `/teacher/courses/${courseId}/builder?tab=content`, icon: BookOpen },
    { label: 'Students', href: `/teacher/courses/${courseId}/builder?tab=students`, icon: Users },
    { label: 'Submissions', href: `/teacher/courses/${courseId}/builder?tab=submissions`, icon: FileText },
    { label: 'Discussion', href: `/teacher/courses/${courseId}/builder?tab=discussion`, icon: MessageSquare },
    { label: 'Announcements', href: `/teacher/courses/${courseId}/builder?tab=announcements`, icon: Bell },
    { label: 'Schedule', href: `/teacher/courses/${courseId}/builder?tab=schedule`, icon: Calendar },
    { label: 'Analytics', href: `/teacher/courses/${courseId}/dashboard`, icon: BarChart },
    { label: 'Settings', href: `/teacher/courses/${courseId}/builder?tab=settings`, icon: Settings }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Course Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Course Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {course?.title || 'Course'}
              </p>
              <p className="text-xs text-gray-500">Course Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
                           (item.href.includes('?tab=') && pathname?.includes('/builder'));
            
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100 font-normal'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Back to Courses */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => router.push('/teacher/courses')}
            className="w-full px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            ← Back to All Courses
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
