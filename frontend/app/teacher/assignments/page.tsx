'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { IslamicSidebar } from '@/components/ui/IslamicSidebar';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicPatternBackground } from '@/components/ui/IslamicPatterns';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { 
  Activity, GraduationCap, Users, Video, BookOpen, 
  CheckCircle, Calendar, TrendingUp, Plus, FileText
} from 'lucide-react';

export default function TeacherAssignments() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/teacher', icon: Activity },
    { label: 'My Classes', href: '/teacher/classes', icon: GraduationCap },
    { label: 'Students', href: '/teacher/students', icon: Users },
    { label: 'Meetings', href: '/teacher/meetings', icon: Video },
    { label: 'Assignments', href: '/teacher/assignments', icon: BookOpen },
    { label: 'Attendance', href: '/teacher/attendance', icon: CheckCircle },
    { label: 'Availability', href: '/teacher/availability', icon: Calendar },
    { label: 'Analytics', href: '/teacher/analytics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <IslamicPatternBackground>{null}</IslamicPatternBackground>
      
      <main className="min-h-screen">
        <IslamicPageHeader
          title="Assignments"
          subtitle="Create and manage assignments for your students"
          icon={BookOpen}
        />

        <div className="p-6 space-y-6">
          <IslamicCard>
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-6">
                <FileText className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">Assignment Management</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create, distribute, and track assignments for your students. This feature is coming soon!
              </p>
              <IslamicButton
                variant="primary"
                icon={Plus}
                onClick={() => alert('Assignment creation feature coming soon!')}
              >
                Create New Assignment
              </IslamicButton>
            </div>
          </IslamicCard>

          {/* Placeholder for future assignments list */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
            {[1, 2, 3].map((i) => (
              <IslamicCard key={i}>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="space-y-2 pt-3">
                    <div className="h-2 bg-gray-200 rounded"></div>
                    <div className="h-2 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </IslamicCard>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
