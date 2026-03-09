'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Calendar, Clock, User, DollarSign, Phone, FileText, Loader2, CheckCircle, ArrowLeft, ChevronRight, AlertCircle, Info, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { IslamicLoader } from '@/components/ui/IslamicLoader';

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

  // Note: Role check handled by middleware.ts - no need to block here
  // This prevents issues with first-time users where publicMetadata hasn't loaded yet

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

    loadSlotDetailsAndPrice();
  }, []);

  const loadSlotDetailsAndPrice = async () => {
    await loadSlotDetails();
    // loadMeetingPrice will be called after slotDetails is loaded
  };

  // Separate effect to load price after slot details are available
  useEffect(() => {
    if (slotDetails && !meetingPriceParam && !isFreeParam) {
      loadMeetingPrice();
    }
  }, [slotDetails]);

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

      // Check if slot is free from slot details first
      if (slotDetails?.is_free === true || slotDetails?.meeting_price === 0 || slotDetails?.custom_price === 0) {
        console.log('🎉 Free slot detected from slot details, setting price to 0');
        setMeetingPrice(0);
        return;
      }

      // Check for custom price on the slot
      if (slotDetails?.custom_price !== null && slotDetails?.custom_price !== undefined) {
        console.log('💰 Using custom price from slot:', slotDetails.custom_price);
        setMeetingPrice(parseFloat(slotDetails.custom_price));
        return;
      }

      // Check for meeting_price on the slot
      if (slotDetails?.meeting_price !== null && slotDetails?.meeting_price !== undefined) {
        console.log('💰 Using meeting price from slot:', slotDetails.meeting_price);
        setMeetingPrice(parseFloat(slotDetails.meeting_price));
        return;
      }

      // Fallback to teacher pricing
      try {
        const teacherPriceResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/teacher-pricing/${teacherId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (teacherPriceResponse.ok) {
          const teacherPriceData = await teacherPriceResponse.json();
          if (teacherPriceData.is_free === true || teacherPriceData.price === 0) {
            console.log('🎉 Teacher has free pricing');
            setMeetingPrice(0);
          } else {
            setMeetingPrice(teacherPriceData.price);
          }
          return;
        }
      } catch (teacherPriceError) {
        // Ignore
      }

      // Final fallback to global price
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
        <div className="text-center">
          <IslamicLoader size="lg" className="mx-auto mb-6" />
          <p className="text-slate-500 font-arabic text-lg">جار التحميل...</p>
        </div>
      </div>
    );
  }

  if (error && !slotDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 p-12 max-w-md text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-red-600">
            ❌
          </div>
          <h2 className="text-2xl font-bold text-emerald-950 font-serif mb-3">Oops! Something went wrong</h2>
          <p className="text-emerald-800/60 mb-8">{error}</p>
          <button
            onClick={() => router.push('/student/meetings/select-teacher')}
            className="w-full px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-semibold hover:from-amber-700 hover:to-yellow-700 transition-all shadow-lg"
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
    <div className="min-h-screen bg-transparent p-8 pb-20">

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto relative z-10"
      >
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-emerald-800/70 hover:text-emerald-950 transition-colors mb-6 group"
          >
            <div className="p-2 rounded-lg bg-white/80 border border-amber-100 group-hover:border-amber-300 group-hover:bg-amber-50 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-3xl font-bold text-emerald-950 font-serif mb-2">Confirm Booking</h1>
          <p className="text-emerald-800/60">Review the details and complete your reservation</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
          {/* Slot Details Card */}
          {slotDetails && (
            <div className="p-8 border-b border-amber-100 bg-amber-50/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-emerald-950 font-serif">Session Details</h3>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-800/60 uppercase tracking-wider">Teacher</span>
                  <div className="flex items-center gap-2 text-emerald-950 font-bold">
                    <User className="w-4 h-4 text-amber-600" />
                    {slotDetails.teacher_name}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-800/60 uppercase tracking-wider">Date & Time</span>
                  <div className="flex items-center gap-2 text-emerald-950 font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    {new Date(date!).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' })} • {formatTime12h(slotDetails.start_time)}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-800/60 uppercase tracking-wider">Price</span>
                  <div className="flex items-center gap-2 font-bold">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    {meetingPrice === 0 ? (
                      <span className="text-emerald-600">Free Session</span>
                    ) : (
                      <span className="text-emerald-950">₹{meetingPrice}</span>
                    )}
                  </div>
                </div>

                {slotDetails.remaining_capacity !== null && slotDetails.remaining_capacity !== undefined && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-800/60 uppercase tracking-wider">Availability</span>
                    <div className="flex items-center gap-2 text-emerald-950 font-bold">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                      {slotDetails.is_unlimited ? 'Unlimited' : `${slotDetails.remaining_capacity || 'Limited'} spots left`}
                    </div>
                  </div>
                )}
              </div>

              {slotDetails.topic && (
                <div className="mt-6 pt-6 border-t border-amber-200">
                  <div className="bg-[#FDFBF7] rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-emerald-950">{slotDetails.topic}</h4>
                    </div>
                    {slotDetails.description && (
                      <p className="text-sm text-emerald-800/80 leading-relaxed">{slotDetails.description}</p>
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
                <label className="block text-sm font-bold text-emerald-950 mb-2">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-800/40" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none font-medium text-emerald-950 placeholder-emerald-800/40"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-semibold hover:from-amber-700 hover:to-yellow-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : (meetingPrice === 0 ? 'Confirm Booking' : 'Proceed to Payment')}
                </button>
              </div>
            </form>

            {/* Info Box */}
            <div className="mt-8 bg-[#FDFBF7] border border-amber-100 rounded-xl p-5 flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-amber-700">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-sm text-emerald-800/70 space-y-1">
                <p className="font-bold text-emerald-950">What happens next?</p>
                <p>After payment, you&apos;ll receive a confirmation email with the Google Meet link. The teacher will also be notified.</p>
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
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
        <IslamicLoader size="lg" />
      </div>
    }>
      <MeetingScheduleContent />
    </Suspense>
  );
}
