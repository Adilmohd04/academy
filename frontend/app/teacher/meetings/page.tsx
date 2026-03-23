'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { TeacherPageContainer } from '@/components/ui/TeacherPageContainer';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  User, 
  FileText, 
  Link as LinkIcon,
  Save,
  Loader2,
  ExternalLink,
  CheckCircle
} from 'lucide-react';

interface Meeting {
  id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  preferred_date?: string;
  meeting_date?: string;
  time_slot_start?: string;
  time_slot_end?: string;
  slot_name?: string;
  meeting_link?: string;
  notes?: string;
  notes_link?: string;
  resource_link?: string;
  amount_paid?: number;
  is_free?: boolean;
  topic?: string;
  description?: string;
  approval_status: string;
  attendance_status?: string;
  attendance?: 'present' | 'absent' | null;
}

export default function TeacherMeetingsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notesLinks, setNotesLinks] = useState<{ [key: string]: string }>({});
  const [resourceLinks, setResourceLinks] = useState<{ [key: string]: string }>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [savingResource, setSavingResource] = useState<string | null>(null);
  const [updatingAttendance, setUpdatingAttendance] = useState<string | null>(null);

  // 🔒 SECURITY: Check if user is a teacher
  useEffect(() => {
    if (user) {
      const role = user.publicMetadata?.role as string;
      if (role !== 'teacher') {
        toast.error('Access Denied: Teachers only!');
        router.replace('/dashboard');
        return;
      }
    }
  }, [user, router]);

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/teacher/assigned`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }

      const result = await response.json();
      console.log('📅 Meetings API response:', result);
      
      // Backend returns { data: [...] }
      const meetingsData = result.data || [];
      
      // Transform data to include time slot information
      const transformedMeetings = meetingsData.map((meeting: any) => {
        const timeSlot = Array.isArray(meeting.time_slots) ? meeting.time_slots[0] : meeting.time_slots;
        return {
          ...meeting,
          preferred_date: meeting.meeting_date,
          time_slot_start: timeSlot?.start_time || '',
          time_slot_end: timeSlot?.end_time || '',
          slot_name: timeSlot?.slot_name || '',
        };
      });
      
      setMeetings(transformedMeetings);
      console.log('✅ Transformed meetings:', transformedMeetings);
      
      // Initialize notes links and resource links state
      const linksState: { [key: string]: string } = {};
      const resourceLinksState: { [key: string]: string } = {};
      transformedMeetings.forEach((meeting: Meeting) => {
        linksState[meeting.id] = meeting.notes_link || '';
        resourceLinksState[meeting.id] = meeting.resource_link || '';
      });
      setNotesLinks(linksState);
      setResourceLinks(resourceLinksState);
      
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotesLink = async (meetingId: string) => {
    try {
      setSavingNotes(meetingId);
      const token = await getToken();
      const notesLink = notesLinks[meetingId];

      if (!notesLink.trim()) {
        toast.error('Please enter a Google Drive link');
        return;
      }

      // Validate URL format
      try {
        new URL(notesLink);
      } catch {
        toast.error('Please enter a valid URL');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/notes`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ notes_link: notesLink }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save notes link');
      }

      toast.success('Study materials link saved! ✅');
      await loadMeetings(); // Reload to get updated data
      
    } catch (error) {
      console.error('Error saving notes link:', error);
      toast.error('Failed to save notes link');
    } finally {
      setSavingNotes(null);
    }
  };

  const handleSaveResourceLink = async (meetingId: string) => {
    try {
      setSavingResource(meetingId);
      const token = await getToken();
      const resourceLink = resourceLinks[meetingId];

      if (!resourceLink.trim()) {
        toast.error('Please enter a resource link');
        return;
      }

      // Validate URL format
      try {
        new URL(resourceLink);
      } catch {
        toast.error('Please enter a valid URL');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/resource`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ resource_link: resourceLink }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save resource link');
      }

      toast.success('Resource link saved! ✅');
      await loadMeetings(); // Reload to get updated data
      
    } catch (error) {
      console.error('Error saving resource link:', error);
      toast.error('Failed to save resource link');
    } finally {
      setSavingResource(null);
    }
  };

  const handleMarkAttendance = async (meetingId: string, status: 'present' | 'absent') => {
    try {
      setUpdatingAttendance(meetingId);
      const token = await getToken();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}/attendance`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ attendance: status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update attendance');
      }

      toast.success(`Attendance marked as ${status.toUpperCase()}! ✅`);
      await loadMeetings(); // Reload to get updated data
      
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    } finally {
      setUpdatingAttendance(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${minutes} ${period}`;
    } catch {
      return timeString;
    }
  };

  const isUpcoming = (date?: string, time?: string) => {
    if (!date) return false;
    try {
      const meetingDate = new Date(date);
      if (isNaN(meetingDate.getTime())) return false;
      
      // If we have time, use it; otherwise just compare dates
      if (time) {
        const meetingDateTime = new Date(`${date}T${time}`);
        return meetingDateTime > new Date();
      }
      return meetingDate >= new Date(new Date().setHours(0, 0, 0, 0));
    } catch {
      return false;
    }
  };

  const upcomingMeetings = meetings.filter((m) =>
    isUpcoming(m.preferred_date || m.meeting_date, m.time_slot_start)
  );
  const pastMeetings = meetings.filter(
    (m) => !isUpcoming(m.preferred_date || m.meeting_date, m.time_slot_start)
  );

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50/40">
        <TeacherPageContainer>
          <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-sm text-slate-600">Loading your meetings...</p>
            </div>
          </div>
        </TeacherPageContainer>
      </div>
    );
  }

  if (user && user.publicMetadata?.role !== 'teacher') {
    return (
      <div className="min-h-full bg-slate-50/40">
        <TeacherPageContainer>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <h1 className="text-xl font-bold text-rose-700">Access Denied</h1>
            <p className="mt-2 text-sm text-rose-600">This page is for teachers only.</p>
          </div>
        </TeacherPageContainer>
      </div>
    );
  }

  const getAttendanceBadge = (attendance: 'present' | 'absent' | null | undefined) => {
    if (attendance === 'present') {
      return <span className="rounded-lg bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Present</span>;
    }
    if (attendance === 'absent') {
      return <span className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Absent</span>;
    }
    return <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Pending</span>;
  };

  return (
    <div className="min-h-full bg-slate-50/40">
      <TeacherPageContainer className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Assigned Meetings</h1>
              <p className="mt-1 text-sm text-slate-600">
                Manage scheduled meetings and share materials with students.
              </p>
            </div>
            <button
              onClick={() => router.push('/teacher')}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
          </div>
        </section>

        {meetings.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mb-3 text-4xl">📅</div>
            <h2 className="text-lg font-semibold text-slate-900">No Meetings Yet</h2>
            <p className="mt-1 text-sm text-slate-600">Assigned meetings will appear here.</p>
          </section>
        ) : (
          <div className="space-y-8">
            {upcomingMeetings.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Meetings</h2>
                {upcomingMeetings.map((meeting) => (
                  <article key={meeting.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-5 xl:grid-cols-2">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">Meeting Details</h3>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                          <div className="mb-2 flex items-start gap-2">
                            <User className="mt-0.5 h-4 w-4 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-900">{meeting.student_name}</p>
                              <p>{meeting.student_email}</p>
                              {meeting.student_phone && <p>{meeting.student_phone}</p>}
                            </div>
                          </div>
                          <div className="mb-2 flex items-start gap-2">
                            <Calendar className="mt-0.5 h-4 w-4 text-slate-500" />
                            <div>
                              <p className="font-medium text-slate-900">{formatDate(meeting.preferred_date || meeting.meeting_date)}</p>
                              <p>
                                {meeting.time_slot_start && meeting.time_slot_end
                                  ? `${formatTime(meeting.time_slot_start)} - ${formatTime(meeting.time_slot_end)}`
                                  : meeting.slot_name || 'Time not set'}
                              </p>
                            </div>
                          </div>
                          {meeting.topic && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Topic</p>
                              <p className="mt-1 font-medium text-emerald-900">{meeting.topic}</p>
                              {meeting.description && <p className="mt-1 text-xs text-emerald-800">{meeting.description}</p>}
                            </div>
                          )}
                          {meeting.meeting_link && (
                            <a
                              href={meeting.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              Join Meeting <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-900">Study Materials</h3>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Resource Link</label>
                          <input
                            type="url"
                            value={resourceLinks[meeting.id] || ''}
                            onChange={(e) => setResourceLinks({ ...resourceLinks, [meeting.id]: e.target.value })}
                            placeholder="https://drive.google.com/..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 transition focus:ring"
                            disabled={savingResource === meeting.id}
                          />
                          <button
                            onClick={() => handleSaveResourceLink(meeting.id)}
                            disabled={savingResource === meeting.id}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {savingResource === meeting.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Resource Link
                          </button>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Notes Link</label>
                          <input
                            type="url"
                            value={notesLinks[meeting.id] || ''}
                            onChange={(e) => setNotesLinks({ ...notesLinks, [meeting.id]: e.target.value })}
                            placeholder="https://docs.google.com/document/..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 transition focus:ring"
                            disabled={savingNotes === meeting.id}
                          />
                          <button
                            onClick={() => handleSaveNotesLink(meeting.id)}
                            disabled={savingNotes === meeting.id}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
                          >
                            {savingNotes === meeting.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Notes Link
                          </button>
                        </div>

                        {(meeting.resource_link || meeting.notes_link) && (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                            <div className="flex items-center gap-2 font-medium">
                              <CheckCircle className="h-4 w-4" />
                              Links shared successfully
                            </div>
                            <div className="mt-2 space-y-1">
                              {meeting.resource_link && (
                                <a
                                  href={meeting.resource_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 hover:underline"
                                >
                                  View Resource <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {meeting.notes_link && (
                                <a
                                  href={meeting.notes_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block inline-flex items-center gap-1 hover:underline"
                                >
                                  View Notes <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {pastMeetings.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">Past Meetings</h2>
                {pastMeetings.map((meeting) => (
                  <article key={meeting.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-5 xl:grid-cols-2">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-slate-900">Meeting Details</h3>
                        <div className="space-y-1 text-sm text-slate-700">
                          <p><span className="font-medium text-slate-900">Student:</span> {meeting.student_name}</p>
                          <p><span className="font-medium text-slate-900">Date:</span> {formatDate(meeting.preferred_date || meeting.meeting_date)}</p>
                          <p>
                            <span className="font-medium text-slate-900">Time:</span>{' '}
                            {meeting.time_slot_start
                              ? `${formatTime(meeting.time_slot_start)} - ${formatTime(meeting.time_slot_end)}`
                              : meeting.slot_name || 'Time not set'}
                          </p>
                          {meeting.topic && <p><span className="font-medium text-slate-900">Topic:</span> {meeting.topic}</p>}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance</p>
                          {meeting.attendance ? (
                            getAttendanceBadge(meeting.attendance)
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMarkAttendance(meeting.id, 'present')}
                                disabled={updatingAttendance === meeting.id}
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                Mark Present
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(meeting.id, 'absent')}
                                disabled={updatingAttendance === meeting.id}
                                className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                              >
                                Mark Absent
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-semibold text-slate-900">Study Materials & Resources</h3>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Notes Link</label>
                          <input
                            type="url"
                            value={notesLinks[meeting.id] || ''}
                            onChange={(e) => setNotesLinks({ ...notesLinks, [meeting.id]: e.target.value })}
                            placeholder="https://docs.google.com/..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 transition focus:ring"
                          />
                          <button
                            onClick={() => handleSaveNotesLink(meeting.id)}
                            disabled={savingNotes === meeting.id}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
                          >
                            {savingNotes === meeting.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Notes Link
                          </button>
                          {meeting.notes_link && (
                            <a
                              href={meeting.notes_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-slate-700 hover:underline"
                            >
                              View Notes <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-700">Resource Link</label>
                          <input
                            type="url"
                            value={resourceLinks[meeting.id] || ''}
                            onChange={(e) => setResourceLinks({ ...resourceLinks, [meeting.id]: e.target.value })}
                            placeholder="https://drive.google.com/..."
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-500/30 transition focus:ring"
                          />
                          <button
                            onClick={() => handleSaveResourceLink(meeting.id)}
                            disabled={savingResource === meeting.id}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {savingResource === meeting.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Resource Link
                          </button>
                          {meeting.resource_link && (
                            <a
                              href={meeting.resource_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-slate-700 hover:underline"
                            >
                              View Materials <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        )}
      </TeacherPageContainer>
    </div>
  );
}
