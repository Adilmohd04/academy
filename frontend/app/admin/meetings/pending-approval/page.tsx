'use client';

/**
 * Admin Meeting Approval Dashboard
 * 
 * Features:
 * - List all pending meeting bookings
 * - Approve/Reject with reasons
 * - Meeting link generation
 * - Beautiful gradient UI
 * - Real-time status updates
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Calendar, 
  Mail,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Phone,
  ChevronLeft
} from 'lucide-react';

interface PendingBooking {
  id: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  teacherId: string;
  meetingDate: string;
  timeSlotId: string;
  slotName?: string;
  startTime?: string;
  endTime?: string;
  paymentStatus: string;
  paymentAmount?: number;
  approvalStatus: string;
  notes?: string;
  createdAt: string;
}

export default function AdminApprovalPage() {
  const { getToken } = useAuth();
  
  // State
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [meetingLinks, setMeetingLinks] = useState<{ [key: string]: string }>({});
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPendingBookings();
  }, []);

  const loadPendingBookings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/admin/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setBookings(data.data || []);
      
    } catch (err) {
      console.error('Error loading bookings:', err);
      setError('Failed to load pending bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    const meetingLink = meetingLinks[bookingId];
    
    if (!meetingLink || !meetingLink.trim()) {
      setError('Please enter a meeting link before approving');
      return;
    }
    
    try {
      setProcessing(bookingId);
      setError('');
      const token = await getToken();
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved', meeting_link: meetingLink })
      });
      
      setSuccess('Booking approved successfully!');
      
      // Remove from list
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error approving booking:', err);
      setError('Failed to approve booking');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (bookingId: string) => {
    const reason = rejectionReasons[bookingId];
    
    if (!reason || !reason.trim()) {
      setError('Please enter a rejection reason');
      return;
    }
    
    try {
      setProcessing(bookingId);
      setError('');
      const token = await getToken();
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected', admin_notes: reason })
      });
      
      setSuccess('Booking rejected');
      
      // Remove from list
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error rejecting booking:', err);
      setError('Failed to reject booking');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading pending bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Pending Meeting Approvals
          </h1>
          <p className="text-gray-600">
            Review and approve student meeting bookings
          </p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700">{success}</p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-800">{bookings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Bookings</p>
                <p className="text-2xl font-bold text-gray-800">
                  {bookings.filter(b => b.paymentStatus === 'paid').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Today's Meetings</p>
                <p className="text-2xl font-bold text-gray-800">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              All Caught Up!
            </h3>
            <p className="text-gray-600">
              No pending bookings to review at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {booking.studentName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {booking.studentEmail}
                        </div>
                        {booking.studentPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {booking.studentPhone}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {booking.paymentStatus === 'paid' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                          ✓ Paid
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                          Pending Payment
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meeting Details */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-600">Date</p>
                        <p className="font-semibold text-gray-800">
                          {formatDate(booking.meetingDate)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-600">Time</p>
                        <p className="font-semibold text-gray-800">
                          {booking.startTime || 'N/A'} - {booking.endTime || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {booking.notes && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Student Notes:</p>
                      <p className="text-sm text-blue-800">{booking.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Approve Section */}
                    <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <label className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Meeting Link (Google Meet / Zoom)
                      </label>
                      <input
                        type="url"
                        value={meetingLinks[booking.id] || ''}
                        onChange={(e) => setMeetingLinks(prev => ({
                          ...prev,
                          [booking.id]: e.target.value
                        }))}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-3"
                      />
                      <button
                        onClick={() => handleApprove(booking.id)}
                        disabled={processing === booking.id}
                        className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processing === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Approve Booking
                          </>
                        )}
                      </button>
                    </div>

                    {/* Reject Section */}
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <label className="text-sm font-semibold text-red-900 mb-2 block">
                        Rejection Reason
                      </label>
                      <textarea
                        value={rejectionReasons[booking.id] || ''}
                        onChange={(e) => setRejectionReasons(prev => ({
                          ...prev,
                          [booking.id]: e.target.value
                        }))}
                        placeholder="Why are you rejecting this booking?"
                        rows={2}
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-3 resize-none text-gray-900 bg-white placeholder-gray-400"
                      />
                      <button
                        onClick={() => handleReject(booking.id)}
                        disabled={processing === booking.id}
                        className="w-full py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processing === booking.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Reject Booking
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
