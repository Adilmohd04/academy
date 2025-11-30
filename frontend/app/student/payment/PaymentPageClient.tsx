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

  const meetingRequestId = searchParams.get('meeting_request_id');
  const amountParam = searchParams.get('amount');
  const amount = amountParam ? parseFloat(amountParam) : 0;
  const topic = searchParams.get('topic') || '';
  const description = searchParams.get('description') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('card');
  const [error, setError] = useState('');

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    if (amount === 0) {
      // Handle free booking
      router.push('/student/payment/success');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = await getToken();

      // Create Razorpay order on backend
      const orderResponse = await api.payments.createOrder({
        meeting_request_id: meetingRequestId!,
        amount: amount,
      }, token);

      const order = orderResponse.data;

      // Razorpay checkout options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Islamic Academy',
        description: 'Meeting Consultation Fee',
        order_id: order.id,
        prefill: {
          name: user?.fullName || '',
          email: user?.emailAddresses[0]?.emailAddress || '',
          contact: '', // Can be added if available
        },
        theme: {
          color: '#4F46E5',
        },
        handler: async function (response: any) {
          try {
            const freshToken = await getToken();
            const verifyResponse = await api.payments.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              meeting_request_id: meetingRequestId!,
            }, freshToken);

            if (verifyResponse.data.success) {
              const paymentId = verifyResponse.data.payment?.id || response.razorpay_payment_id;
              router.push(`/student/payment/success?payment_id=${paymentId}`);
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
      setError(err.response?.data?.error || 'Failed to initiate payment');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 pb-20">
      {/* Islamic Pattern Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}/>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
              <p className="text-gray-600">Secure payment for your session</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-center">
                {error}
              </div>
            )}

            {/* Session Details */}
            {(topic || description) && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <BookOpen size={18} />
                  Session Details
                </h3>
                {topic && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-600 mb-1">Topic</p>
                    <p className="text-base font-semibold text-gray-900">{topic}</p>
                  </div>
                )}
                {description && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Description</p>
                    <p className="text-sm text-gray-700">{description}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-emerald-50 rounded-xl p-6 mb-8 border border-emerald-200">\n              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Session Fee</span>
                <span className="text-xl font-bold text-gray-900">
                  {amount === 0 ? 'Free' : `₹${amount}`}
                </span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Platform Fee</span>
                <span className="text-gray-900">₹0.00</span>
              </div>
              <div className="h-px bg-emerald-200 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {amount === 0 ? 'Free' : `₹${amount}`}
                </span>
              </div>
            </div>

            {amount > 0 && (
              <div className="space-y-4 mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'card'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                      }`}
                  >
                    <CreditCard size={24} />
                    <span className="text-sm font-medium">Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'upi'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                      }`}
                  >
                    <div className="w-6 h-6 rounded bg-current opacity-50" />
                    <span className="text-sm font-medium">UPI</span>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : amount === 0 ? 'Confirm Booking' : `Pay ₹${amount}`}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Secure SSL Encryption</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
