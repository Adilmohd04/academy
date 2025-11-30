'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Package, Users, Clock, Calendar, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface Student {
  requestId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  notes: string;
  paymentStatus: string;
  amount: number;
  requestedAt: string;
}

interface Box {
  boxId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
  slotName: string;
  maxCapacity: number;
  currentBookings: number;
  deadlineUtc: string;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED' | 'APPROVED';
  students: Student[];
}

export default function BoxApprovalPage() {
  const { getToken } = useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [meetingLinks, setMeetingLinks] = useState<{[boxId: string]: string}>({});

  useEffect(() => {
    loadBoxes();
  }, []);

  const loadBoxes = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boxes/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setBoxes(result.data);
      }
    } catch (error) {
      console.error('Error loading boxes:', error);
      setMessage({ type: 'error', text: 'Failed to load boxes' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBox = async (boxId: string) => {
    try {
      setApproving(boxId);
      const token = await getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/boxes/${boxId}/approve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ meetingLink: meetingLinks[boxId] || null })
        }
      );

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: result.message });
        loadBoxes();
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error('Failed to approve box');
      }
    } catch (error) {
      console.error('Error approving box:', error);
      setMessage({ type: 'error', text: 'Failed to approve box' });
    } finally {
      setApproving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      OPEN: { color: 'bg-blue-100 text-blue-800', icon: Package, text: 'Open' },
      PARTIAL: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'Partial' },
      CLOSED: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Closed' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Approved' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.OPEN;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getDeadlineStatus = (deadlineUtc: string) => {
    const deadline = new Date(deadlineUtc);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) {
      return { text: 'EXPIRED', color: 'text-red-600' };
    } else if (hoursLeft < 3) {
      return { text: `${Math.floor(hoursLeft)}h ${Math.floor((hoursLeft % 1) * 60)}m left`, color: 'text-orange-600' };
    } else {
      return { text: `${Math.floor(hoursLeft)}h left`, color: 'text-green-600' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading boxes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Box Approval System</h1>
                <p className="text-gray-500 mt-1">Batch approve students grouped by slot</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-indigo-600">{boxes.length}</div>
              <div className="text-sm text-gray-500">Active Boxes</div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">📦 What is a Box?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• <strong>Box = One Teacher Slot</strong> (Teacher + Date + Time)</li>
            <li>• <strong>Students book same slot</strong> → They join the same box</li>
            <li>• <strong>Batch Approval</strong> → Approve all students in box at once</li>
            <li>• <strong>Auto-Close</strong> → Box closes 3 hours before meeting OR when full</li>
          </ul>
        </div>

        {/* Boxes Grid */}
        <div className="grid gap-6">
          {boxes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Boxes</h3>
              <p className="text-gray-500">All boxes are approved or no bookings yet</p>
            </div>
          ) : (
            boxes.map((box) => {
              const deadlineStatus = getDeadlineStatus(box.deadlineUtc);
              
              return (
                <div key={box.boxId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  {/* Box Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{box.teacherName}</h3>
                        {getStatusBadge(box.status)}
                      </div>
                      <p className="text-sm text-gray-500">{box.teacherEmail}</p>
                      
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {new Date(box.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">{box.startTime} - {box.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users className="w-4 h-4" />
                          <span className="text-sm font-medium">{box.currentBookings}/{box.maxCapacity} Booked</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${deadlineStatus.color}`}>
                        ⏰ {deadlineStatus.text}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Deadline: {new Date(box.deadlineUtc).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      📋 Students ({box.students.length})
                    </h4>
                    <div className="space-y-2">
                      {box.students.map((student, idx) => (
                        <div key={student.requestId} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{student.studentName}</div>
                              <div className="text-xs text-gray-500">{student.studentEmail} • {student.studentPhone}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">₹{student.amount}</div>
                            <div className={`text-xs ${
                              student.paymentStatus === 'success' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {student.paymentStatus === 'success' ? '✓ Paid' : '⏳ Pending'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meeting Link Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meeting Link (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={meetingLinks[box.boxId] || ''}
                        onChange={(e) => setMeetingLinks({ ...meetingLinks, [box.boxId]: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                        placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      />
                      <ExternalLink className="w-5 h-5 text-gray-400 self-center" />
                    </div>
                  </div>

                  {/* Approve Button */}
                  <button
                    onClick={() => handleApproveBox(box.boxId)}
                    disabled={approving === box.boxId || box.status === 'APPROVED'}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {approving === box.boxId ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Approving...
                      </>
                    ) : box.status === 'APPROVED' ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Already Approved
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Approve Box ({box.students.length} Students)
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
