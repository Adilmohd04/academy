'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Pin, ExternalLink, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface AnnouncementCardProps {
  id?: string;
  title: string;
  content: string;
  date: string;
  isPinned?: boolean;
  isImportant?: boolean;
  link?: string;
  linkText?: string;
  index?: number;
  isNew?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean; // Used for both Admin and Teacher to show actions
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  title,
  content,
  date,
  isPinned = false,
  isImportant = false,
  link,
  linkText,
  index = 0,
  isNew = false,
  onEdit,
  onDelete,
  isAdmin = false
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative overflow-hidden rounded-2xl bg-white p-6 md:p-8
        border transition-all duration-300 hover:shadow-lg group
        ${isPinned 
          ? 'border-[#C5A059] shadow-md bg-[#FDFBF7]' 
          : 'border-[#E2E8F0] shadow-sm hover:border-[#C5A059]/30'
        }
      `}
    >
      {/* Pinned Indicator */}
      {isPinned && (
        <div className="absolute top-0 left-0 right-0 bg-[#C5A059] h-1.5" />
      )}

      {/* New Badge */}
      {isNew && !isPinned && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1B365D] text-white shadow-sm animate-pulse">
            New
          </span>
        </div>
      )}

      <div className="flex items-start gap-5">
        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className={`text-xl font-bold font-serif ${isPinned ? 'text-[#1B365D]' : 'text-[#1B365D]'}`}>
                  {title}
                </h3>
                {isPinned && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20">
                    <Pin className="w-3 h-3 mr-1" /> Pinned
                  </span>
                )}
                {isImportant && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle className="w-3 h-3 mr-1" /> Important
                  </span>
                )}
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={onEdit}
                    className="p-2 text-[#64748B] hover:text-[#1B365D] hover:bg-[#F0F4F8] rounded-lg transition-all"
                    title="Edit Announcement"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onDelete}
                    className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Calendar className="w-3.5 h-3.5" />
              <time dateTime={date}>
                {format(new Date(date), 'MMMM d, yyyy')}
              </time>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-[#475569] leading-relaxed whitespace-pre-wrap font-sans">
            {content}
          </div>

          {link && (
            <div className="mt-5 pt-4 border-t border-[#E2E8F0]/50">
              <Link 
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1B365D] hover:text-[#C5A059] transition-colors group"
              >
                {linkText || 'View Resource'}
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
