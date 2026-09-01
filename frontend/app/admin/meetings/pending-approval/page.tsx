'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import IslamicLoader from '@/components/shared/IslamicLoader';
import {
  CheckCircle,
  Clock,
  Calendar,
  Loader2,
  ArrowLeft,
  Users,
  Link as LinkIcon,
  AlertCircle,
  XCircle,
  Sparkles,
  ChevronRight,
  X,
  Eye
} from 'lucide-react';

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface SlotBox {
  slot_id: string;
  teacher_name: string;
  teacher_email: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  slot_name: string;
  topic?: string;
  description?: string;
  is_free_slot: boolean;
  max_capacity: number;
  is_unlimited: boolean;
  booking_deadline: string;
  current_bookings: number;
  pending_count: number;
  approved_count: number;
  is_closed: boolean;
  is_capacity_full: boolean;
  is_deadline_passed: boolean;
  is_missed: boolean;
  meeting_link?: string;
  has_meeting_link: boolean;
  students: Array<{
    booking_id: string;
    name: string;
    email: string;
    phone?: string;
    notes?: string;
    approval_status: string;
    payment_status: string;
    created_at: string;
  }>;
}

// Student Modal Component
function StudentModal({ 
  isOpen, 
  onClose, 
  students, 
  slotTitle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  students: SlotBox['students'];
  slotTitle: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200"
      >
        <div className="bg-emerald-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Enrolled Students</h3>
            <p className="text-emerald-200 text-sm">{slotTitle}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {students.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No students enrolled yet.
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                      {(student.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      student.payment_status === 'paid' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {student.payment_status === 'paid' ? 'Paid' : 'Free/Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PendingApprovalPage() {
  const { getToken } = useAuth();
  const [boxes, setBoxes] = useState<SlotBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [meetingLinks, setMeetingLinks] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState<'active' | 'approved' | 'missed'>('active');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<SlotBox['students']>([]);
  const [selectedSlotTitle, setSelectedSlotTitle] = useState('');

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/meetings/pending-boxes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      setBoxes(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching boxes:', error);
      setBoxes([]);
      setLoading(false);
    }
  };

  const handleApprove = async (slotId: string) => {
    const meetingLink = meetingLinks[slotId];
    if (!meetingLink || !meetingLink.trim()) {
      alert('Please enter a meeting link before approving');
      return;
    }

    setApproving(slotId);
    try {
      const token = await getToken();
      const response = await fetch('/api/meetings/approve-box', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot_id: slotId,
          meeting_link: meetingLink,
        }),
      });

      if (response.ok) {
        // Update local state to move box to approved list or remove it
        // For now, let's just refresh or update the list
        fetchBoxes(); 
        const newLinks = { ...meetingLinks };
        delete newLinks[slotId];
        setMeetingLinks(newLinks);
      } else {
        alert('Failed to approve box');
      }
    } catch (error) {
      console.error('Error approving box:', error);
      alert('Error approving box');
    } finally {
      setApproving(null);
    }
  };

  const openStudentModal = (students: SlotBox['students'], title: string) => {
    setSelectedStudents(students);
    setSelectedSlotTitle(title);
    setModalOpen(true);
  };

  // Filter Logic
  const activeBoxes = boxes.filter(b => !b.is_missed && b.approved_count === 0); // Open or Ready but not approved
  const approvedBoxes = boxes.filter(b => b.approved_count > 0);
  const missedBoxes = boxes.filter(b => b.is_missed);

  const displayBoxes = activeTab === 'active' ? activeBoxes : (activeTab === 'approved' ? approvedBoxes : missedBoxes);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 12 }
    }
  };

  if (loading) {
    return <IslamicLoader />;
  }

  return (
    <div className="pb-20">
      <StudentModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        students={selectedStudents} 
        slotTitle={selectedSlotTitle} 
      />

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950 flex items-center gap-3">
              Meeting Approvals <Sparkles className="h-6 w-6 text-amber-500 fill-amber-500" />
            </h1>
            <p className="text-slate-600 mt-1">Manage session approvals and view student enrollments</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-8 w-fit">
          {[
            { id: 'active', label: 'Active / Ready', count: activeBoxes.length, icon: Calendar },
            { id: 'approved', label: 'Approved', count: approvedBoxes.length, icon: CheckCircle },
            { id: 'missed', label: 'Missed', count: missedBoxes.length, icon: AlertCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {displayBoxes.map((box) => {
              const isReady = box.is_deadline_passed || box.is_capacity_full;
              const isApproved = box.approved_count > 0;
              
              return (
                <motion.div
                  key={box.slot_id}
                  variants={itemVariants}
                  layout
                  className={`bg-white rounded-2xl border ${
                    isReady && !isApproved ? 'border-amber-200 shadow-amber-100/50' : 'border-slate-200'
                  } shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col`}
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 border-b ${
                    isReady && !isApproved ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50/50 border-slate-100'
                  } flex justify-between items-start`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">{box.teacher_name}</h3>
                        {isReady && !isApproved && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Ready
                          </span>
                        )}
                        {isApproved && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Approved
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{box.teacher_email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold border ${
                        box.is_free_slot 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {box.is_free_slot ? 'Free Session' : 'Paid Session'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{formatDate(box.meeting_date)}</p>
                        <p className="text-sm text-slate-500">{formatTime(box.start_time)} - {formatTime(box.end_time)}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Topic:</span>
                        <span className="font-medium text-slate-900">{box.topic || 'General Discussion'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Enrollment:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{box.current_bookings} / {box.max_capacity}</span>
                          {box.is_capacity_full && (
                            <span className="text-xs text-red-500 font-bold">(Full)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Students Button */}
                    <button
                      onClick={() => openStudentModal(box.students, `${box.teacher_name} - ${formatDate(box.meeting_date)}`)}
                      className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 mb-4"
                    >
                      <Users className="w-4 h-4" />
                      View Enrolled Students ({box.students.length})
                    </button>

                    {/* Action Area */}
                    {!isApproved && !box.is_missed && (
                      <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                          Meeting Link
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="https://meet.google.com/..."
                              value={meetingLinks[box.slot_id] || ''}
                              onChange={(e) => setMeetingLinks({ ...meetingLinks, [box.slot_id]: e.target.value })}
                              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            />
                          </div>
                          <button
                            onClick={() => handleApprove(box.slot_id)}
                            disabled={approving === box.slot_id}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
                          >
                            {approving === box.slot_id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {isApproved && (
                      <div className="pt-4 border-t border-slate-100">
                         <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Approved</p>
                              <p className="text-[10px] text-emerald-600 truncate max-w-[200px]">
                                {box.meeting_link || 'Link sent'}
                              </p>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {displayBoxes.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No sessions found</h3>
            <p className="text-slate-500">There are no sessions in this category.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
