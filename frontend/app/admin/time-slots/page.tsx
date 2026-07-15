'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Calendar, Clock, Users, Loader2, Moon, Star
} from 'lucide-react';
import { api } from '@/lib/api';

interface TimeSlotInfo {
  start_time: string;
  end_time: string;
}

interface TimeSlot {
  id: string;
  teacher_id: string;
  teacher_name: string;
  date: string;
  time_slots?: TimeSlotInfo | TimeSlotInfo[];
  start_time?: string;
  end_time?: string;
  topic?: string;
  max_capacity: number;
  current_bookings: number;
  is_free: boolean;
}

function formatTime(time: string | undefined): string {
  if (!time) return 'N/A';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + (isToday ? ' (Today)' : '');
}

// Islamic Loading Component
function IslamicLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-emerald-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 border-4 border-teal-300 rounded-full animate-spin"></div>
          <Moon className="absolute inset-0 m-auto h-10 w-10 text-emerald-600 animate-pulse" />
          <Star className="absolute top-2 right-2 h-4 w-4 text-amber-400 animate-bounce" />
        </div>
        <p className="text-emerald-700 font-semibold text-lg">Loading...</p>
        <p className="text-emerald-600 text-sm mt-2">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
      </div>
    </div>
  );
}

export default function TimeSlotsPage() {
  const { getToken } = useAuth();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const token = await getToken();
      const response = await api.admin.getTeacherSlots(token);
      setSlots(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlots([]);
      setLoading(false);
    }
  };

  // Get week dates
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = [];
    }
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Filter to only show dates that have slots
  const datesWithSlots = weekDates.filter(date => {
    const dateStr = date.toISOString().split('T')[0];
    return slotsByDate[dateStr] && slotsByDate[dateStr].length > 0;
  });

  if (loading) {
    return <IslamicLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin"
              className="p-2 hover:bg-white/70 rounded-xl transition-colors shadow-sm"
            >
              <ArrowLeft className="h-6 w-6 text-emerald-700" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-emerald-900">Teacher Availability This Week</h1>
              <p className="text-emerald-600 mt-1">View all scheduled time slots</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-2 bg-white rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors"
            >
              ←
            </button>
            <span className="px-4 py-2 bg-white rounded-lg border border-emerald-200 font-semibold text-emerald-900">
              {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `Week +${weekOffset}`}
            </span>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-2 bg-white rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-colors"
            >
              →
            </button>
          </div>
        </div>

        {/* Slots Display */}
        {datesWithSlots.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-emerald-100 p-12 text-center shadow-lg">
            <Calendar className="h-16 w-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-emerald-900 mb-2">No Slots This Week</h3>
            <p className="text-emerald-600">No teachers have scheduled availability for this week</p>
          </div>
        ) : (
          <div className="space-y-6">
            {datesWithSlots.map((date) => {
              const dateStr = date.toISOString().split('T')[0];
              const daySlots = slotsByDate[dateStr] || [];
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={dateStr}
                  className={`bg-white rounded-xl border-2 p-6 shadow-lg ${
                    isToday ? 'border-purple-300 bg-purple-50/30' : 'border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className={`h-6 w-6 ${isToday ? 'text-purple-600' : 'text-emerald-600'}`} />
                      <h3 className={`text-xl font-bold ${isToday ? 'text-purple-900' : 'text-emerald-900'}`}>
                        {formatDate(dateStr)}
                      </h3>
                      {isToday && (
                        <span className="px-3 py-1 bg-purple-500 text-white text-xs rounded-full font-bold">
                          TODAY
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-600">
                      {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {daySlots.map((slot) => {
                      const startTime = Array.isArray(slot.time_slots) 
                        ? slot.time_slots[0]?.start_time 
                        : slot.time_slots?.start_time || slot.start_time;
                      const endTime = Array.isArray(slot.time_slots) 
                        ? slot.time_slots[0]?.end_time 
                        : slot.time_slots?.end_time || slot.end_time;
                      const isFull = slot.current_bookings >= slot.max_capacity;

                      return (
                        <div
                          key={slot.id}
                          className={`rounded-lg border-2 p-4 ${
                            isFull
                              ? 'border-red-300 bg-red-50'
                              : 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <Clock className={`h-5 w-5 ${isFull ? 'text-red-600' : 'text-emerald-600'}`} />
                              <span className={`font-bold ${isFull ? 'text-red-900' : 'text-emerald-900'}`}>
                                {formatTime(startTime)} - {formatTime(endTime)}
                              </span>
                            </div>
                          </div>
                          
                          <p className="font-semibold text-gray-900 mb-2 truncate">{slot.teacher_name}</p>
                          
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <Users className="h-4 w-4" />
                              <span>{slot.current_bookings}/{slot.max_capacity}</span>
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                slot.is_free
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {slot.is_free ? 'FREE' : 'PAID'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
