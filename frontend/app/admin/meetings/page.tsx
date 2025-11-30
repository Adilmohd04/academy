'use client';

import { useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface PendingMeeting {
  id: string;
  meeting_request_id: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  preferred_date: string;
  time_slot_start: string;
  time_slot_end: string;
  time_slot_name?: string;
  notes?: string;
  amount_paid: number;
  payment_status: string;
  paid_at?: string;
  request_status: string;
  created_at: string;
  // Teacher info - student already selected these
  teacher_id?: string | null;
  teacher_name?: string | null;
  teacher_email?: string | null;
  teacher_slot_id?: string;
  topic?: string;
  description?: string;
}

interface Teacher {
  clerk_user_id: string;
  full_name: string;
  email: string;
}

export default function AdminMeetingsPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [pendingMeetings, setPendingMeetings] = useState<PendingMeeting[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<{ [key: string]: string }>({});
  const [meetingLinks, setMeetingLinks] = useState<{ [key: string]: string }>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }

    if (user) {
      const userRole = user.publicMetadata?.role as string;
      if (userRole !== 'admin') {
        router.push('/');
        return;
      }
      fetchData();
    }
  }, [isLoaded, user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const token = await getToken();

      if (!token) {
        console.warn('No auth token available, retrying...');
        setTimeout(fetchData, 1000);
        return;
      }
      
      // Fetch pending meetings (paid but not assigned)
      const meetingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/admin/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json();
        setPendingMeetings(meetingsData || []);
      }

      // Fetch all teachers
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const teachersList = (usersData.data || []).filter((u: any) => u.role === 'teacher');
        setTeachers(teachersList.map((t: any) => ({
          clerk_user_id: t.clerk_user_id,
          full_name: t.full_name,
          email: t.email
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (meetingRequestId: string) => {
    // Find the meeting to get the teacher_id
    const meeting = pendingMeetings.find(m => m.meeting_request_id === meetingRequestId);
    if (!meeting) {
      setMessage({ type: 'error', text: 'Meeting not found' });
      return;
    }

    const teacherId = meeting.teacher_id; // Use already-selected teacher
    const meetingLink = meetingLinks[meetingRequestId];

    if (!teacherId) {
      setMessage({ type: 'error', text: 'No teacher assigned to this slot' });
      return;
    }

    if (!meetingLink) {
      setMessage({ type: 'error', text: 'Please enter a meeting link' });
      return;
    }

    try {
      setAssigning(meetingRequestId);
      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingRequestId}/assign-teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacher_id: teacherId,
          meeting_link: meetingLink,
          meeting_platform: 'Google Meet',
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Meeting approved! Emails sent to both student and teacher.' });
        // Refresh the list
        await fetchData();
        // Clear meeting link
        setMeetingLinks(prev => ({ ...prev, [meetingRequestId]: '' }));
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to approve meeting' });
      }
    } catch (error) {
      console.error('Error approving meeting:', error);
      setMessage({ type: 'error', text: 'Failed to approve meeting' });
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meeting Approvals</h1>
            <p className="mt-2 text-gray-600">Review and approve paid meeting bookings</p>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        {pendingMeetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No pending meetings</p>
            <p className="text-gray-400 mt-2">All meetings have been assigned to teachers</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingMeetings.map((meeting) => (
              <div key={meeting.meeting_request_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Meeting Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Details</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-500">Student:</span>
                        <p className="font-medium text-gray-900">{meeting.student_name}</p>
                        <p className="text-sm text-gray-600">{meeting.student_email}</p>
                        {meeting.student_phone && (
                          <p className="text-sm text-gray-600">{meeting.student_phone}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Date & Time:</span>
                        <p className="font-medium text-gray-900">
                          {new Date(meeting.preferred_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {meeting.time_slot_start} - {meeting.time_slot_end}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Payment:</span>
                        <p className="font-medium text-green-600">
                          ₹{meeting.amount_paid} (Paid on {new Date(meeting.paid_at || '').toLocaleString()})
                        </p>
                      </div>
                      {meeting.notes && (
                        <div>
                          <span className="text-sm text-gray-500">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">{meeting.notes}</p>
                        </div>
                      )}
                      {/* Islamic Learning Topic */}
                      {meeting.topic && (
                        <div className="border-t border-gray-200 pt-3">
                          <span className="text-sm text-gray-500 mb-1 block">📚 Islamic Topic:</span>
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="font-semibold text-purple-900">{meeting.topic}</p>
                            {meeting.description && (
                              <p className="text-sm text-gray-700 mt-1">{meeting.description}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Form */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Meeting</h3>
                    <div className="space-y-4">
                      {/* Show selected teacher (read-only) */}
                      {meeting.teacher_name ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ✓ Selected Teacher
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                              {meeting.teacher_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{meeting.teacher_name}</p>
                              <p className="text-sm text-gray-600">{meeting.teacher_email}</p>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mt-2">
                            ✓ Student already selected this teacher
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-sm text-yellow-800">
                            ⚠️ No teacher assigned yet. This should not happen if student selected a slot.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Meeting Link (Google Meet) *
                        </label>
                        <input
                          type="url"
                          value={meetingLinks[meeting.meeting_request_id] || ''}
                          onChange={(e) => setMeetingLinks(prev => ({ ...prev, [meeting.meeting_request_id]: e.target.value }))}
                          placeholder="https://meet.google.com/xxx-xxxx-xxx"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                          disabled={assigning === meeting.meeting_request_id}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Create a Google Meet link and paste it here
                        </p>
                      </div>

                      <button
                        onClick={() => handleAssignTeacher(meeting.meeting_request_id)}
                        disabled={assigning === meeting.meeting_request_id || !meeting.teacher_id || !meetingLinks[meeting.meeting_request_id]}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {assigning === meeting.meeting_request_id ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Approving...
                          </span>
                        ) : (
                          '✓ Approve Meeting & Send Emails'
                        )}
                      </button>

                      <p className="text-xs text-gray-500 text-center">
                        📧 Emails will be sent to {meeting.student_name} and {meeting.teacher_name || 'teacher'}
                        📧 Emails will be sent to both student and teacher
                      </p>
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
