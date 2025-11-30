'use client';

/**
 * Updated Meeting Scheduling Form - With Teacher Selection & Capacity
 * 
 * Features:
 * - Teacher selection from available teachers
 * - Real-time capacity display for each slot
 * - Booking deadline warnings
 * - Dynamic pricing
 * - Beautiful gradient UI
 */

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  User
} from 'lucide-react';

interface Teacher {
  clerk_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AvailableSlot {
  id: string;
  timeSlotId: string;
  slotName: string;
  startTime: string;
  endTime: string;
  slotsRemaining: number;
  isUnlimited: boolean;
  hasCapacity: boolean;
  bookingOpen: boolean;
}

export default function MeetingScheduleFormUpdated() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Form state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Data state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [meetingPrice, setMeetingPrice] = useState<number>(100);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load initial data
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim());
    }
    loadMeetingPrice();
    loadTeachersWithAvailability();
  }, [user]);

  // Load available dates when teacher changes
  useEffect(() => {
    if (selectedTeacher) {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      loadAvailableDates(selectedTeacher, currentMonth);
    }
  }, [selectedTeacher]);

  // Load available slots when date changes
  useEffect(() => {
    if (selectedTeacher && selectedDate) {
      loadAvailableSlots(selectedTeacher, selectedDate);
    }
  }, [selectedTeacher, selectedDate]);

  const loadMeetingPrice = async () => {
    try {
      const response = await api.settings.getMeetingPrice();
      setMeetingPrice(response.data.price);
    } catch (err) {
      console.error('Error loading meeting price:', err);
    }
  };

  const loadTeachersWithAvailability = async () => {
    try {
      setLoadingTeachers(true);
      const token = await getToken();

      // Get teachers with availability
      const availResponse = await api.teacherAvailability.getTeachersWithAvailability();
      const teacherIds = availResponse.data.data.map((t: any) => t.teacherId);

      if (teacherIds.length === 0) {
        setTeachers([]);
        setError('No teachers available at the moment. Please check back later.');
        setLoadingTeachers(false);
        return;
      }

      // Get full user details for these teachers
      const usersResponse = await api.user.getAllUsers({ role: 'teacher' }, token);
      const allTeachers = usersResponse.data.data || [];

      // Filter teachers who have availability
      const availableTeachers = allTeachers.filter((t: any) =>
        teacherIds.includes(t.clerk_id)
      );

      setTeachers(availableTeachers);

    } catch (err) {
      console.error('Error loading teachers:', err);
      setError('Failed to load available teachers');
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadAvailableDates = async (teacherId: string, month: string) => {
    try {
      setLoadingDates(true);
      setAvailableDates([]);
      setSelectedDate('');
      setSelectedSlot('');

      const response = await api.teacherAvailability.getAvailableDates(teacherId, month);
      setAvailableDates(response.data.data || []);

    } catch (err) {
      console.error('Error loading available dates:', err);
      setError('Failed to load available dates');
    } finally {
      setLoadingDates(false);
    }
  };

  const loadAvailableSlots = async (teacherId: string, date: string) => {
    try {
      setLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedSlot('');

      const response = await api.teacherAvailability.getAvailableSlotsForStudent(
        teacherId,
        date,
        date
      );

      setAvailableSlots(response.data.data || []);

    } catch (err) {
      console.error('Error loading available slots:', err);
      setError('Failed to load available time slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (!selectedTeacher) {
      setError('Please select a teacher');
      return;
    }
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);

    try {
      // Get authentication token once at the start
      const authToken = await getToken();

      // Create booking (meeting request) on backend so payment can be tied to it
      const bookingData = {
        teacher_slot_id: selectedSlot,
        student_name: fullName,
        student_email: user?.emailAddresses[0]?.emailAddress || '',
        student_phone: phone,
        notes: notes || 'Meeting consultation',
        preferred_date: selectedDate,
        time_slot_id: selectedSlot,
        amount: meetingPrice,
      };

      const createResp = await api.meetings.createRequest(bookingData, authToken);
      const meetingRequest = createResp.data;

      if (!meetingRequest || !meetingRequest.id) {
        throw new Error('Failed to create meeting request');
      }

      // Redirect to payment page with the created meeting_request_id
      setSuccess('Booking created — redirecting to payment...');
      setTimeout(() => {
        router.push(`/student/payment?meeting_request_id=${meetingRequest.id}&amount=${meetingPrice}`);
      }, 700);

    } catch (err: any) {
      console.error('Error creating booking:', err);
      // If slot is no longer available, show a clear error and refresh slots
      if (err?.response?.data?.error?.includes('slot') || err?.message?.includes('slot')) {
        setError('This slot is no longer available. Please select another slot.');
        // Reload available slots
        if (selectedTeacher && selectedDate) {
          loadAvailableSlots(selectedTeacher, selectedDate);
        }
      } else {
        setError(err.response?.data?.error || 'Failed to create booking');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacher: Teacher) => {
    return teacher.first_name && teacher.last_name
      ? `${teacher.first_name} ${teacher.last_name}`
      : teacher.email;
  };

  const getSlotStatus = (slot: AvailableSlot) => {
    if (!slot.hasCapacity) {
      return { text: 'FULLY BOOKED', color: 'text-red-600', icon: '🔒' };
    }
    if (!slot.bookingOpen) {
      return { text: 'BOOKING CLOSED', color: 'text-orange-600', icon: '⏰' };
    }
    if (slot.isUnlimited) {
      return { text: 'Unlimited spots', color: 'text-green-600', icon: '✅' };
    }
    if (slot.slotsRemaining <= 2) {
      return { text: `Only ${slot.slotsRemaining} spot(s) left!`, color: 'text-orange-600', icon: '⚠️' };
    }
    return { text: `${slot.slotsRemaining} spots available`, color: 'text-green-600', icon: '✅' };
  };

  if (loadingTeachers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading available teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <h2 className="text-3xl font-bold mb-2">Schedule Your Meeting</h2>
          <p className="text-blue-100">Select a teacher, date, and time slot to book your session</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Teacher Selection */}
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="w-4 h-4" />
              Select Teacher
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.map((teacher) => (
                <button
                  key={teacher.clerk_id}
                  type="button"
                  onClick={() => setSelectedTeacher(teacher.clerk_id)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedTeacher === teacher.clerk_id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-semibold text-gray-900">{getTeacherName(teacher)}</div>
                  <div className="text-sm text-gray-500">{teacher.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          {selectedTeacher && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4" />
                Select Date
              </label>
              {loadingDates ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading dates...
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableDates.length > 0 ? (
                    availableDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`px-4 py-2 rounded-lg border transition-all ${selectedDate === date
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                      >
                        {new Date(date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-500 italic">No available dates for this teacher.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Slot Selection */}
          {selectedDate && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4" />
                Select Time Slot
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading slots...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => {
                      const status = getSlotStatus(slot);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!slot.bookingOpen || !slot.hasCapacity}
                          onClick={() => setSelectedSlot(slot.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${selectedSlot === slot.id
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            } ${(!slot.bookingOpen || !slot.hasCapacity) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-gray-900">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            {selectedSlot === slot.id && <CheckCircle className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div className={`text-sm flex items-center gap-1.5 ${status.color}`}>
                            <span>{status.icon}</span>
                            <span>{status.text}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 italic">No slots available for this date.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Personal Details */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  rows={3}
                  placeholder="Any specific topics you'd like to discuss..."
                />
              </div>
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {/* Summary & Submit */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Meeting Price</p>
                <p className="text-3xl font-bold text-gray-900">₹{meetingPrice}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Duration</p>
                <p className="text-xl font-semibold text-gray-900">60 minutes</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTeacher || !selectedDate || !selectedSlot}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Booking Policy</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Payment required to confirm booking</li>
            <li>• Admin approval within 24 hours</li>
            <li>• Meeting link sent via email</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-2">⚠️ Important</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Booking closes at deadline</li>
            <li>• Limited spots per slot</li>
            <li>• Book early to secure your spot</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
