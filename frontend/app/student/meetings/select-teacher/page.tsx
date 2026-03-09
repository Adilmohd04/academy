'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, User, BookOpen, ChevronRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { IslamicLoader } from '@/components/ui/IslamicLoader';

interface Teacher {
  id: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  bio?: string;
  subjects?: string;
}

interface TeacherSlot {
  id: string;
  teacher_id: string;
  teacher_name: string;
  date: string;
  time_slot_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  remaining_capacity: number;
  is_unlimited: boolean;
  is_available: boolean;
  booking_deadline_date: string;
  booking_deadline_time: string;
  meeting_price?: number | string;
  topic?: string;
  description?: string;
  is_free?: boolean;
  resource_link?: string;
  notes_link?: string;
  slots_remaining?: number;
}

export default function SelectTeacherPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [teacherSlots, setTeacherSlots] = useState<TeacherSlot[]>([]);
  const [studentMeetings, setStudentMeetings] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [meetingPrice, setMeetingPrice] = useState(100);

  useEffect(() => {
    loadTeachers();
    loadMeetingPrice();
  }, []);

  const loadMeetingPrice = async () => {
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/settings/meeting-price`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMeetingPrice(data.price);
      }
    } catch (error) {
      console.error('Error loading meeting price:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        const allTeachers = result.data || [];

        if (allTeachers.length === 0) {
          // No teachers registered at all
          setTeachers([]);
          return;
        }

        const teachersWithSlots = await Promise.all(
          allTeachers.map(async (teacher: Teacher) => {
            try {
              const slotsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/slots/${teacher.clerk_user_id}/available`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (slotsResponse.ok) {
                const slotsData = await slotsResponse.json();
                return slotsData.data && slotsData.data.length > 0 ? teacher : null;
              }
              return null;
            } catch {
              return null;
            }
          })
        );

        const availableTeachers = teachersWithSlots.filter(t => t !== null);
        setTeachers(availableTeachers);

        // Only show toast if teachers exist but none have slots this week
        if (availableTeachers.length === 0 && allTeachers.length > 0) {
          toast('No available time slots this week. Please check back later.');
        }
      }
    } catch (err) {
      console.error('Error loading teachers:', err);
      toast.error('Failed to load teachers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeacher = async (teacherId: string) => {
    setSelectedTeacher(teacherId);
    setLoadingSlots(true);
    try {
      const token = await getToken();

      const priceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${teacherId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        setMeetingPrice(priceData.price);
      }

      const meetingsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/student/upcoming`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let myMeetings: any[] = [];
      if (meetingsResponse.ok) {
        const meetingsData = await meetingsResponse.json();
        myMeetings = meetingsData.data || [];
        setStudentMeetings(myMeetings);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/teacher/slots/${teacherId}/available`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        let slots = data.data || [];
        
        const bookedSlotIds = new Set(
          myMeetings
            .filter((m) => m.slot_id || m.teacher_slot_id)
            .map((m) => m.slot_id || m.teacher_slot_id)
        );
        slots = slots.filter((slot: any) => !bookedSlotIds.has(slot.id));
        setTeacherSlots(slots);
        if (slots.length === 0) {
          toast('You have booked all available slots for this teacher');
        }
      }
    } catch (error) {
      console.error('Error loading teacher slots:', error);
      toast.error('Failed to load slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (slot: TeacherSlot) => {
    const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : slot.meeting_price;
    const isFreeSlot = slot.is_free === true || price === 0;
    const slotPrice = isFreeSlot ? 0 : (price || 100);
    
    router.push(
      `/student/meetings/schedule?teacher_id=${slot.teacher_id}&slot_id=${slot.id}&date=${slot.date}&time_slot_id=${slot.time_slot_id}&is_free=${isFreeSlot}&meeting_price=${slotPrice}&topic=${encodeURIComponent(slot.topic || '')}&description=${encodeURIComponent(slot.description || '')}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
        <div className="text-center">
          <IslamicLoader size="lg" className="mx-auto mb-6" />
          <p className="text-slate-500 font-arabic text-lg">جار التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pt-2">
      
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/student"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#C5A059] transition-colors mb-4 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Study Hall</span>
        </Link>
        <h1 className="text-3xl font-serif text-[#1e1b4b] mb-2 font-bold">Book a Session</h1>
        <p className="text-slate-500 font-medium">Select a teacher to view their availability</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">

        {/* Teachers List */}
        <div className="lg:col-span-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Select Teacher</h2>

          <div className="space-y-3">
            {teachers.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                <p className="text-slate-500 text-sm">No teachers available right now.</p>
              </div>
            ) : (
              teachers.map((teacher) => (
                <motion.button
                  key={teacher.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectTeacher(teacher.clerk_user_id)}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-300 border relative overflow-hidden group ${
                    selectedTeacher === teacher.clerk_user_id
                      ? 'bg-[#FDFBF7] border-[#C5A059] shadow-lg shadow-[#C5A059]/10'
                      : 'bg-white border-stone-200 hover:border-[#C5A059] hover:shadow-md'
                  }`}
                >
                  {/* Selection Indicator Line */}
                  {selectedTeacher === teacher.clerk_user_id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C5A059]" />
                  )}

                  <div className="flex items-center gap-4">
                    {/* Avatar Placeholder */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-serif font-bold shrink-0 transition-colors ${
                      selectedTeacher === teacher.clerk_user_id
                        ? 'bg-[#C5A059] text-white'
                        : 'bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#FDFBF7] group-hover:text-[#C5A059]'
                    }`}>
                      {teacher.full_name ? teacher.full_name[0].toUpperCase() : 'T'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className={`font-serif text-lg font-bold truncate transition-colors ${
                        selectedTeacher === teacher.clerk_user_id ? 'text-[#1e1b4b]' : 'text-[#1e1b4b]'
                      }`}>
                        {teacher.full_name || 'Teacher'}
                      </h3>
                      
                      {teacher.subjects && (
                        <p className={`text-xs font-medium uppercase tracking-wide truncate transition-colors ${
                          selectedTeacher === teacher.clerk_user_id ? 'text-[#C5A059]' : 'text-slate-500'
                        }`}>
                          {teacher.subjects}
                        </p>
                      )}
                    </div>

                    {selectedTeacher === teacher.clerk_user_id && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-[#C5A059] rounded-full flex items-center justify-center text-white"
                      >
                        <Check size={14} strokeWidth={3} />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Available Slots */}
        <div className="lg:col-span-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Available Slots</h2>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {!selectedTeacher ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 border border-dashed border-stone-300 rounded-xl bg-stone-50/50"
                >
                  <User className="w-12 h-12 text-stone-300 mb-4" />
                  <p className="text-slate-500">Select a teacher from the list to see their schedule.</p>
                </motion.div>
              ) : loadingSlots ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <IslamicLoader size="md" className="mb-4" />
                  <p className="text-slate-400 text-sm">Checking availability...</p>
                </div>
              ) : teacherSlots.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 border border-stone-200 rounded-xl bg-white"
                >
                  <Calendar className="w-12 h-12 text-stone-300 mb-4" />
                  <h3 className="text-lg font-serif text-slate-800 mb-2">No Slots Available</h3>
                  <p className="text-slate-500">This teacher is fully booked for now.</p>
                </motion.div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {teacherSlots.map((slot, index) => {
                    // Convert 24h to 12h IST format
                    const formatTime12h = (time24: string) => {
                      if (!time24) return '--:--';
                      const [hours, minutes] = time24.split(':');
                      const h = parseInt(hours);
                      const period = h >= 12 ? 'PM' : 'AM';
                      const h12 = h % 12 || 12;
                      return `${h12}:${minutes} ${period}`;
                    };

                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectSlot(slot)}
                        className="group bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:border-[#C5A059]/50 hover:shadow-lg transition-all cursor-pointer flex flex-col h-full relative"
                      >
                        {/* Top Accent Bar */}
                        <div className={`h-2 w-full ${
                          (() => {
                            const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : slot.meeting_price;
                            return slot.is_free === true || price === 0;
                          })() ? 'bg-emerald-500' : 'bg-[#C5A059]'
                        }`} />

                        <div className="p-6 flex flex-col h-full">
                          {/* Header: Topic & Badge */}
                          <div className="flex justify-between items-start mb-4 gap-4">
                            <h3 className="font-serif text-xl text-[#1B365D] font-bold leading-tight">
                              {slot.topic || 'General Session'}
                            </h3>
                            <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              (() => {
                                const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : (slot.meeting_price || 0);
                                return slot.is_free === true || price === 0 || price === null;
                              })()
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-[#F1F5F9] text-[#475569]'
                            }`}>
                              {(() => {
                                const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : (slot.meeting_price || 0);
                                return slot.is_free === true || price === 0 || price === null ? 'Free' : `₹${price}`;
                              })()}
                            </div>
                          </div>

                          {/* Description */}
                          {slot.description && (
                            <p className="text-sm text-[#64748B] line-clamp-2 leading-relaxed mb-6">
                              {slot.description}
                            </p>
                          )}

                          {/* Date & Time Block */}
                          <div className="mt-auto bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] group-hover:border-[#C5A059]/20 transition-colors">
                            <div className="flex items-center gap-3 mb-2">
                              <Calendar className="w-4 h-4 text-[#C5A059]" />
                              <span className="text-sm font-bold text-[#1B365D]">
                                {new Date(slot.date).toLocaleDateString('en-IN', { 
                                  timeZone: 'Asia/Kolkata', 
                                  weekday: 'long', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-[#C5A059]" />
                              <span className="text-sm font-medium text-[#64748B]">
                                {formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}
                              </span>
                            </div>
                          </div>

                          {/* Footer Action */}
                          <div className="flex items-center justify-between mt-4 pt-2">
                            <span className={`text-xs font-medium ${
                              (() => {
                                if (slot.is_unlimited) return 'text-slate-400';
                                const capacity = slot.remaining_capacity ?? slot.slots_remaining ?? (slot.max_capacity ? slot.max_capacity - (slot.current_bookings || 0) : null);
                                return capacity !== null && capacity < 3 ? 'text-amber-600' : 'text-slate-400';
                              })()
                            }`}>
                              {(() => {
                                if (slot.is_unlimited) return 'Unlimited spots';
                                const capacity = slot.remaining_capacity ?? slot.slots_remaining ?? (slot.max_capacity ? slot.max_capacity - (slot.current_bookings || 0) : null);
                                if (capacity === null || capacity === undefined) return 'Check availability';
                                if (capacity === 0) return 'Fully booked';
                                return `${capacity} spot${capacity !== 1 ? 's' : ''} left`;
                              })()}
                            </span>
                            
                            <span className="text-sm font-bold text-[#1B365D] group-hover:text-[#C5A059] transition-colors flex items-center gap-2">
                              Book Session <ChevronRight size={16} />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
