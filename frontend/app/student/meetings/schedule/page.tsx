'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Calendar, Clock, User, DollarSign, Phone, FileText, Loader2, CheckCircle, ArrowLeft, ChevronRight, AlertCircle, Info, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

function MeetingScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slotDetails, setSlotDetails] = useState<any>(null);
  const [meetingPrice, setMeetingPrice] = useState<number>(100);

  // Form data
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // URL parameters
  const teacherId = searchParams.get('teacher_id');
  const slotId = searchParams.get('slot_id');
  const date = searchParams.get('date');
  const timeSlotId = searchParams.get('time_slot_id');
  const isFreeParam = searchParams.get('is_free') === 'true';
  const meetingPriceParam = searchParams.get('meeting_price');
  const topicParam = searchParams.get('topic');
  const descriptionParam = searchParams.get('description');

  useEffect(() => {
    if (!teacherId || !slotId || !date || !timeSlotId) {
      router.push('/student/meetings/select-teacher');
      return;
    }

    // Set price immediately from URL parameter if available
    if (isFreeParam || meetingPriceParam === '0') {
      setMeetingPrice(0);
    } else if (meetingPriceParam) {
      setMeetingPrice(parseFloat(meetingPriceParam));
    }

    loadSlotDetails();
    if (!meetingPriceParam && !isFreeParam) {
      loadMeetingPrice();
    }
  }, []);

  const loadSlotDetails = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      // Get slot details
      const response = await api.teacherAvailability.getAvailableSlots(teacherId!, token);
      const slots = response.data?.data || [];

      const slot = slots.find((s: any) => s.id === slotId);

      if (!slot) {
        setError('Slot not found');
        return;
      }

      setSlotDetails(slot);
    } catch (err: any) {
      console.error('Error loading slot:', err);
      setError('Failed to load slot details');
    } finally {
      setLoading(false);
    }
  };

  const loadMeetingPrice = async () => {
    try {
      const token = await getToken();

      if (slotDetails?.is_free === true) {
        console.log('🎉 Free slot detected, setting price to 0');
        setMeetingPrice(0);
        return;
      }

      try {
        const teacherPriceResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${teacherId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (teacherPriceResponse.ok) {
          const teacherPriceData = await teacherPriceResponse.json();
          setMeetingPrice(teacherPriceData.price);
          return;
        }
      } catch (teacherPriceError) {
        // Ignore
      }

      const response = await api.settings.getMeetingPrice();
      setMeetingPrice(response.data.price);
    } catch (err) {
      console.error('Error loading price:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const token = await getToken();

      const response = await api.meetings.createMeetingRequest({
        preferred_date: date!,
        time_slot_id: timeSlotId!,
        teacher_slot_id: slotId!,
        student_name: user?.fullName || user?.firstName || 'Student',
        student_email: user?.primaryEmailAddress?.emailAddress || '',
        student_phone: phone,
        notes: notes || undefined,
        amount: meetingPrice
      }, token);

      const meetingRequestId = response.data.id;

      // If meeting is free (price=0 or is_free flag), book directly without payment
      if (meetingPrice === 0 || slotDetails?.is_free === true) {
        console.log('✅ Free slot confirmed (price=0 or is_free=true), booking directly...');
        try {
          await api.meetings.createFreeBooking({
            meeting_request_id: meetingRequestId
          }, token);
          toast.success('Free meeting booked successfully! ✅');
          setTimeout(() => {
            router.push('/student/meetings');
          }, 1500);
          return;
        } catch (bookingErr: any) {
          console.error('Error booking free meeting:', bookingErr);
          setError('Failed to book free meeting');
          setSubmitting(false);
          return;
        }
      }

      router.push(`/student/payment?meeting_request_id=${meetingRequestId}&amount=${meetingPrice}&topic=${encodeURIComponent(slotDetails?.topic || '')}&description=${encodeURIComponent(slotDetails?.description || '')}`);

    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create booking');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="text-gray-600 font-medium text-lg">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error && !slotDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-red-600">
            ❌
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => router.push('/student/meetings/select-teacher')}
            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Teacher Selection</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 pb-20">
      {/* Islamic Pattern Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>
      
      <Toaster position="top-center" toastOptions={{
        className: 'bg-white text-gray-900 border border-gray-200',
        style: { background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6 group"
          >
            <div className="p-2 rounded-lg bg-white border border-gray-200 group-hover:border-emerald-300 group-hover:bg-emerald-50 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm Booking</h1>
          <p className="text-gray-600">Review the details and complete your reservation</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Slot Details Card */}
          {slotDetails && (
            <div className="p-8 border-b border-gray-200 bg-emerald-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Session Details</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Teacher</span>
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <User className="w-4 h-4 text-emerald-600" />
                    {slotDetails.teacher_name}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Date & Time</span>
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    {new Date(date!).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' })} • {formatTime12h(slotDetails.start_time)}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Price</span>
                  <div className="flex items-center gap-2 font-bold">
                    <DollarSign className="w-4 h-4 text-teal-600" />
                    {meetingPrice === 0 ? (
                      <span className="text-teal-600">Free Session</span>
                    ) : (
                      <span className="text-gray-900">₹{meetingPrice}</span>
                    )}
                  </div>
                </div>

                {slotDetails.remaining_capacity !== null && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Availability</span>
                    <div className="flex items-center gap-2 text-gray-900 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      {slotDetails.is_unlimited ? 'Unlimited' : `${slotDetails.remaining_capacity} spots left`}
                    </div>
                  </div>
                )}
              </div>

              {slotDetails.topic && (
                <div className="mt-6 pt-6 border-t border-emerald-200">
                  <div className="bg-white rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={18} className="text-emerald-600" />
                      <h4 className="font-bold text-gray-900">{slotDetails.topic}</h4>
                    </div>
                    {slotDetails.description && (
                      <p className="text-sm text-gray-700 leading-relaxed pl-7">{slotDetails.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Section */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Additional Notes <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requirements or topics..."
                    rows={3}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium text-gray-900 placeholder-gray-400 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </div>
            </form>

            {/* Info Box */}
            <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 text-emerald-700">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-bold text-gray-900">What happens next?</p>
                <p>After payment, you'll receive a confirmation email with the Google Meet link. The teacher will also be notified.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function MeetingSchedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <MeetingScheduleContent />
    </Suspense>
  );
}
