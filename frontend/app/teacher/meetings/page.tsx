'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Link as LinkIcon,
  Save,
  Loader2,
  ChevronLeft,
  ExternalLink,
  CheckCircle
} from 'lucide-react';

interface Meeting {
  id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  preferred_date: string;
  time_slot_start: string;
  time_slot_end: string;
  slot_name: string;
  meeting_link?: string;
  notes?: string;
  notes_link?: string;
  resource_link?: string;
  amount_paid: number;
  is_free?: boolean;
  topic?: string;
  description?: string;
  approval_status: string;
  attendance_status?: string;
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

      const data = await response.json();
      const meetingsData = data.data || [];
      setMeetings(meetingsData);
      
      // Initialize notes links and resource links state
      const linksState: { [key: string]: string } = {};
      const resourceLinksState: { [key: string]: string } = {};
      meetingsData.forEach((meeting: Meeting) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isUpcoming = (date: string, time: string) => {
    const meetingDateTime = new Date(`${date}T${time}`);
    return meetingDateTime > new Date();
  };

  const upcomingMeetings = meetings.filter((m) =>
    isUpcoming(m.preferred_date, m.time_slot_start)
  );
  const pastMeetings = meetings.filter(
    (m) => !isUpcoming(m.preferred_date, m.time_slot_start)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  if (user && user.publicMetadata?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
          <p className="text-gray-600">This page is for teachers only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster 
        position="top-center"
        toastOptions={{
          success: { duration: 3000, style: { background: '#10b981', color: '#fff' } },
          error: { duration: 4000, style: { background: '#ef4444', color: '#fff' } },
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/teacher')}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            My Assigned Meetings
          </h1>
          <p className="text-gray-600">
            View your scheduled meetings and upload study materials for students
          </p>
        </div>

        {/* Meetings List */}
        {meetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Meetings Yet</h2>
            <p className="text-gray-600">
              When admin assigns meetings to you, they will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming Meetings */}
            {upcomingMeetings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Meetings</h2>
                <div className="space-y-4">
                  {upcomingMeetings.map((meeting) => (
                    <div key={meeting.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Meeting Details */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Details</h3>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="font-medium text-gray-900">{meeting.student_name}</p>
                                <p className="text-sm text-gray-600">{meeting.student_email}</p>
                                {meeting.student_phone && (
                                  <p className="text-sm text-gray-600">{meeting.student_phone}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-purple-600" />
                              <div>
                                <p className="font-medium text-gray-900">{formatDate(meeting.preferred_date)}</p>
                                <p className="text-sm text-gray-600">
                                  {meeting.slot_name} ({meeting.time_slot_start} - {meeting.time_slot_end})
                                </p>
                              </div>
                            </div>

                            {meeting.topic && (
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <p className="text-xs text-purple-600 font-semibold mb-1">📚 ISLAMIC TOPIC</p>
                                <p className="font-semibold text-purple-900">{meeting.topic}</p>
                                {meeting.description && (
                                  <p className="text-sm text-gray-700 mt-1">{meeting.description}</p>
                                )}
                              </div>
                            )}

                            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-3 rounded-lg border border-teal-200">
                              <p className="text-xs text-teal-700 font-semibold mb-1">💰 AMOUNT</p>
                              <p className="font-bold text-xl">
                                {meeting.is_free || meeting.amount_paid === 0 ? (
                                  <span className="text-emerald-600">FREE</span>
                                ) : (
                                  <span className="text-gray-900">₹{meeting.amount_paid}</span>
                                )}
                              </p>
                            </div>

                            {meeting.meeting_link && (
                              <div className="flex items-center gap-3">
                                <LinkIcon className="w-5 h-5 text-green-600" />
                                <a
                                  href={meeting.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  Join Google Meet <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Study Materials Upload */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-100">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Study Materials</h3>
                          </div>
                          
                          <div className="space-y-4">
                            {/* Resource Link Input */}
                            <div>
                              <label className="flex items-center space-x-2 text-sm font-bold text-gray-700 mb-3">
                                <FileText className="w-4 h-4 text-teal-600" />
                                <span>📂 Resource Link (Study Materials)</span>
                              </label>
                              <input
                                type="url"
                                value={resourceLinks[meeting.id] || ''}
                                onChange={(e) => setResourceLinks({ ...resourceLinks, [meeting.id]: e.target.value })}
                                placeholder="https://drive.google.com/..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-300 text-gray-900 font-medium placeholder-gray-400 hover:border-teal-300"
                                disabled={savingResource === meeting.id}
                              />
                            </div>
                            
                            <button
                              onClick={() => handleSaveResourceLink(meeting.id)}
                              disabled={savingResource === meeting.id}
                              className="group w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 relative overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              {savingResource === meeting.id ? (
                                <span className="relative z-10 flex items-center space-x-2">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span>Saving...</span>
                                </span>
                              ) : (
                                <span className="relative z-10 flex items-center space-x-2">
                                  <Save className="w-5 h-5" />
                                  <span>Save Resource Link</span>
                                </span>
                              )}
                            </button>

                            {meeting.resource_link && (
                              <div className="flex items-center space-x-3 p-4 bg-teal-50 border-2 border-teal-200 rounded-xl">
                                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-teal-900">Resource Shared!</p>
                                  <p className="text-xs text-teal-700">Student can access your resources</p>
                                </div>
                                <a
                                  href={meeting.resource_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:text-teal-700 transition-colors"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              </div>
                            )}

                            {/* Notes Link Input */}
                            <div className="pt-4 border-t-2 border-gray-200">
                              <label className="flex items-center space-x-2 text-sm font-bold text-gray-700 mb-3">
                                <LinkIcon className="w-4 h-4 text-indigo-600" />
                                <span>📝 Notes Link (Lesson Notes)</span>
                              </label>
                              <input
                                type="url"
                                value={notesLinks[meeting.id] || ''}
                                onChange={(e) => setNotesLinks({ ...notesLinks, [meeting.id]: e.target.value })}
                                placeholder="https://docs.google.com/document/..."
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-300 text-gray-900 font-medium placeholder-gray-400 hover:border-indigo-300"
                                disabled={savingNotes === meeting.id}
                              />
                              <div className="mt-2 flex items-start space-x-2 text-xs text-gray-600 bg-white rounded-lg p-3">
                                <span className="text-lg">💡</span>
                                <div>
                                  <p className="font-semibold mb-1">How to share materials:</p>
                                  <ol className="list-decimal list-inside space-y-1">
                                    <li>Upload notes/documents to Google Drive</li>
                                    <li>Set sharing to "Anyone with the link"</li>
                                    <li>Copy and paste the link here</li>
                                  </ol>
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleSaveNotesLink(meeting.id)}
                              disabled={savingNotes === meeting.id}
                              className="group w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 relative overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              {savingNotes === meeting.id ? (
                                <span className="relative z-10 flex items-center space-x-2">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span>Saving...</span>
                                </span>
                              ) : (
                                <span className="relative z-10 flex items-center space-x-2">
                                  <Save className="w-5 h-5" />
                                  <span>Save Notes Link</span>
                                </span>
                              )}
                            </button>

                            {meeting.notes_link && (
                              <div className="flex items-center space-x-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-green-900">Notes Shared!</p>
                                  <p className="text-xs text-green-700">Student can access your lesson notes</p>
                                </div>
                                <a
                                  href={meeting.notes_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-600 hover:text-green-700 transition-colors"
                                >
                                  <ExternalLink className="w-5 h-5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Past Meetings</h2>
                <div className="space-y-4">
                  {pastMeetings.map((meeting) => (
                    <div key={meeting.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-400 opacity-75">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">Meeting Details</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Student:</span> {meeting.student_name}</p>
                            <p><span className="font-medium">Date:</span> {formatDate(meeting.preferred_date)}</p>
                            <p><span className="font-medium">Time:</span> {meeting.time_slot_start} - {meeting.time_slot_end}</p>
                            {meeting.topic && (
                              <p><span className="font-medium">Topic:</span> {meeting.topic}</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">Shared Resources</h3>
                          <div className="space-y-2">
                            {meeting.resource_link ? (
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Study Materials:</p>
                                <a
                                  href={meeting.resource_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:underline flex items-center gap-1 text-sm"
                                >
                                  View Materials <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">No study materials uploaded</p>
                            )}
                            
                            {meeting.notes_link && (
                              <div className="pt-2">
                                <p className="text-xs font-medium text-gray-600 mb-1">Lesson Notes:</p>
                                <a
                                  href={meeting.notes_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                                >
                                  View Notes <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
