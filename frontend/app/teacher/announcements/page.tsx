'use client';

import React, { useState, useEffect } from 'react';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { AnnouncementCard } from '@/components/ui/AnnouncementCard';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import { Bell, Loader2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  link?: string;
  link_text?: string;
  created_at: string;
  is_active: boolean;
  is_pinned: boolean;
  is_important: boolean;
}

export default function TeacherAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        // Filter active announcements only
        setAnnouncements(data.filter((a: Announcement) => a.is_active));
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeacherPageContainer className="space-y-6">
      <IslamicPageHeader
        title="Announcements"
        subtitle="Updates and news from the administration"
        className="!static"
        breadcrumbs={[
          { label: 'Dashboard', href: '/teacher' },
          { label: 'Announcements' }
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No announcements yet</h3>
          <p className="text-slate-400">Check back later for updates.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              title={announcement.title}
              content={announcement.content}
              date={announcement.created_at}
              isPinned={announcement.is_pinned}
              isImportant={announcement.is_important}
              link={announcement.link}
              linkText={announcement.link_text}
              isAdmin={false}
            />
          ))}
        </div>
      )}
    </TeacherPageContainer>
  );
}
