'use client';

/**
 * Meeting Scheduling Form Component
 * 
 * Simplified meeting scheduling for students.
 * Features:
 * - Date picker with blocked dates validation
 * - Time slot selection based on availability
 * - Real-time availability checking
 * - Fixed pricing (₹500 per meeting)
 * - Redirects to payment after submission
 * - Clear policies: No refunds, Cannot reschedule
 */

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface TimeSlot {
  slot_id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export default function MeetingScheduleForm() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Form state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  // Data state
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlot[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Meeting price (loaded from backend)
  const [meetingPrice, setMeetingPrice] = useState<number>(100);

  // Load user name, price, and time slots on mount
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim());
    }
    loadMeetingPrice();
    loadAllTimeSlots();
  }, [user]);

  // Load meeting price from settings
  const loadMeetingPrice = async () => {
    try {
      setLoadingPrice(true);
      const response = await api.settings.getMeetingPrice();
      setMeetingPrice(response.data.price);
    } catch (err) {
      console.error('Error loading meeting price:', err);
      // Keep default 100 if error
    } finally {
      setLoadingPrice(false);
    }
  };

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlotsForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadAllTimeSlots = async () => {
    try {
      const token = await getToken();
      const response = await api.timeSlots.getAvailable(token);
      setAllTimeSlots(response.data);
    } catch (err) {
      console.error('Error loading time slots:', err);
    }
  };

  const loadAvailableSlotsForDate = async (date: string) => {
    setLoadingSlots(true);
    setSelectedTimeSlot(''); // Reset slot selection
    try {
      const token = await getToken();
      
      // Check if date is available
      const dateCheck = await api.timeSlots.checkDateAvailability(date, token);
      if (!dateCheck.data.available) {
        setAvailableSlots([]);
        setError('Selected date is blocked. Please choose another date.');
        setLoadingSlots(false);
        return;
      }

      // Get available slots for this date
      const response = await api.timeSlots.getAvailableForDate(date, token);
      setAvailableSlots(response.data);
      
      if (response.data.length === 0) {
        setError('No time slots available for this date.');
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error loading available slots:', err);
      setError('Failed to load available time slots');
      setAvailableSlots([]);
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
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    if (!selectedTimeSlot) {
      setError('Please select a time slot');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      // Create meeting request with dynamic price
      const meetingData = {
        student_name: fullName,
        student_email: user?.emailAddresses[0]?.emailAddress || '',
        student_phone: phone,
        preferred_date: selectedDate,
        time_slot_id: selectedTimeSlot,
        notes: notes || 'General consultation',
        amount: meetingPrice,
      };

      const response = await api.meetings.createRequest(meetingData, token);
      
      setSuccess('Meeting request created successfully!');
      
      // Redirect to payment page after 1 second
      setTimeout(() => {
        router.push(`/student/payment?meeting_request_id=${response.data.id}&amount=${meetingPrice}`);
      }, 1000);
      
    } catch (err: any) {
      console.error('Error creating meeting request:', err);
      setError(err.response?.data?.error || 'Failed to create meeting request');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];
  
  // Get maximum date (3 months from now)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Schedule a Meeting</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
          <p className="text-sm mt-1">Redirecting to payment...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Your Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.emailAddresses[0]?.emailAddress || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Date *
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={today}
            max={maxDateStr}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select a date within the next 3 months
          </p>
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time Slot *
            </label>
            
            {loadingSlots ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-500 mt-2">Loading available slots...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
                No time slots available for this date. Please choose another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableSlots.map((slot) => (
                  <label
                    key={slot.slot_id}
                    className={`
                      flex items-center p-3 border rounded-md cursor-pointer transition-all
                      ${selectedTimeSlot === slot.slot_id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="timeSlot"
                      value={slot.slot_id}
                      checked={selectedTimeSlot === slot.slot_id}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-800">{slot.slot_name}</div>
                      <div className="text-sm text-gray-600">
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Any specific topics or questions you'd like to discuss..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
          />
        </div>

        {/* Price Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">Meeting Fee:</span>
            {loadingPrice ? (
              <span className="text-2xl text-gray-400">Loading...</span>
            ) : (
              <span className="text-3xl font-bold text-blue-600">
                ₹{meetingPrice}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Payment will be processed securely after you submit this form
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !fullName.trim() || !phone.trim() || !selectedDate || !selectedTimeSlot || availableSlots.length === 0}
          className={`
            w-full py-3 px-4 rounded-md font-semibold text-white transition-colors
            ${loading || !fullName.trim() || !phone.trim() || !selectedDate || !selectedTimeSlot || availableSlots.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800'
            }
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Proceed to Payment →'
          )}
        </button>
      </form>

      {/* Important Policies */}
      <div className="mt-6 space-y-4">
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
          <h4 className="font-bold text-red-800 mb-2 flex items-center">
            <span className="mr-2">⚠️</span> Important Policies
          </h4>
          <ul className="text-sm text-red-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>No Refunds:</strong> Once payment is confirmed, refunds will not be provided under any circumstances.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Cannot Reschedule:</strong> Meeting date and time cannot be rescheduled once confirmed and teacher is assigned.</span>
            </li>
          </ul>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="font-semibold text-green-800 mb-2">✨ What Happens Next?</h4>
          <ol className="text-sm text-green-700 space-y-2 list-decimal list-inside">
            <li>Complete the payment securely via Razorpay</li>
            <li>Download your payment receipt PDF</li>
            <li>Admin will assign a qualified teacher within 24 hours</li>
            <li>You'll receive meeting link via email to both you and teacher</li>
            <li>Get reminder 1 hour before the meeting</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
