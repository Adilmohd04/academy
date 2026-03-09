'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import IslamicLoader from '@/components/shared/IslamicLoader';
import {
  ArrowLeft, Search, Loader2, User, Mail, DollarSign,
  Calendar, Clock, BookOpen, Users, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Teacher {
  id: string;
  clerk_user_id: string;
  full_name: string;
  email: string;
  hourly_price: number;
  teacher_price: number;
  is_free: boolean;
}

interface TimeSlotInfo {
  start_time: string;
  end_time: string;
}

interface TimeSlot {
  id: string;
  teacher_id: string;
  date: string;
  start_time?: string;
  end_time?: string;
  time_slots?: TimeSlotInfo | TimeSlotInfo[];
  topic?: string;
  max_capacity: number;
  current_bookings: number;
  is_free: boolean;
  meeting_price?: number;
  meeting_bookings?: { payment_status: string; payment_amount: number }[];
}

export default function TeacherManagementPage() {
  const { getToken } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(0);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [slotPriceValue, setSlotPriceValue] = useState<number>(0);

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Refresh teachers when component gets focus (e.g., coming back from dashboard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page is visible again, refresh data
        fetchTeachers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherSlots(selectedTeacher.id);
    }
  }, [selectedTeacher, weekOffset]);

  const fetchTeachers = async () => {
    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTeachers(data.teachers || data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setLoading(false);
    }
  };

  const getWeekDates = (offset: number): Date[] => {
    const dates: Date[] = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (offset * 7));

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const fetchTeacherSlots = async (teacherId: string) => {
    try {
      const token = await getToken();
      const weekDates = getWeekDates(weekOffset);
      const startDate = weekDates[0].toISOString().split('T')[0];
      const endDate = weekDates[6].toISOString().split('T')[0];

      console.log('📅 Fetching slots for teacher:', {
        teacherId,
        clerk_user_id: selectedTeacher?.clerk_user_id,
        startDate,
        endDate
      });

      // Use clerk_user_id instead of database id for API call
      const teacherIdentifier = selectedTeacher?.clerk_user_id || teacherId;

      const response = await fetch(
        `/api/admin/teacher-slots?teacher_id=${teacherIdentifier}&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      console.log('📊 Received slots:', data);
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handleUpdatePrice = async () => {
    if (!selectedTeacher) return;

    try {
      const token = await getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/teacher-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerk_user_id: selectedTeacher.clerk_user_id,
          price: priceValue,
        }),
      });

      if (response.ok) {
        // Update local state
        const updatedTeachers = teachers.map(t =>
          t.id === selectedTeacher.id ? { ...t, teacher_price: priceValue, hourly_price: priceValue } : t
        );
        setTeachers(updatedTeachers);
        setSelectedTeacher({ ...selectedTeacher, teacher_price: priceValue, hourly_price: priceValue });
        setEditingPrice(false);
        // Refresh teachers list to get updated data from backend
        await fetchTeachers();
      }
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const handleToggleFree = async () => {
    if (!selectedTeacher) return;

    try {
      const token = await getToken();
      const newIsFree = !selectedTeacher.is_free;
      
      console.log('🔄 Toggling teacher status:', {
        teacher_id: selectedTeacher.clerk_user_id,
        email: selectedTeacher.email,
        current_is_free: selectedTeacher.is_free,
        new_is_free: newIsFree
      });
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/teacher-free`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacher_id: selectedTeacher.clerk_user_id,
          is_free: newIsFree,
        }),
      });

      const result = await response.json();
      console.log('📝 API Response:', result);

      if (response.ok) {
        console.log('✅ Successfully toggled, refreshing teachers list...');
        
        // Refresh the entire teachers list from backend to get updated data
        await fetchTeachers();
        
        // Find and update the selected teacher from the refreshed list
        const refreshedTeacher = teachers.find(t => t.clerk_user_id === selectedTeacher.clerk_user_id);
        if (refreshedTeacher) {
          setSelectedTeacher(refreshedTeacher);
        }
        
        alert(`✓ Teacher status updated to ${newIsFree ? 'FREE' : 'PAID'} successfully!`);
      } else {
        console.error('❌ Failed to update:', result);
        alert('Failed to update teacher status: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error toggling free status:', error);
      alert('Error updating teacher status');
    }
  };

  const handleToggleSlotFree = async (slotId: string, currentIsFree: boolean) => {
    if (!selectedTeacher) return;

    try {
      const token = await getToken();
      const newIsFree = !currentIsFree;
      
      const response = await fetch('/api/admin/slot-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot_id: slotId,
          is_free: newIsFree,
        }),
      });

      if (response.ok) {
        // Update slots locally
        setSlots(slots.map(s =>
          s.id === slotId ? { ...s, is_free: newIsFree } : s
        ));
        alert(`✓ Slot updated to ${newIsFree ? 'FREE' : 'PAID'} successfully!`);
      } else {
        const result = await response.json();
        alert('Failed to update slot: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error toggling slot free status:', error);
      alert('Error updating slot');
    }
  };

  const handleUpdateSlotPrice = async (slotId: string) => {
    if (!selectedTeacher) return;

    try {
      const token = await getToken();
      
      const response = await fetch('/api/admin/slot-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slot_id: slotId,
          meeting_price: slotPriceValue,
        }),
      });

      if (response.ok) {
        // Update slots locally
        setSlots(slots.map(s =>
          s.id === slotId ? { ...s, meeting_price: slotPriceValue } : s
        ));
        setEditingSlot(null);
        alert(`✓ Slot price updated to ₹${slotPriceValue} successfully!`);
      } else {
        const result = await response.json();
        alert('Failed to update price: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error updating slot price:', error);
      alert('Error updating slot price');
    }
  };

  const formatTime = (time: string | undefined): string => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredTeachers = Array.isArray(teachers) ? teachers.filter(t =>
    t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const weekDates = getWeekDates(weekOffset);

  if (loading) {
    return <IslamicLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Compact */}
        <div className="flex items-center space-x-4 mb-6">
          <Link
            href="/admin"
            className="p-2 hover:bg-white/70 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-emerald-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-emerald-900">Teacher Management</h1>
            <p className="text-sm text-emerald-600">Manage pricing and availability</p>
          </div>
        </div>

        {/* Main Grid - Compact */}
        <div className="grid grid-cols-12 gap-4">
          {/* Sidebar - Teacher List */}
          <div className="col-span-3">
            <div className="bg-white rounded-xl border border-emerald-200 shadow-md p-4 sticky top-4">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-emerald-200 focus:border-emerald-400 focus:outline-none text-sm"
                />
              </div>

              {/* Teacher List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      setPriceValue(teacher.teacher_price || teacher.hourly_price);
                      setEditingPrice(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedTeacher?.id === teacher.id
                        ? 'border-emerald-500 bg-emerald-50 shadow-md'
                        : 'border-emerald-100 hover:border-emerald-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {teacher.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-emerald-900 text-sm truncate">
                            {teacher.full_name}
                          </p>
                          <p className="text-xs text-emerald-600 truncate">
                            {teacher.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1 ml-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            teacher.is_free
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {teacher.is_free ? 'FREE' : 'PAID'}
                        </span>
                        {!teacher.is_free && (
                          <span className="text-xs font-bold text-emerald-700">
                            ₹{teacher.teacher_price}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="col-span-9">
            {selectedTeacher ? (
              <div className="space-y-4">
                {/* Teacher Info Card - Compact */}
                <div className="bg-white rounded-xl border border-emerald-200 shadow-md p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold">
                      {selectedTeacher.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-emerald-900">
                        {selectedTeacher.full_name}
                      </h2>
                      <div className="flex items-center space-x-2 text-emerald-600 text-sm">
                        <Mail className="h-4 w-4" />
                        <span>{selectedTeacher.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Price Box - Compact */}
                    <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-900 text-sm">
                          Per-Meeting Price
                        </span>
                      </div>
                      {editingPrice ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={priceValue || 0}
                            onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-blue-300 focus:border-blue-500 focus:outline-none text-sm font-semibold text-gray-900"
                            min="0"
                            step="0.01"
                            placeholder="Enter price"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleUpdatePrice}
                              className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPrice(false);
                                setPriceValue(selectedTeacher.teacher_price || selectedTeacher.hourly_price);
                              }}
                              className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-blue-900">
                            ₹{selectedTeacher.teacher_price}
                          </span>
                          <button
                            onClick={() => {
                              setPriceValue(selectedTeacher.teacher_price || 0);
                              setEditingPrice(true);
                            }}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-sm"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Status Box - Compact */}
                    <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="font-semibold text-orange-900 text-sm">
                          Default Payment Status
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-2xl font-bold ${
                            selectedTeacher.is_free ? 'text-green-700' : 'text-blue-700'
                          }`}
                        >
                          {selectedTeacher.is_free ? 'FREE' : 'PAID'}
                        </span>
                        <button
                          onClick={handleToggleFree}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                            selectedTeacher.is_free
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          Switch to {selectedTeacher.is_free ? 'Paid' : 'Free'}
                        </button>
                      </div>
                      <p className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                        💡 This sets the default for new slots. Individual slots below may have different pricing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Weekly Schedule - Compact */}
                <div className="bg-white rounded-xl border border-emerald-200 shadow-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-emerald-900">
                      Weekly Availability
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-900 rounded-lg font-semibold text-xs">
                        {weekOffset === 0 ? 'This Week' : 
                         weekOffset === 1 ? 'Next Week' : 
                         weekOffset === -1 ? 'Last Week' :
                         weekOffset > 1 ? `${weekOffset} Weeks Ahead` :
                         `${Math.abs(weekOffset)} Weeks Ago`}
                      </span>
                      <button
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Only Show Days with Slots */}
                  <div className="space-y-3">
                    {weekDates.filter(date => {
                      const daySlots = Array.isArray(slots) ? slots.filter(
                        (slot) => slot.date === date.toISOString().split('T')[0]
                      ) : [];
                      return daySlots.length > 0;
                    }).length === 0 ? (
                      <div className="text-center py-6 text-emerald-600">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                        <p className="font-semibold text-sm">No slots scheduled this week</p>
                      </div>
                    ) : (
                      weekDates.map((date, dayIndex) => {
                        const daySlots = Array.isArray(slots) ? slots.filter(
                          (slot) => slot.date === date.toISOString().split('T')[0]
                        ) : [];

                        if (daySlots.length === 0) return null;

                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                          <div
                            key={dayIndex}
                            className={`rounded-lg border p-3 ${
                              isToday
                                ? 'border-purple-300 bg-purple-50'
                                : 'border-emerald-200 bg-emerald-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-1.5">
                                <Calendar className={`h-4 w-4 ${isToday ? 'text-purple-600' : 'text-emerald-600'}`} />
                                <span className={`font-semibold text-sm ${isToday ? 'text-purple-900' : 'text-emerald-900'}`}>
                                  {formatDate(date)}
                                </span>
                                {isToday && (
                                  <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[10px] rounded-full font-bold">
                                    TODAY
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-emerald-700">
                                {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                              {daySlots.map((slot) => {
                                const isFull = slot.current_bookings >= slot.max_capacity;
                                // Extract time from nested time_slots object
                                const startTime = Array.isArray(slot.time_slots) ? slot.time_slots[0]?.start_time : slot.time_slots?.start_time;
                                const endTime = Array.isArray(slot.time_slots) ? slot.time_slots[0]?.end_time : slot.time_slots?.end_time;
                                // Use slot-level FREE/PAID status, not teacher-level
                                const effectiveIsFree = slot.is_free;
                                const isEditingThisSlot = editingSlot === slot.id;
                                
                                return (
                                  <div
                                    key={slot.id}
                                    className={`rounded-lg border p-3 ${
                                      isFull
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-emerald-200 bg-white'
                                    }`}
                                  >
                                    {/* Header with Time and Status */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-1">
                                        <Clock className={`h-3.5 w-3.5 ${isFull ? 'text-red-600' : 'text-emerald-600'}`} />
                                        <span className={`font-semibold text-sm ${isFull ? 'text-red-900' : 'text-emerald-900'}`}>
                                          {formatTime(startTime)} - {formatTime(endTime)}
                                        </span>
                                      </div>
                                      {isFull && (
                                        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded font-bold">
                                          FULL
                                        </span>
                                      )}
                                    </div>

                                    {/* Topic */}
                                    {slot.topic && (
                                      <div className="flex items-center space-x-1 text-emerald-700 mb-2">
                                        <BookOpen className="h-3 w-3" />
                                        <span className="text-xs truncate font-medium">
                                          {slot.topic}
                                        </span>
                                      </div>
                                    )}

                                    {/* Capacity */}
                                    <div className="flex flex-col mb-2">
                                      <div className="flex items-center space-x-1 text-emerald-700">
                                        <Users className="h-3 w-3" />
                                        <span className="text-xs">
                                          {slot.current_bookings}/{slot.max_capacity} booked
                                        </span>
                                      </div>
                                      {slot.current_bookings > 0 && slot.meeting_bookings && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {slot.meeting_bookings.some(b => b.payment_status === 'free') && (
                                            <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] rounded border border-green-200 font-medium">
                                              Includes Free
                                            </span>
                                          )}
                                          {slot.meeting_bookings.some(b => b.payment_status === 'paid') && (
                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] rounded border border-blue-200 font-medium">
                                              Includes Paid
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Price Controls */}
                                    <div className="border-t border-emerald-100 pt-2 mt-2">
                                      {/* FREE/PAID Toggle */}
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] text-gray-600 font-semibold">Status:</span>
                                        <button
                                          onClick={() => handleToggleSlotFree(slot.id, effectiveIsFree)}
                                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                            effectiveIsFree
                                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                          }`}
                                        >
                                          {effectiveIsFree ? '✓ FREE' : '💰 PAID'}
                                        </button>
                                      </div>

                                      {/* Price Editor (only show for PAID slots) */}
                                      {!effectiveIsFree && (
                                        <div className="space-y-1">
                                          {isEditingThisSlot ? (
                                            <div className="flex items-center space-x-1">
                                              <span className="text-[10px] text-gray-600">₹</span>
                                              <input
                                                type="number"
                                                value={slotPriceValue || 0}
                                                onChange={(e) => setSlotPriceValue(Number(e.target.value) || 0)}
                                                className="flex-1 px-2 py-1 text-xs border border-emerald-300 rounded focus:border-emerald-500 focus:outline-none text-gray-900"
                                                min="0"
                                              />
                                              <button
                                                onClick={() => handleUpdateSlotPrice(slot.id)}
                                                className="px-2 py-1 bg-emerald-600 text-white text-[10px] rounded hover:bg-emerald-700 font-bold"
                                              >
                                                ✓
                                              </button>
                                              <button
                                                onClick={() => setEditingSlot(null)}
                                                className="px-2 py-1 bg-gray-300 text-gray-700 text-[10px] rounded hover:bg-gray-400 font-bold"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setEditingSlot(slot.id);
                                                // Use slot.meeting_price if available, otherwise default to 100
                                                setSlotPriceValue((slot as any).meeting_price || 100);
                                              }}
                                              className="w-full flex items-center justify-between px-2 py-1 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                            >
                                              <span className="text-[10px] text-gray-600">Price:</span>
                                              <span className="text-xs font-bold text-blue-700">
                                                ₹{(slot as any).meeting_price || 100} ✏️
                                              </span>
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-emerald-200 shadow-md p-12 text-center">
                <User className="h-16 w-16 text-emerald-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-emerald-900 mb-2">
                  Select a Teacher
                </h3>
                <p className="text-emerald-600 text-sm">
                  Choose a teacher from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
