'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { AnnouncementCard } from '@/components/ui/AnnouncementCard';

interface Announcement {
  id: string;
  title: string;
  content: string;
  link?: string;
  link_text?: string;
  created_at: string;
  is_active: boolean;
  is_pinned?: boolean;
  is_important?: boolean;
}

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch('/api/announcements');
        if (res.ok) {
          const data: Announcement[] = await res.json();
          
          // Sort: Pinned first, then by date descending
          const sortedData = data.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          setAnnouncements(sortedData);

          // Update last viewed timestamp for notification logic
          if (sortedData.length > 0) {
            // Find the most recent announcement date
            const mostRecent = sortedData.reduce((prev, current) => {
              return (new Date(prev.created_at) > new Date(current.created_at)) ? prev : current
            });
            localStorage.setItem('lastViewedAnnouncement', mostRecent.created_at);
            // Dispatch a custom event so the header can update immediately
            window.dispatchEvent(new Event('announcementsViewed'));
          }
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-serif text-[#1B365D] font-bold mb-3">Announcements</h1>
          <p className="text-[#64748B] text-lg">Stay updated with the latest news and events from the Academy.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#C5A059] animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-20 h-20 bg-[#F0F4F8] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Bell className="w-10 h-10 text-[#1B365D]/40" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#1B365D] mb-2">No Announcements Yet</h3>
              <p className="text-[#64748B] max-w-sm mx-auto">
                We&apos;ll post updates about new courses, schedules, and events here. Check back soon!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {announcements.map((announcement, index) => (
              <AnnouncementCard
                key={announcement.id}
                id={announcement.id}
                title={announcement.title}
                content={announcement.content}
                date={announcement.created_at}
                isPinned={announcement.is_pinned}
                isImportant={announcement.is_important}
                link={announcement.link}
                linkText={announcement.link_text}
                index={index}
                // Logic for "New" badge: created within last 3 days
                isNew={new Date(announcement.created_at).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
