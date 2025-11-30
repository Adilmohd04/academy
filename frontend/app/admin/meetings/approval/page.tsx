'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle, Link as LinkIcon, Mail } from 'lucide-react';


interface Student {
  // Frontend fields
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  amount?: number;
  is_free?: boolean;
  // Backend fields
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  requestId?: string;
  paymentStatus?: string;
  notes?: string;
  requestedAt?: string;
}


interface Box {
  // Frontend fields
  boxId: string;
  teacherId: string;
  teacherName: string;
  date: string;
  timeSlot?: string;
  startTime?: string;
  endTime?: string;
  currentBookings: number;
  maxCapacity: number;
  deadlineUtc?: string;
  hoursUntilDeadline?: number;
  status: string; // Accept any string to avoid TS error from backend
  students: Student[];
  // Backend fields
  slotName?: string;
  timeSlotId?: string;
  teacherEmail?: string;
}

export default function MeetingApprovalPage() {
  // Helper to check if box is not closed or approved (for TS type safety)
  // Helper to check if box is not closed or approved (for TS type safety)
  // Also, treat as CLOSED only if hoursUntilDeadline < 0 (deadline passed)
  const isBoxPending = (box: Box) => {
    // If deadlineUtc is missing or invalid, treat as pending (not closed)
    if (!box.deadlineUtc || isNaN(new Date(box.deadlineUtc).getTime())) return true;
    // If hoursUntilDeadline is defined and < 0, treat as closed
    if (typeof box.hoursUntilDeadline === 'number' && box.hoursUntilDeadline < 0) return false;
    // Otherwise, use status
    return box.status !== 'CLOSED' && box.status !== 'APPROVED';
  };
  const { getToken } = useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  // Show all boxes (including approved)
  const allBoxes = boxes;
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  // Auto generation disabled: we only use manual meeting link entry now
  const [generating, setGenerating] = useState<string | null>(null); // kept for legacy state, unused
  const [meetingLinks, setMeetingLinks] = useState<Map<string, string>>(new Map());
  const [overrideApprove, setOverrideApprove] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPendingBoxes();
  }, []);

  const fetchPendingBoxes = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boxes/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setBoxes(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching boxes:', error);
    } finally {
      setLoading(false);
    }
  };

  // generate meeting removed; admin must paste a real meeting link manually.

  const handleApproveBox = async (boxId: string) => {
    try {
      setApproving(boxId);
      const token = await getToken();
      const meetingLink = meetingLinks.get(boxId) || '';
      if (!meetingLink.trim()) {
        alert('⚠️ Please paste a valid meeting link (Google Meet / Zoom / Teams) before approval.');
        setApproving(null);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/boxes/${boxId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ meetingLink })
      });

      if (response.ok) {
        const result = await response.json();
        // Backend returns { success: true, data: { approved, failed } }
        const approvedCount = result.data?.approved || 0;
        const failedCount = result.data?.failed || 0;
        
        if (approvedCount > 0) {
          alert(`✅ Successfully approved ${approvedCount} student(s)!${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
        } else {
          alert(`⚠️ No students were approved. ${failedCount} failed.`);
        }
        
        // Refresh the list
        fetchPendingBoxes();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Failed to approve'}`);
      }
    } catch (error) {
      console.error('Error approving box:', error);
      alert('❌ Failed to approve meeting');
    } finally {
      setApproving(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-800 border-green-300';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FULL': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CLOSED': return 'bg-red-100 text-red-800 border-red-300';
      case 'APPROVED': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDeadline = (hours: number) => {
    if (typeof hours !== 'number' || isNaN(hours)) {
      return '⏰ Unknown deadline';
    }
    if (hours < 0) {
      return `🔒 Closed (${Math.abs(hours).toFixed(1)}h ago)`;
    } else if (hours < 1) {
      return `⏰ ${Math.floor(hours * 60)} minutes left`;
    } else {
      return `⏰ ${hours.toFixed(1)} hours left`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">✅ Meeting Approval</h1>
          <p className="text-gray-600">
            Review and approve student meetings by time slot. Each box represents a meeting session.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">How Meeting Approval Works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each box groups students who paid for the same time slot</li>
                <li>• Add a meeting link (Google Meet/Zoom) before approving</li>
                <li>• Once approved, students receive email with meeting details</li>
                <li>• Boxes close automatically 3 hours before meeting time</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Boxes</p>
                <p className="text-2xl font-bold text-gray-900">{boxes.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-indigo-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-bold text-green-600">
                  {boxes.filter(b => b.status === 'OPEN' || b.status === 'PARTIAL').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Closed</p>
                <p className="text-2xl font-bold text-red-600">
                  {boxes.filter(b => b.status === 'CLOSED').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {boxes.reduce((sum, box) => sum + box.students.length, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Boxes Grid */}
        {allBoxes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Meetings</h3>
            <p className="text-gray-600">
              There are no meeting boxes yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allBoxes.map((box) => (
              <div
                key={box.boxId}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition"
              >
                {/* Box Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span className="font-semibold">{box.teacherName}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(box.status)} bg-white`}>
                      {box.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(box.date).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{box.timeSlot}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {box.currentBookings >= box.maxCapacity
                          ? 'FULL'
                          : `${box.maxCapacity - box.currentBookings}/${box.maxCapacity} spots left`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Box Body */}
                <div className="p-4">
                  {/* Teacher Info */}
                  <div className="mb-2 flex items-center gap-4">
                    <span className="font-semibold text-indigo-700">Teacher:</span>
                    <span className="text-black font-bold">{box.teacherName || 'Unknown'}</span>
                  </div>
                  {/* Slot Info */}
                  <div className="mb-2 flex items-center gap-4">
                    <span className="font-semibold text-indigo-700">Slot:</span>
                    <span className="text-black">{box.slotName || box.timeSlot || 'N/A'}</span>
                    <span className="font-semibold text-indigo-700">Date:</span>
                    <span className="text-black">{box.date ? new Date(box.date).toLocaleDateString('en-IN') : 'N/A'}</span>
                    {/* Only show time if slotName is missing */}
                    {!(box.slotName) && (
                      <>
                        <span className="font-semibold text-indigo-700">Time:</span>
                        <span className="text-black">{box.startTime && box.endTime ? `${box.startTime} - ${box.endTime}` : 'N/A'}</span>
                      </>
                    )}
                  </div>
                  {/* Deadline */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-bold text-indigo-700">Deadline:</span>
                      <span className="text-lg font-extrabold text-red-700">
                        {box.deadlineUtc && !isNaN(new Date(box.deadlineUtc).getTime())
                          ? new Date(box.deadlineUtc).toLocaleString('en-IN')
                          : 'Not set'}
                      </span>
                      {typeof box.hoursUntilDeadline === 'number' && !isNaN(box.hoursUntilDeadline) && (
                        <span className="text-sm font-semibold text-gray-700">{formatDeadline(box.hoursUntilDeadline)}</span>
                      )}
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Students in this Box ({box.students.length}):
                      {box.maxCapacity === 9999 && box.students.length > 5 && (
                        <span className="ml-2 text-xs text-gray-500">(showing first 5 of {box.students.length})</span>
                      )}
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(box.maxCapacity === 9999 ? box.students.slice(0, 5) : box.students).map((student, idx) => (
                        <div key={student.id || student.studentId} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-black">{idx + 1}. {student.studentName || student.name || 'No Name'}</span>
                            <span className="font-semibold text-indigo-600">₹{student.amount}</span>
                          </div>
                          <p className="text-black text-xs font-medium">Email: {student.studentEmail || student.email || 'N/A'}</p>
                          {(student.phone || student.studentPhone) && <p className="text-black text-xs">Phone: {student.phone || student.studentPhone}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meeting Link Input, Approve, and Override Buttons */}
                  {/* Only show for any box that is not APPROVED */}
                  {(box.status as string) !== 'APPROVED' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <LinkIcon className="h-4 w-4 inline mr-1" />
                          Meeting Link (Google Meet / Zoom)
                        </label>
                        <input
                          type="url"
                          placeholder="https://meet.google.com/xxx-yyyy-zzz"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black placeholder-gray-400"
                          value={meetingLinks.get(box.boxId) || ''}
                          onChange={(e) => {
                            const newLinks = new Map(meetingLinks);
                            newLinks.set(box.boxId, e.target.value);
                            setMeetingLinks(newLinks);
                          }}
                        />
                        {meetingLinks.get(box.boxId) && (
                          <div className="mt-2 text-xs font-semibold text-black">
                            Current Link: <a href={meetingLinks.get(box.boxId)} target="_blank" rel="noopener noreferrer" className="underline text-blue-700">{meetingLinks.get(box.boxId)}</a>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* Manual Approve Button - Primary (generation disabled) */}
                        {(
                          box.currentBookings >= box.maxCapacity ||
                          (typeof box.hoursUntilDeadline === 'number' && box.hoursUntilDeadline < 0) ||
                          overrideApprove[box.boxId]
                        ) && (
                          <button
                            onClick={() => handleApproveBox(box.boxId)}
                            disabled={approving === box.boxId}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {approving === box.boxId ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5" />
                                <span>Approve Box ({box.students.length} Student{box.students.length > 1 ? 's' : ''})</span>
                              </>
                            )}
                          </button>
                        )}
                        <div className="text-center text-xs text-gray-500 py-1">
                          Paste a valid meeting link above (Google Meet / Zoom / Teams) before approval.
                        </div>
                        {/* Override Button: show if not FULL and deadline not passed */}
                        {(box.currentBookings < box.maxCapacity && (typeof box.hoursUntilDeadline !== 'number' || box.hoursUntilDeadline >= 0)) && !overrideApprove[box.boxId] && (
                          <button
                            onClick={() => setOverrideApprove((prev) => ({ ...prev, [box.boxId]: true }))}
                            className="w-full py-2 rounded-lg text-xs font-semibold border transition bg-gray-100 border-gray-300 text-gray-600"
                          >
                            Enable override to approve early
                          </button>
                        )}
                        {/* Disable override button if override is enabled */}
                        {overrideApprove[box.boxId] && (
                          <button
                            onClick={() => setOverrideApprove((prev) => ({ ...prev, [box.boxId]: false }))}
                            className="w-full py-2 rounded-lg text-xs font-semibold border transition bg-yellow-100 border-yellow-400 text-yellow-800"
                          >
                            Disable override
                          </button>
                        )}
                        {/* Show override button for OPEN/PARTIAL boxes only, not CLOSED */}
                        {!isBoxPending(box) && box.currentBookings < box.maxCapacity && !overrideApprove[box.boxId] && (
                          <div className="text-center text-xs py-2">
                            {(box.status as string) === 'APPROVED' ? (
                              <span className="block font-semibold text-green-600">✅ This box has already been approved.</span>
                            ) : (box.status as string) === 'CLOSED' ? (
                              <span className="block font-semibold text-red-600">❌ This box is CLOSED and cannot accept new bookings.</span>
                            ) : (
                              // OPEN or PARTIAL status - show override button
                              <>
                                <span className="block text-gray-600 mb-3">
                                  This box is <strong>{box.status}</strong>. You can enable override to approve it before the deadline.
                                </span>
                                <button
                                  onClick={() => setOverrideApprove((prev) => ({ ...prev, [box.boxId]: true }))}
                                  className="w-full py-2 rounded-lg text-sm font-semibold border transition bg-blue-50 border-blue-400 text-blue-800 hover:bg-blue-100"
                                >
                                  Enable Override to Approve {box.status} Box
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
