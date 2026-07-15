'use client';

import React, { useState, useEffect } from 'react';
import { IslamicPageHeader } from '@/components/ui/IslamicPageHeader';
import { IslamicCard } from '@/components/ui/IslamicCards';
import { IslamicButton } from '@/components/ui/IslamicButtons';
import { AnnouncementCard } from '@/components/ui/AnnouncementCard';
import { Bell, Trash2, Plus, Calendar, Loader2, Pin, AlertCircle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

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

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link: '',
    link_text: '',
    is_pinned: false,
    is_important: false
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      link: '',
      link_text: '',
      is_pinned: false,
      is_important: false
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      link: announcement.link || '',
      link_text: announcement.link_text || '',
      is_pinned: announcement.is_pinned,
      is_important: announcement.is_important
    });
    setEditingId(announcement.id);
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSubmitting(true);
    try {
      // Use query parameter for ID in PUT request to match API route
      const url = editingId 
        ? `/api/announcements?id=${editingId}`
        : '/api/announcements';
      
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData,
          link: formData.link.trim() || undefined,
          link_text: formData.link_text.trim() || undefined
        }),
      });

      if (res.ok) {
        resetForm();
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const res = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  return (
    <div className="admin-page-wrap space-y-6">
      <IslamicPageHeader
        title="Announcements"
        subtitle="Manage updates and news for students"
        className="!static mb-6"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Announcements' }
        ]}
        actions={[
          {
            label: isCreating ? 'Cancel' : 'New Announcement',
            icon: isCreating ? undefined : Plus,
            onClick: () => {
              if (isCreating) resetForm();
              else setIsCreating(true);
            },
            variant: isCreating ? 'secondary' : 'primary'
          }
        ]}
      />

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <IslamicCard className="p-6 border-emerald-100 bg-emerald-50/30">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g., New Course Available"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px]"
                    placeholder="Write your announcement here..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link URL (Optional)</label>
                    <input
                      type="text"
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="e.g., /student/meetings"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link Text (Optional)</label>
                    <input
                      type="text"
                      value={formData.link_text}
                      onChange={(e) => setFormData({...formData, link_text: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="e.g., Book Now"
                    />
                  </div>
                </div>
                
                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({...formData, is_pinned: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Pin to top
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.is_important}
                      onChange={(e) => setFormData({...formData, is_important: e.target.checked})}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Mark as Important
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <IslamicButton
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancel
                  </IslamicButton>
                  <IslamicButton
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    loading={submitting}
                  >
                    {editingId ? 'Update Announcement' : 'Post Announcement'}
                  </IslamicButton>
                </div>
              </form>
            </IslamicCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-600">No announcements yet</h3>
          <p className="text-slate-400">Create your first announcement to notify students.</p>
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
              onEdit={() => handleEdit(announcement)}
              onDelete={() => handleDelete(announcement.id)}
              isAdmin={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
