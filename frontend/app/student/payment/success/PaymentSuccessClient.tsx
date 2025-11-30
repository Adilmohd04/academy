'use client';

/**
 * Payment Success Page
 * 
 * Shows payment confirmation and allows downloading payment receipt PDF
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';

interface PaymentDetails {
  id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  meeting_request?: {
    id: string;
    student_name: string;
    student_email: string;
    student_phone: string;
    preferred_date: string;
    topic?: string;
    description?: string;
    time_slot?: {
      slot_name: string;
      start_time: string;
      end_time: string;
    };
  };
}

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();

  const paymentId = searchParams.get('payment_id');

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  useEffect(() => {
    if (paymentId) {
      loadPaymentDetails();
    } else {
      setError('No payment ID found');
      setLoading(false);
    }
  }, [paymentId]);

  const loadPaymentDetails = async () => {
    try {
      const token = await getToken();
      const response = await api.payments.getPaymentById(paymentId!, token);
      console.log('Payment details loaded:', response.data);
      setPaymentDetails(response.data);
    } catch (err) {
      console.error('Error loading payment details:', err);
      setError('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const token = await getToken();
      
      // Call the PDF receipt generation endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}/receipt`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate receipt');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-receipt-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading receipt:', err);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/student')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/student/meetings')}
          className="mb-4 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to My Meetings
        </button>

        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-4 animate-bounce">
            <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h1>
          <p className="text-gray-600">Your meeting has been booked successfully</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Payment Details</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Payment ID</p>
                <p className="font-mono text-sm text-gray-900 mt-1">{paymentDetails?.razorpay_payment_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">₹{paymentDetails?.amount}</p>
              </div>
            </div>

            {/* Islamic Topic Section */}
            {paymentDetails?.meeting_request?.topic && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">📚</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-900 mb-1">Islamic Learning Topic</p>
                    <p className="font-bold text-purple-800 text-lg">{paymentDetails.meeting_request.topic}</p>
                    {paymentDetails.meeting_request.description && (
                      <p className="text-sm text-purple-700 mt-2 leading-relaxed">
                        {paymentDetails.meeting_request.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Meeting Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Student:</span>
                  <span className="font-semibold text-gray-900">{paymentDetails?.meeting_request?.student_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Date:</span>
                  <span className="font-semibold text-gray-900">{paymentDetails?.meeting_request?.preferred_date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Time:</span>
                  <span className="font-semibold text-gray-900">
                    {paymentDetails?.meeting_request?.time_slot?.start_time} - 
                    {paymentDetails?.meeting_request?.time_slot?.end_time}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium">
                ✅ <strong>Payment Status:</strong> Confirmed
              </p>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center">
            <span className="mr-2">📧</span> What Happens Next?
          </h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Admin will assign a qualified teacher within 24 hours</li>
            <li>You'll receive meeting link via email to your registered email</li>
            <li>Teacher will also receive your details and meeting link</li>
            <li>You'll get a reminder 1 hour before the meeting</li>
            <li>Meeting will appear in your dashboard</li>
          </ol>
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-6">
          <h3 className="font-bold text-amber-900 mb-2">⚠️ Important</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• This payment is non-refundable</li>
            <li>• Meeting cannot be rescheduled once confirmed</li>
            <li>• Keep your payment receipt for future reference</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className={`
              flex-1 py-3 px-6 rounded-lg font-semibold text-white
              ${downloadingPDF
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              }
            `}
          >
            {downloadingPDF ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </span>
            ) : (
              <>
                <span className="mr-2">📄</span> Download Receipt
              </>
            )}
          </button>

          <button
            onClick={() => router.push('/student/meetings')}
            className="flex-1 py-3 px-6 rounded-lg font-semibold bg-white text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          >
            View My Meetings
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/student')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
