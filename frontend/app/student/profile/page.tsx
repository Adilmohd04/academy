'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Mail, Save, Loader2, Camera, CreditCard, Download, Calendar, CheckCircle, Clock, XCircle, BookOpen, Video, Receipt, ChevronDown, ChevronUp, ExternalLink, FileText, DollarSign, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { IslamicLoader } from '@/components/ui/IslamicLoader';

interface PaymentCourse {
  id: string;
  title: string;
  course_image_url?: string;
}

interface PaymentMeeting {
  id: string;
  preferred_date?: string;
  topic?: string;
  description?: string;
  time_slot?: {
    slot_name: string;
    start_time: string;
    end_time: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_type: string;
  created_at: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  course?: PaymentCourse | null;
  meeting?: PaymentMeeting | null;
}

export default function StudentProfilePage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: (user.unsafeMetadata?.phone as string) || '',
      });
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    setLoadingPayments(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/student/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-clerk-user-id': user?.id || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : (data.payments || []));
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/${paymentId}/receipt`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-clerk-user-id': user?.id || ''
        }
      });
      
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/pdf')) {
          // PDF receipt — download as file
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `receipt-${paymentId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          toast.success('Receipt downloaded successfully');
        } else {
          // JSON receipt — generate a printable HTML receipt and download
          const data = await res.json();
          const receipt = data.receipt || data;
          generateHTMLReceipt(paymentId, receipt);
          toast.success('Receipt downloaded successfully');
        }
      } else {
        toast.error('Receipt not available for this payment');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  /** Generate a clean HTML receipt and trigger print/download */
  const generateHTMLReceipt = (paymentId: string, receipt: any) => {
    const html = `
      <!DOCTYPE html>
      <html><head><title>Payment Receipt - ${receipt.receiptNumber || paymentId}</title>
      <style>
        body { font-family: 'Georgia', serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
        .header { text-align: center; border-bottom: 3px double #b45309; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 24px; color: #92400e; margin: 0; }
        .header p { color: #666; margin: 5px 0 0; font-size: 13px; }
        .receipt-no { background: #fef3c7; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: bold; margin-top: 15px; }
        .section { margin-bottom: 24px; }
        .section h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #92400e; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #e5e7eb; }
        .row .label { color: #6b7280; font-size: 13px; }
        .row .value { font-weight: 600; font-size: 13px; }
        .total { font-size: 20px; text-align: center; padding: 16px; background: #f0fdf4; border-radius: 8px; margin: 20px 0; }
        .total .amount { font-size: 28px; color: #166534; font-weight: bold; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
        @media print { body { margin: 0; } }
      </style></head><body>
        <div class="header">
          <h1>Islamic Academy</h1>
          <p>Payment Receipt</p>
          <div class="receipt-no">${receipt.receiptNumber || 'RCPT-' + paymentId.slice(0, 8).toUpperCase()}</div>
        </div>
        <div class="section">
          <h3>Student Information</h3>
          <div class="row"><span class="label">Name</span><span class="value">${receipt.student?.name || user?.fullName || 'Student'}</span></div>
          <div class="row"><span class="label">Email</span><span class="value">${receipt.student?.email || user?.primaryEmailAddress?.emailAddress || ''}</span></div>
        </div>
        <div class="section">
          <h3>Payment Details</h3>
          <div class="row"><span class="label">Date</span><span class="value">${new Date(receipt.date || receipt.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
          <div class="row"><span class="label">Method</span><span class="value">${receipt.payment?.method || 'Online Payment'}</span></div>
          <div class="row"><span class="label">Transaction ID</span><span class="value">${receipt.payment?.transactionId || 'N/A'}</span></div>
          <div class="row"><span class="label">Status</span><span class="value" style="color:#166534">${(receipt.payment?.status || 'completed').toUpperCase()}</span></div>
        </div>
        ${receipt.course ? `<div class="section"><h3>Course</h3><div class="row"><span class="label">Title</span><span class="value">${receipt.course.title}</span></div><div class="row"><span class="label">Instructor</span><span class="value">${receipt.course.instructor || 'N/A'}</span></div></div>` : ''}
        <div class="total"><div>Amount Paid</div><div class="amount">${receipt.payment?.currency || '₹'}${receipt.payment?.amount || 0}</div></div>
        <div class="footer"><p>JazakAllah Khair for your payment!</p><p>For queries: support@yourislamicacademy.com</p></div>
      </body></html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.onload = () => win.print();
    }
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (amount === 0) return 'Free';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getPaymentTitle = (payment: Payment): string => {
    if (payment.payment_type === 'course_enrollment' && payment.course?.title) {
      return payment.course.title;
    }
    if (payment.meeting?.topic) {
      return payment.meeting.topic;
    }
    return payment.payment_type === 'course_enrollment' ? 'Course Enrollment' : 'Meeting Session';
  };

  const getPaymentTypeIcon = (payment: Payment) => {
    if (payment.payment_type === 'course_enrollment') {
      return <BookOpen className="w-5 h-5 text-amber-600" />;
    }
    return <Video className="w-5 h-5 text-emerald-600" />;
  };

  const getPaymentTypeBadge = (payment: Payment) => {
    if (payment.payment_type === 'course_enrollment') {
      return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">Course</span>;
    }
    return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Meeting</span>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await user.update({
        firstName: formData.firstName,
        lastName: formData.lastName,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          phone: formData.phone,
        },
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <IslamicLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 font-serif mb-2">My Profile</h1>
        <p className="text-slate-500">Manage your personal information and account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1"
        >
          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-stone-100 border-b border-stone-200"></div>
            
            <div className="relative z-10 -mt-4 mb-4">
              <div className="w-24 h-24 mx-auto rounded-full border-4 border-white shadow-sm overflow-hidden bg-stone-100 relative group">
                <img 
                  src={user?.imageUrl} 
                  alt={user?.fullName || 'User'} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 font-serif mb-1">{user?.fullName}</h2>
            <p className="text-sm text-slate-500 mb-4">Student</p>

            <div className="flex items-center justify-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 py-2 rounded-lg border border-amber-100">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Active Account
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2"
        >
          <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 font-serif mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              Personal Information
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all outline-none text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <div className="relative opacity-70">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={user?.primaryEmailAddress?.emailAddress || ''}
                    disabled
                    className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-slate-600 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1 ml-1">Email address cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-amber-700 text-white rounded-xl font-semibold hover:bg-amber-800 transition-all shadow-lg shadow-amber-100 disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Payment History Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800 font-serif flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-slate-400" />
              Payment History
            </h3>
            {payments.length > 0 && (
              <span className="text-sm text-slate-500">
                {payments.length} transaction{payments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-14 h-14 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No payment history yet</p>
              <p className="text-sm text-slate-400 mt-1">Your payment records will appear here after enrollment or booking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => {
                const isExpanded = expandedPayment === payment.id;
                const isPaid = payment.status === 'completed' || payment.status === 'paid';
                const isPending = payment.status === 'pending';
                
                return (
                  <div 
                    key={payment.id}
                    className={`border rounded-xl overflow-hidden transition-all ${
                      isExpanded ? 'border-amber-300 shadow-md' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {/* Main Row */}
                    <div 
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                      onClick={() => setExpandedPayment(isExpanded ? null : payment.id)}
                    >
                      {/* Type Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        payment.payment_type === 'course_enrollment' ? 'bg-amber-50' : 'bg-emerald-50'
                      }`}>
                        {getPaymentTypeIcon(payment)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-800 truncate text-sm">
                            {getPaymentTitle(payment)}
                          </h4>
                          {getPaymentTypeBadge(payment)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(payment.created_at).toLocaleDateString('en-US', { 
                              month: 'short', day: 'numeric', year: 'numeric' 
                            })}
                          </span>
                          {payment.razorpay_payment_id && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Hash className="w-3 h-3" />
                              ...{payment.razorpay_payment_id.slice(-8)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status + Amount */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                          isPaid
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : isPending
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {isPaid ? <CheckCircle className="w-3 h-3" /> 
                           : isPending ? <Clock className="w-3 h-3" /> 
                           : <XCircle className="w-3 h-3" />}
                          {isPaid ? 'Paid' : isPending ? 'Pending' : payment.status}
                        </span>
                        <p className="text-base font-bold text-slate-800 min-w-[60px] text-right">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-stone-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                              {/* Transaction Details */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Details</h5>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Payment ID</span>
                                    <span className="font-mono text-xs text-slate-700">{payment.id.slice(0, 16)}...</span>
                                  </div>
                                  {payment.razorpay_payment_id && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Razorpay ID</span>
                                      <span className="font-mono text-xs text-slate-700">{payment.razorpay_payment_id}</span>
                                    </div>
                                  )}
                                  {payment.razorpay_order_id && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Order ID</span>
                                      <span className="font-mono text-xs text-slate-700">{payment.razorpay_order_id}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="font-semibold text-slate-800">
                                      {formatCurrency(payment.amount, payment.currency)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Currency</span>
                                    <span className="text-slate-700">{payment.currency || 'INR'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Date & Time</span>
                                    <span className="text-slate-700">
                                      {new Date(payment.created_at).toLocaleString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`font-medium ${
                                      isPaid ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      {isPaid ? 'Completed' : isPending ? 'Pending' : payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Item Details */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  {payment.payment_type === 'course_enrollment' ? 'Course Details' : 'Meeting Details'}
                                </h5>
                                
                                <div className="space-y-2 text-sm">
                                  {payment.course && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500">Course</span>
                                        <span className="text-slate-700 font-medium text-right max-w-[200px] truncate">{payment.course.title}</span>
                                      </div>
                                    </>
                                  )}
                                  {payment.meeting && (
                                    <>
                                      {payment.meeting.topic && (
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Topic</span>
                                          <span className="text-slate-700 font-medium text-right max-w-[200px] truncate">{payment.meeting.topic}</span>
                                        </div>
                                      )}
                                      {payment.meeting.preferred_date && (
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Session Date</span>
                                          <span className="text-slate-700">
                                            {new Date(payment.meeting.preferred_date).toLocaleDateString('en-US', {
                                              weekday: 'short', month: 'short', day: 'numeric'
                                            })}
                                          </span>
                                        </div>
                                      )}
                                      {payment.meeting.time_slot && (
                                        <div className="flex justify-between">
                                          <span className="text-slate-500">Time Slot</span>
                                          <span className="text-slate-700">
                                            {payment.meeting.time_slot.slot_name || `${payment.meeting.time_slot.start_time} - ${payment.meeting.time_slot.end_time}`}
                                          </span>
                                        </div>
                                      )}
                                      {payment.meeting.description && (
                                        <div className="mt-2">
                                          <span className="text-slate-500 text-xs">Description</span>
                                          <p className="text-slate-600 text-xs mt-1 line-clamp-3">{payment.meeting.description}</p>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Type</span>
                                    <span className="text-slate-700">
                                      {payment.payment_type === 'course_enrollment' ? 'Course Enrollment' : 'Meeting Booking'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Download Receipt Button */}
                            {isPaid && (
                              <div className="mt-4 pt-4 border-t border-stone-100 flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadReceipt(payment.id);
                                  }}
                                  disabled={downloadingId === payment.id}
                                  className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                                >
                                  {downloadingId === payment.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Downloading...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-4 h-4" />
                                      Download Receipt
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
