'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, User, BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ShinyButton } from '@/components/ui/ShinyButton';
import { BackgroundGradient } from '@/components/ui/BackgroundGradient';

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

  // Security check
  useEffect(() => {
    if (user) {
      const role = user.publicMetadata?.role as string;
      if (role !== 'student') {
        toast.error('Access Denied: Students only!');
        router.replace('/dashboard');
        return;
      }
    }
  }, [user, router]);

  if (user && user.publicMetadata?.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center p-12">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-2">This page is for students only.</p>
        </div>
      </div>
    );
  }

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

        if (availableTeachers.length === 0) {
          toast('No teachers available this week', {
            icon: 'ℹ️',
            style: { background: '#3b82f6', color: '#fff' }
          });
        }
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Failed to load teachers');
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
        
        // Debug: Log slot data to verify is_free field
        console.log('📊 Received slots from API:', slots.map((s: any) => ({ 
          id: s.id, 
          date: s.date, 
          is_free: s.is_free, 
          topic: s.topic,
          meeting_price: s.meeting_price 
        })));
        
        const bookedSlotIds = new Set(
          myMeetings
            .filter((m) => m.slot_id || m.teacher_slot_id)
            .map((m) => m.slot_id || m.teacher_slot_id)
        );
        slots = slots.filter((slot: any) => !bookedSlotIds.has(slot.id));
        setTeacherSlots(slots);
        if (slots.length === 0) {
          toast('You have booked all available slots for this teacher', {
            icon: 'ℹ️'
          });
        }
      }
    } catch (error) {
      console.error('Error loading teacher slots:', error);
      toast.error('Failed to load slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (slot: TeacherSlot) => {
    const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : slot.meeting_price;
    const isFreeSlot = slot.is_free === true || price === 0;
    const slotPrice = isFreeSlot ? 0 : (price || 100);
    
    console.log('🎯 Booking slot:', { 
      id: slot.id, 
      is_free: slot.is_free, 
      meeting_price: slot.meeting_price, 
      parsedPrice: price,
      isFreeSlot, 
      slotPrice 
    });
    
    router.push(
      `/student/meetings/schedule?teacher_id=${slot.teacher_id}&slot_id=${slot.id}&date=${slot.date}&time_slot_id=${slot.time_slot_id}&is_free=${isFreeSlot}&meeting_price=${slotPrice}&topic=${encodeURIComponent(slot.topic || '')}&description=${encodeURIComponent(slot.description || '')}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="text-gray-600 font-medium text-lg">Finding available teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 pb-20">
      {/* Islamic Pattern Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>

      <Toaster position="top-center" toastOptions={{
        className: 'bg-white text-gray-900 border border-gray-200 shadow-lg',
        style: { background: '#fff', color: '#111', border: '1px solid #e5e7eb' }
      }} />

      <div className="max-w-7xl mx-auto relative">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/student"
              className="p-2 hover:bg-emerald-100 rounded-xl transition-colors text-gray-600 hover:text-emerald-700"
            >
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📚 Book a Session</h1>
              <p className="text-gray-600">Select a teacher and available time slot</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-180px)]">

          {/* Teachers List */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <User size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Available Teachers ({teachers.length})</h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide pb-4">
              <AnimatePresence mode="popLayout">
                {teachers.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                      👨‍🏫
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Teachers Available</h3>
                    <p className="text-gray-600">Please check back later for availability</p>
                  </div>
                ) : (
                  teachers.map((teacher, index) => (
                    <motion.button
                      key={teacher.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectTeacher(teacher.clerk_user_id)}
                      className={`w-full p-5 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden border ${selectedTeacher === teacher.clerk_user_id
                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-lg'
                        : 'bg-white border-gray-200 hover:border-emerald-200 hover:shadow-md'
                        }`}
                    >
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 font-bold ${selectedTeacher === teacher.clerk_user_id
                          ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                          }`}>
                          {teacher.full_name?.charAt(0) || '👨‍🏫'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-gray-900 truncate pr-4">
                              {teacher.full_name || 'Teacher'}
                            </h3>
                            {selectedTeacher === teacher.clerk_user_id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-emerald-600 text-white p-1 rounded-full"
                              >
                                <CheckCircle2 size={14} />
                              </motion.div>
                            )}
                          </div>

                          <p className={`text-sm mb-3 truncate ${selectedTeacher === teacher.clerk_user_id ? 'text-emerald-700' : 'text-gray-600'
                            }`}>
                            {teacher.email}
                          </p>

                          {teacher.subjects && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${selectedTeacher === teacher.clerk_user_id
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                              }`}>
                              <BookOpen size={12} />
                              <span>{teacher.subjects}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Available Slots */}
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                <Calendar size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Available Time Slots</h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-hide pb-4">
              <AnimatePresence mode="wait">
                {!selectedTeacher ? (
                  <div className="bg-white rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center shadow-sm border border-gray-100">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-4xl animate-bounce">
                      👈
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Teacher</h3>
                    <p className="text-gray-600 max-w-xs mx-auto">Choose a teacher from the list to see their available time slots</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="bg-white rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center shadow-sm border border-gray-100">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Finding best slots...</p>
                  </div>
                ) : teacherSlots.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl text-red-600">
                      📅
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Slots Available</h3>
                    <p className="text-gray-600">All slots are booked. Try selecting another teacher.</p>
                  </div>
                ) : (
                  teacherSlots.map((slot, index) => {
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
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectSlot(slot)}
                      className="group"
                    >
                      <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer relative overflow-hidden">
                        <div className="flex items-start justify-between mb-4 relative z-10">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md border border-emerald-200">
                                {new Date(slot.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                {new Date(slot.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-emerald-600" />
                                {formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}
                              </h3>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                            (() => {
                              const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : slot.meeting_price;
                              return slot.is_free === true || price === 0;
                            })()
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-teal-100 text-teal-700 border border-teal-200'
                          }`}>
                            {(() => {
                              const price = typeof slot.meeting_price === 'string' ? parseFloat(slot.meeting_price) : slot.meeting_price;
                              return slot.is_free === true || price === 0 ? 'FREE' : `₹${price || meetingPrice}`;
                            })()}
                          </div>
                        </div>

                        {/* Topic/Title Display */}
                        {slot.topic && (
                          <div className="mb-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                            <h4 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-2">
                              <BookOpen size={16} className="text-emerald-600" /> 
                              {slot.topic}
                            </h4>
                            {slot.description && (
                              <p className="text-sm text-gray-700 leading-relaxed">{slot.description}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 relative z-10">
                          <div className="text-sm">
                            {slot.is_unlimited ? (
                              <span className="text-emerald-600 font-medium flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Unlimited spots
                              </span>
                            ) : (
                              <span className={`${(slot.slots_remaining || slot.remaining_capacity) < 3 ? 'text-amber-600' : 'text-gray-700'
                                } font-medium flex items-center gap-1`}>
                                <span className={`w-2 h-2 rounded-full ${(slot.slots_remaining || slot.remaining_capacity) < 3 ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}></span>
                                {slot.slots_remaining || slot.remaining_capacity} spot{(slot.slots_remaining || slot.remaining_capacity) === 1 ? '' : 's'} left
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                            Book Now <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )})
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
