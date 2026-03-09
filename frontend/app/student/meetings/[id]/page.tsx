'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { IslamicLoader } from '@/components/ui/IslamicLoader';
import { Calendar, Clock, Video, User, ArrowLeft, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function MeetingDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { getToken } = useAuth();
  const router = useRouter();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const token = await getToken();
        console.log('Fetching meeting:', id);
        const response = await api.meetings.getById(id, token);
        console.log('Meeting response:', response.data);
        
        // Handle both wrapped { data: meeting } and direct meeting object
        const meetingData = response.data.data || response.data;
        
        if (!meetingData) {
          throw new Error('No meeting data received');
        }
        
        setMeeting(meetingData);
      } catch (error: any) {
        console.error('Error fetching meeting:', error);
        setError(error.message || 'Could not load meeting details');
        toast.error('Could not load meeting details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMeeting();
    }
  }, [id, getToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <IslamicLoader size="lg" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] gap-6 p-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-serif text-[#1B365D] mb-2">Meeting Not Found</h1>
          <p className="text-[#64748B] mb-6">We couldn&apos;t find the meeting with ID: <br/><code className="bg-gray-100 px-2 py-1 rounded text-sm">{id}</code></p>
          <Link 
            href="/student" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B365D] text-white rounded-xl font-bold hover:bg-[#152C4E] transition-colors shadow-lg shadow-[#1B365D]/20"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/student" 
          className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1B365D] mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-[#E2E8F0]"
        >
          {/* Header Section */}
          <div className="bg-[#1B365D] p-8 md:p-10 relative overflow-hidden">
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-10" 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-[#C5A059] text-white text-xs font-bold uppercase tracking-wider rounded-full">
                    {meeting.status}
                  </span>
                  <span className="text-white/60 text-sm font-medium">
                    ID: {meeting.id.slice(0, 8)}...
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif text-white mb-2">
                  {meeting.topic || 'Islamic Studies Session'}
                </h1>
                <p className="text-white/80 text-lg flex items-center gap-2">
                  with <span className="font-bold text-[#C5A059]">{meeting.teacher_name}</span>
                </p>
              </div>

              {meeting.meeting_link && (
                <a 
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-white text-[#1B365D] rounded-2xl font-bold hover:bg-[#F8FAFC] transition-all shadow-lg flex items-center gap-3"
                >
                  <Video className="w-5 h-5" />
                  Join Class
                </a>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Time & Date */}
              <div className="space-y-6">
                <h3 className="text-[#1B365D] font-bold text-lg border-b border-[#E2E8F0] pb-2 mb-4">
                  Session Details
                </h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FDFBF7] rounded-xl flex items-center justify-center border border-[#E2E8F0] text-[#C5A059]">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] font-medium uppercase tracking-wide">Date</p>
                    <p className="text-xl text-[#1B365D] font-serif">
                      {new Date(meeting.meeting_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FDFBF7] rounded-xl flex items-center justify-center border border-[#E2E8F0] text-[#C5A059]">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-[#64748B] font-medium uppercase tracking-wide">Time</p>
                    <p className="text-xl text-[#1B365D] font-serif">
                      {meeting.start_time ? (
                        `${new Date(`2000-01-01T${meeting.start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(`2000-01-01T${meeting.end_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      ) : (
                        'Time not set'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resources & Notes */}
              <div className="space-y-6">
                <h3 className="text-[#1B365D] font-bold text-lg border-b border-[#E2E8F0] pb-2 mb-4">
                  Class Materials
                </h3>

                {meeting.resource_link ? (
                  <a 
                    href={meeting.resource_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-[#FDFBF7] border border-[#E2E8F0] rounded-xl hover:border-[#C5A059] transition-colors group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#1B365D] shadow-sm group-hover:text-[#C5A059]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1B365D]">Class Resources</p>
                      <p className="text-sm text-[#64748B]">Click to view materials</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-400">No Resources Yet</p>
                      <p className="text-sm text-gray-400">Teacher hasn&apos;t added materials</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {meeting.description && (
              <div className="mt-10 pt-8 border-t border-[#E2E8F0]">
                <h3 className="text-[#1B365D] font-bold text-lg mb-4">About this Session</h3>
                <p className="text-[#64748B] leading-relaxed">
                  {meeting.description}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}