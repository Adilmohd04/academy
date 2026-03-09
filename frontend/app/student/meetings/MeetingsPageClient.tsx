'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, CheckCircle2, XCircle, MoreVertical, FileText, ExternalLink, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Convert 24h to 12h format
const formatTime12h = (time24: string) => {
  if (!time24) return '--:--';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${period}`;
};

// Actual API response structure
interface Meeting {
    id: string;
    teacher_name: string;
    topic: string;
    meeting_date: string;
    start_time: string;
    end_time: string;
    status: string; // 'assigned', 'pending_assignment', 'completed', 'cancelled'
    meeting_link?: string;
    notes_link?: string;
    resource_link?: string;
}

interface MeetingsPageClientProps {
    user: any;
    meetings: Meeting[];
}

export default function MeetingsPageClient({ user, meetings }: MeetingsPageClientProps) {
    const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
    const router = useRouter();

    const displayMeetings = meetings.filter(m =>
        filter === 'upcoming'
            ? (m.status === 'assigned' || m.status === 'pending_assignment' || m.status === 'paid')
            : (m.status === 'completed' || m.status === 'cancelled')
    );

    return (
        <div className="relative z-10">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
                >
                    <div className="p-2 rounded-lg bg-white border border-stone-200 group-hover:border-stone-300 group-hover:bg-stone-50 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span className="font-medium">Back</span>
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 mb-2 font-serif">My Sessions</h1>
                        <p className="text-slate-500">Manage your upcoming and past learning sessions</p>
                    </div>
                    <Link href="/student/meetings/select-teacher">
                        <button className="px-6 py-3 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-all shadow-lg shadow-amber-100">
                            + New Session
                        </button>
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-stone-200 pb-1">
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={`pb-3 px-2 text-sm font-medium transition-all relative ${filter === 'upcoming' ? 'text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Upcoming
                        {filter === 'upcoming' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setFilter('past')}
                        className={`pb-3 px-2 text-sm font-medium transition-all relative ${filter === 'past' ? 'text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        Past Sessions
                        {filter === 'past' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800"
                            />
                        )}
                    </button>
                </div>

                {/* Grid */}
                {displayMeetings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 text-center py-16">
                        <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-stone-100">
                            {filter === 'upcoming' ? '📅' : '📚'}
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 font-serif">No {filter} sessions</h3>
                        <p className="text-slate-500 mb-6">
                            {filter === 'upcoming'
                                ? "You don't have any upcoming sessions scheduled."
                                : "You haven't completed any sessions yet."}
                        </p>
                        {filter === 'upcoming' && (
                            <Link href="/student/meetings/select-teacher">
                                <button className="px-6 py-3 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-all shadow-lg shadow-amber-100">
                                    Book Your First Session
                                </button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayMeetings.map((meeting) => {
                            const meetingDate = meeting.meeting_date ? new Date(meeting.meeting_date) : null;
                            const formattedDate = meetingDate ? meetingDate.toLocaleDateString('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            }) : 'Date pending';
                            
                            // Convert 24h time to 12h format
                            const formattedTime = meeting.start_time && meeting.end_time 
                                ? `${formatTime12h(meeting.start_time)} - ${formatTime12h(meeting.end_time)}`
                                : '--:--';

                            return (
                            <div key={meeting.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col h-full hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-medium border border-stone-200">
                                        {meeting.topic || 'Islamic Studies'}
                                    </div>
                                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1 font-serif">{meeting.teacher_name || 'Teacher'}</h3>

                                <div className="space-y-3 mt-4 mb-6">
                                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                                        <Calendar size={16} className="text-slate-400" />
                                        <span>{formattedDate}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                                        <Clock size={16} className="text-slate-400" />
                                        <span>{formattedTime}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-stone-100">
                                    {meeting.status === 'assigned' ? (
                                        <>
                                            <a
                                                href={meeting.meeting_link || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block mb-3"
                                            >
                                                <button className="w-full px-4 py-3 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-all shadow-lg shadow-amber-100">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Video size={16} />
                                                        Join Meeting
                                                    </div>
                                                </button>
                                            </a>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-medium mb-3">
                                            {meeting.status === 'completed' ? (
                                                <>
                                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                                    Completed
                                                </>
                                            ) : meeting.status === 'cancelled' ? (
                                                <>
                                                    <XCircle size={16} className="text-red-600" />
                                                    Cancelled
                                                </>
                                            ) : (
                                                <>
                                                    <Clock size={16} className="text-amber-600" />
                                                    Pending Assignment
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Show resources for both assigned AND past meetings */}
                                    {(meeting.resource_link || meeting.notes_link) && (
                                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2">
                                            <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                                <FileText size={14} />
                                                Learning Resources
                                            </p>
                                            {meeting.resource_link && (
                                                <a
                                                    href={meeting.resource_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                                >
                                                    <ExternalLink size={12} />
                                                    Study Materials
                                                </a>
                                            )}
                                            {meeting.notes_link && (
                                                <a
                                                    href={meeting.notes_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                                                >
                                                    <ExternalLink size={12} />
                                                    Lesson Notes
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </div>
    );
}
