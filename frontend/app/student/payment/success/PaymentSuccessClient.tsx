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
  const mode = searchParams.get('mode') || 'meeting';
  const isCourseMode = mode === 'course';
  const courseId = searchParams.get('course_id');

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingSlip, setDownloadingSlip] = useState(false);

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

  const handleDownloadSlip = async () => {
    if (!paymentId) return;

    setDownloadingSlip(true);
    try {
      const token = await getToken();
      const response = await api.student.getPaymentSlip(paymentId, token);
      const slip = response.data?.slip;

      if (!slip) {
        throw new Error('Slip data not available');
      }

      const lines = [
        'Little Muslimah Academy - Payment Slip',
        '--------------------------------------',
        `Payment ID: ${slip.paymentId || paymentId}`,
        `Transaction ID: ${slip.transactionId || paymentDetails?.razorpay_payment_id || 'N/A'}`,
        `Amount: ₹${slip.amount ?? paymentDetails?.amount ?? 'N/A'}`,
        `Status: ${slip.status || paymentDetails?.status || 'N/A'}`,
        `Date: ${slip.paidAt || paymentDetails?.created_at || 'N/A'}`,
        `Student: ${slip.studentName || paymentDetails?.meeting_request?.student_name || 'N/A'}`,
      ];

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-slip-${paymentId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading slip:', err);
      alert('Failed to download slip. Please try again.');
    } finally {
      setDownloadingSlip(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto mb-4"></div>
          <p className="text-emerald-800/60">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-amber-100">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h3 className="text-lg font-semibold text-emerald-950 mb-2 font-serif">Error</h3>
            <p className="text-emerald-800/60 mb-4">{error}</p>
            <button
              onClick={() => router.push('/student')}
              className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push(isCourseMode ? '/student/courses' : '/student/meetings')}
          className="mb-4 flex items-center gap-2 px-4 py-2 text-emerald-800/70 hover:text-emerald-950 hover:bg-white/50 rounded-lg transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {isCourseMode ? 'Back to My Courses' : 'Back to My Meetings'}
        </button>

        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center shadow-sm">
            <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center">
              <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-emerald-950 mb-2 font-serif">Payment Successful! 🎉</h1>
          <p className="text-emerald-800/70">{isCourseMode ? 'Your course enrollment is confirmed' : 'Your meeting has been booked successfully'}</p>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden mb-6 border border-amber-100">
          <div className="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white font-serif">Payment Details</h2>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-emerald-800/60">Payment ID</p>
                <p className="font-mono text-sm text-emerald-950 mt-1">{paymentDetails?.razorpay_payment_id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800/60">Amount Paid</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">₹{paymentDetails?.amount}</p>
              </div>
            </div>

            {/* Topic Section (meeting mode) */}
            {!isCourseMode && paymentDetails?.meeting_request?.topic && (
              <div className="bg-amber-50/50 border-2 border-amber-100 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">📚</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-emerald-900 mb-1">Islamic Learning Topic</p>
                    <p className="font-bold text-emerald-950 text-lg font-serif">{paymentDetails.meeting_request.topic}</p>
                    {paymentDetails.meeting_request.description && (
                      <p className="text-sm text-emerald-800/70 mt-2 leading-relaxed">
                        {paymentDetails.meeting_request.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isCourseMode && (
              <div className="border-t border-amber-100 pt-4">
                <h3 className="font-semibold text-emerald-950 mb-3 font-serif">Meeting Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-800/60">Student:</span>
                    <span className="font-semibold text-emerald-950">{paymentDetails?.meeting_request?.student_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-800/60">Date:</span>
                    <span className="font-semibold text-emerald-950">{paymentDetails?.meeting_request?.preferred_date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-emerald-800/60">Time:</span>
                    <span className="font-semibold text-emerald-950">
                      {paymentDetails?.meeting_request?.time_slot?.start_time} - 
                      {paymentDetails?.meeting_request?.time_slot?.end_time}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isCourseMode && (
              <div className="border-t border-amber-100 pt-4">
                <h3 className="font-semibold text-emerald-950 mb-2 font-serif">Enrollment Details</h3>
                <p className="text-sm text-emerald-800/75">
                  Your payment is verified and your enrollment is now active.
                  {courseId ? ` Course ID: ${courseId}` : ''}
                </p>
              </div>
            )}

            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium">
                ✅ <strong>Payment Status:</strong> Confirmed
              </p>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-4 mb-6">
          <h3 className="font-bold text-emerald-900 mb-2 flex items-center font-serif">
            <span className="mr-2">📧</span> What Happens Next?
          </h3>
          {isCourseMode ? (
            <ol className="text-sm text-emerald-800 space-y-2 list-decimal list-inside">
              <li>Your enrollment is now active</li>
              <li>The course appears in your My Courses dashboard</li>
              <li>You can start learning immediately</li>
              <li>Keep your payment receipt for reference</li>
            </ol>
          ) : (
            <ol className="text-sm text-emerald-800 space-y-2 list-decimal list-inside">
              <li>Admin will assign a qualified teacher within 24 hours</li>
              <li>You&apos;ll receive meeting link via email to your registered email</li>
              <li>Teacher will also receive your details and meeting link</li>
              <li>You&apos;ll get a reminder 1 hour before the meeting</li>
              <li>Meeting will appear in your dashboard</li>
            </ol>
          )}
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 mb-6">
          <h3 className="font-bold text-amber-900 mb-2 font-serif">⚠️ Important</h3>
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
              flex-1 py-3 px-6 rounded-lg font-semibold text-white shadow-lg transition-all
              ${downloadingPDF
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700'
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
            onClick={handleDownloadSlip}
            disabled={downloadingSlip}
            className={`
              flex-1 py-3 px-6 rounded-lg font-semibold border-2 transition-all
              ${downloadingSlip
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-emerald-950 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50'
              }
            `}
          >
            {downloadingSlip ? 'Preparing Slip...' : 'Download Slip'}
          </button>

          <button
            onClick={() => router.push('/student/meetings')}
            className="flex-1 py-3 px-6 rounded-lg font-semibold bg-white text-emerald-950 border-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50 transition-all"
          >
            View My Meetings
          </button>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/student')}
            className="text-amber-600 hover:text-amber-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
