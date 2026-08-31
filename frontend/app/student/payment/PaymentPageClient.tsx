'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, AlertCircle, ArrowLeft, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { user } = useUser();

  const mode = searchParams.get('mode') || 'meeting';
  const meetingRequestId = searchParams.get('meeting_request_id');
  const courseId = searchParams.get('course_id');
  const amountParam = searchParams.get('amount');
  const amount = amountParam ? parseFloat(amountParam) : 0;
  const topic = searchParams.get('topic') || '';
  const description = searchParams.get('description') || '';
  const isCoursePayment = mode === 'course';

  const studentName = searchParams.get('student_name') || '';
  const studentEmail = searchParams.get('student_email') || '';
  const studentPhone = searchParams.get('student_phone') || '';
  const studentCity = searchParams.get('student_city') || '';
  const studentCountry = searchParams.get('student_country') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (window.Razorpay) return true;

    const existingScript = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;
    if (existingScript) {
      return new Promise((resolve) => {
        existingScript.addEventListener('load', () => resolve(true), { once: true });
        existingScript.addEventListener('error', () => resolve(false), { once: true });
      });
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!Number.isFinite(amount) || amount <= 0) {
      // A free meeting is booked by the scheduling endpoint after its price is
      // verified on the server. Never let a URL query parameter manufacture a
      // payment-success screen.
      setError('This payment link is invalid or no longer requires payment. Please return to your booking.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await getToken();

      // Create Razorpay order on backend
      const orderResponse = isCoursePayment
        ? await api.student.createPaymentOrder(courseId!, token)
        : await api.payments.createOrder({
            meeting_request_id: meetingRequestId!,
            amount: amount,
          }, token);

      const order = orderResponse.data;
      const razorpayKey = order?.key_id || order?.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const normalizedRazorpayKey = String(razorpayKey || '').trim();

      if (!normalizedRazorpayKey || normalizedRazorpayKey === 'undefined' || normalizedRazorpayKey === 'null') {
        throw new Error('Razorpay key is missing. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID in frontend env or RAZORPAY_KEY_ID in backend env.');
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your network and try again.');
      }

      // Razorpay checkout options
      const options = {
        key: normalizedRazorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Islamic Academy',
        description: isCoursePayment ? 'Course Enrollment Fee' : 'Meeting Consultation Fee',
        order_id: order.id || order.order_id,
        prefill: {
          name: studentName || user?.fullName || '',
          email: studentEmail || user?.emailAddresses[0]?.emailAddress || '',
          contact: studentPhone || '',
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async function (response: any) {
          try {
            const freshToken = await getToken();
            const verifyResponse = isCoursePayment
              ? await api.student.verifyPayment(
                  response.razorpay_order_id,
                  response.razorpay_payment_id,
                  response.razorpay_signature,
                  freshToken,
                )
              : await api.payments.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  meeting_request_id: meetingRequestId!,
                }, freshToken);

            if (verifyResponse.data.success) {
              const paymentId = verifyResponse.data.payment?.id || response.razorpay_payment_id;
              if (isCoursePayment && courseId) {
                router.push(`/student/payment/success?payment_id=${paymentId}&mode=course&course_id=${courseId}`);
              } else {
                router.push(`/student/payment/success?payment_id=${paymentId}`);
              }
            } else {
              setError('Payment verification failed.');
              setIsLoading(false);
            }
          } catch (err) {
            console.error('Verification error', err);
            setError('Payment verification failed.');
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.response?.data?.error || err?.message || 'Failed to initiate payment');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] p-8 pb-20">
      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center text-slate-500 hover:text-slate-800 mb-8 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2 font-serif">Complete Payment</h1>
              <p className="text-slate-500">{isCoursePayment ? 'Secure payment for your course enrollment' : 'Secure payment for your session'}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-center">
                {error}
              </div>
            )}

            {/* Detail Summary */}
            {(topic || description) && (
              <div className="bg-[#FDFBF7] border border-amber-100 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <BookOpen size={18} />
                  {isCoursePayment ? 'Course Details' : 'Session Details'}
                </h3>
                {topic && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-slate-500 mb-1">Topic</p>
                    <p className="text-base font-semibold text-slate-800">{topic}</p>
                  </div>
                )}
                {description && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-600">{description}</p>
                  </div>
                )}
              </div>
            )}

            {isCoursePayment && (studentName || studentEmail || studentPhone) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-bold text-emerald-800 mb-3">Enrollment Details</h3>
                <div className="text-sm text-emerald-900 space-y-1.5">
                  {studentName && <p><span className="text-emerald-700">Name:</span> {studentName}</p>}
                  {studentEmail && <p><span className="text-emerald-700">Email:</span> {studentEmail}</p>}
                  {studentPhone && <p><span className="text-emerald-700">Phone:</span> {studentPhone}</p>}
                  {(studentCity || studentCountry) && <p><span className="text-emerald-700">Location:</span> {[studentCity, studentCountry].filter(Boolean).join(', ')}</p>}
                </div>
              </div>
            )}

            <div className="bg-stone-50 rounded-xl p-6 mb-8 border border-stone-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600">{isCoursePayment ? 'Course Fee' : 'Session Fee'}</span>
                <span className="text-xl font-bold text-slate-800">
                  {amount === 0 ? 'Free' : `₹${amount}`}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600">Platform Fee</span>
                <span className="text-slate-800">₹0.00</span>
              </div>
              <div className="h-px bg-stone-200 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-slate-800">Total</span>
                <span className="text-2xl font-bold text-amber-700">
                  {amount === 0 ? 'Free' : `₹${amount}`}
                </span>
              </div>
            </div>

            {/* Payment method selection removed - Razorpay checkout handles all payment options (Card, UPI, Netbanking, Wallets) */}

            <button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-all shadow-lg shadow-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : amount === 0 ? 'Confirm Enrollment' : `Pay ₹${amount}`}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <CheckCircle2 size={16} className="text-amber-600" />
              <span>Secure SSL Encryption</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
