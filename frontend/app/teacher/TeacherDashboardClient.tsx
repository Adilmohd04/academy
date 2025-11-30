"use client";

import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from "lucide-react";

type TeacherDashboardClientProps = {
  courses: any[];
  meetings: any[];
};

export default function TeacherDashboardClient({ courses, meetings }: TeacherDashboardClientProps) {
  const { getToken } = useAuth();
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [attendanceUpdating, setAttendanceUpdating] = useState<string | null>(null);
  const [meetingsData, setMeetingsData] = useState(meetings);

  // Debug: Log meetings data
  useEffect(() => {
    console.log('Meetings data:', meetingsData);
    console.log('Approved meetings:', meetingsData.filter((m: any) => m.approval_status === 'approved'));
  }, [meetingsData]);

  // Example handler for course creation (replace with real logic)
  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    // ...submit logic here
    setTimeout(() => {
      setLoading(false);
      setSuccess("Course created successfully!");
    }, 1000);
  };

  // Handle attendance marking
  const handleAttendance = async (meetingId: string, status: 'present' | 'absent') => {
    setAttendanceUpdating(meetingId);
    try {
      const token = await getToken();
      await api.meetings.updateAttendance(meetingId, status, token);
      setSuccess(`Attendance marked as ${status}`);
      // Update local state instead of reloading page
      setMeetingsData(meetingsData.map((m: any) => 
        m.id === meetingId ? { ...m, attendance: status } : m
      ));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update attendance');
      setTimeout(() => setError(''), 3000);
    } finally {
      setAttendanceUpdating(null);
    }
  };

  // Toggle expanded meeting
  const toggleMeeting = (meetingId: string) => {
    setExpandedMeeting(expandedMeeting === meetingId ? null : meetingId);
  };

  // Handle resource update
  const handleOpenResourceModal = (meeting: any) => {
    setResourceModal({
      meetingId: meeting.id,
      currentResource: meeting.resource_link || '',
      currentNotes: meeting.notes_link || ''
    });
    setResourceLink(meeting.resource_link || '');
    setNotesLink(meeting.notes_link || '');
  };

  const handleUpdateResources = async () => {
    if (!resourceModal) return;
    
    setResourceUpdating(true);
    try {
      const token = await getToken();
      
      // Update resource link if changed
      if (resourceLink !== resourceModal.currentResource) {
        await api.meetings.updateResourceLink(resourceModal.meetingId, resourceLink, token);
      }
      
      // Update notes link if changed
      if (notesLink !== resourceModal.currentNotes) {
        await api.meetings.updateNotesLink(resourceModal.meetingId, notesLink, token);
      }
      
      // Update local state
      setMeetingsData(meetingsData.map((m: any) => 
        m.id === resourceModal.meetingId 
          ? { ...m, resource_link: resourceLink, notes_link: notesLink } 
          : m
      ));
      
      setSuccess('Resources updated successfully!');
      setResourceModal(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update resources');
      setTimeout(() => setError(''), 3000);
    } finally {
      setResourceUpdating(false);
    }
  };

  // Calculate quick stats
  const totalStudents = Array.isArray(meetings) ? new Set(meetings.map((m: any) => m.student_id)).size : 0;
  const upcomingMeetings = Array.isArray(meetings) ? meetings.filter((m: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetingDate = new Date(m.meeting_date);
    meetingDate.setHours(0, 0, 0, 0);
    return (m.approval_status === 'approved' || m.approval_status === 'paid' || m.payment_status === 'paid') && meetingDate >= today;
  }).length : 0;

  // Calculate this week's booked slots
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const thisWeekMeetings = Array.isArray(meetings)
    ? meetings.filter((m: any) => {
        const d = new Date(m.meeting_date);
        return d >= weekStart && d < weekEnd;
      })
    : [];
  const thisWeekSlots = thisWeekMeetings.length;

  // Fetch available slots for this week from backend
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = this week, 1 = next week, -1 = last week
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
  // Resource management state
  const [resourceModal, setResourceModal] = useState<{meetingId: string, currentResource: string, currentNotes: string} | null>(null);
  const [resourceLink, setResourceLink] = useState("");
  const [notesLink, setNotesLink] = useState("");
  const [resourceUpdating, setResourceUpdating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function fetchSlots() {
      setSlotsLoading(true);
      setSlotsError("");
      try {
        // Calculate week start/end based on offset
        const now = new Date();
        const offsetWeekStart = new Date(now);
        offsetWeekStart.setDate(now.getDate() - now.getDay() + (currentWeekOffset * 7));
        const offsetWeekEnd = new Date(offsetWeekStart);
        offsetWeekEnd.setDate(offsetWeekStart.getDate() + 7);
        
        const token = await getToken();
        const startDateStr = offsetWeekStart.toISOString().slice(0, 10);
        const endDateStr = offsetWeekEnd.toISOString().slice(0, 10);
        const response = await api.teacherAvailability.getSlotAvailability(startDateStr, endDateStr, token);
        let slotsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
        
        // Remove duplicates by creating unique key from date + time
        const uniqueSlotsMap = new Map();
        slotsData.forEach((slot: any) => {
          const key = `${slot.date}-${slot.start_time}-${slot.end_time}`;
          if (!uniqueSlotsMap.has(key)) {
            uniqueSlotsMap.set(key, slot);
          }
        });
        
        // Convert back to array and sort by date/time
        slotsData = Array.from(uniqueSlotsMap.values()).sort((a: any, b: any) => {
          const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return (a.start_time || '').localeCompare(b.start_time || '');
        });
        
        setAvailableSlots(slotsData);
      } catch (err: any) {
        setSlotsError("Failed to load available slots.");
      } finally {
        setSlotsLoading(false);
      }
    }
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekOffset]);

  // Week navigation helpers
  const getWeekLabel = () => {
    if (currentWeekOffset === 0) return "This Week";
    if (currentWeekOffset === 1) return "Next Week";
    if (currentWeekOffset === -1) return "Last Week";
    return currentWeekOffset > 0 ? `${currentWeekOffset} Weeks Ahead` : `${Math.abs(currentWeekOffset)} Weeks Ago`;
  };

  const goToPreviousWeek = () => setCurrentWeekOffset(currentWeekOffset - 1);
  const goToNextWeek = () => setCurrentWeekOffset(currentWeekOffset + 1);
  const goToThisWeek = () => setCurrentWeekOffset(0);

  // Edit slot topic/description
  const handleEditSlot = (slot: any) => {
    setEditingSlot(slot.id);
    setEditTopic(slot.topic || "");
    setEditDescription(slot.description || "");
  };

  const handleCancelEdit = () => {
    setEditingSlot(null);
    setEditTopic("");
    setEditDescription("");
  };

  const handleSaveEdit = async (slotId: string) => {
    setSavingEdit(true);
    try {
      const token = await getToken();
      const slot = availableSlots.find(s => s.id === slotId);
      if (!slot) return;

      // Update slot via API
      await api.teacherAvailability.saveSlotAvailability({
        slots: [{
          date: slot.date,
          timeSlotId: slot.time_slot_id,
          maxCapacity: slot.max_capacity,
          isUnlimited: slot.is_unlimited,
          bookingDeadlineDate: slot.booking_deadline_date,
          bookingDeadlineTime: slot.booking_deadline_time,
          notes: slot.notes,
          is_free: slot.is_free,
          topic: editTopic,
          description: editDescription
        }]
      }, token);

      // Update local state
      setAvailableSlots(availableSlots.map(s => 
        s.id === slotId ? { ...s, topic: editTopic, description: editDescription } : s
      ));

      setSuccess("Slot updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      handleCancelEdit();
    } catch (err) {
      setError("Failed to update slot");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-100 via-white to-indigo-100 py-0 px-2 font-sans" style={{ fontFamily: 'Inter, Nunito, Segoe UI, Arial, sans-serif' }}>
      {/* Navbar */}
      <nav className="w-full bg-white/80 border-b border-gray-100 shadow-sm sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-indigo-700 tracking-tight select-none">Academy</span>
            <span className="hidden sm:inline text-base font-semibold text-gray-400 ml-2 select-none">Teacher Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'ring-2 ring-indigo-400' } }} />
          </div>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto rounded-3xl bg-white/80 shadow-2xl p-10 border border-gray-100 backdrop-blur-md mt-8">
        <main>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 gap-6">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow-sm" style={{letterSpacing: '-0.01em'}}>Teacher Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/teacher/availability">
              <button className="px-6 py-2 rounded-xl font-semibold shadow-lg bg-white/70 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 flex items-center gap-2 backdrop-blur-md">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-9 4h6" /></svg>
                <span>Manage Availability</span>
              </button>
            </Link>
            <button
              className="flex items-center px-6 py-2 rounded-xl font-semibold shadow-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white hover:from-indigo-600 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 gap-2"
              onClick={() => setShowCreateCourse(true)}
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Course</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl bg-white/70 shadow-lg p-6 flex flex-col items-center justify-center border border-gray-100 backdrop-blur-md hover:shadow-xl transition-all">
            <span className="text-2xl font-extrabold text-indigo-700">{courses.length}</span>
            <span className="text-gray-700 mt-1 font-medium">Courses</span>
          </div>
          <div className="rounded-2xl bg-white/70 shadow-lg p-6 flex flex-col items-center justify-center border border-gray-100 backdrop-blur-md hover:shadow-xl transition-all">
            <span className="text-2xl font-extrabold text-blue-700">{totalStudents}</span>
            <span className="text-gray-700 mt-1 font-medium">Unique Students</span>
          </div>
          <div className="rounded-2xl bg-white/70 shadow-lg p-6 flex flex-col items-center justify-center border border-gray-100 backdrop-blur-md hover:shadow-xl transition-all">
            <span className="text-2xl font-extrabold text-green-700">{upcomingMeetings}</span>
            <span className="text-gray-700 mt-1 font-medium">Upcoming Meetings</span>
          </div>
        </div>
        {/* Courses Table */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 text-gray-900" style={{letterSpacing: '-0.01em'}}>Your Courses</h2>
          {courses.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-lg font-semibold text-gray-700">No courses yet</h3>
              <p className="mt-1 text-base text-gray-400">Get started by creating your first course.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mb-4 rounded-2xl shadow-lg bg-white/80 backdrop-blur-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/80 divide-y divide-gray-100">
                  {courses.map((course: any) => (
                    <tr key={course.id} className="hover:bg-indigo-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-base font-semibold text-gray-900">{course.title}</div>
                        <div className="text-sm text-gray-700">{course.duration_weeks} weeks</div>
                      </td>
                      <td className="px-6 py-4 text-base text-gray-800">{course.student_count || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${
                          course.status === 'published' ? 'bg-green-100 text-green-700 border border-green-200' :
                          course.status === 'draft' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-base text-gray-800">₹{course.price}</td>
                      <td className="px-6 py-4 text-base font-medium flex gap-2">
                        <button className="px-3 py-1 rounded-lg bg-white/80 border border-indigo-200 text-indigo-600 font-semibold shadow hover:bg-indigo-50 hover:border-indigo-300 transition-all">Edit</button>
                        <button className="px-3 py-1 rounded-lg bg-white/80 border border-red-200 text-red-600 font-semibold shadow hover:bg-red-50 hover:border-red-300 transition-all">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* Availability Summary */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Weekly Availability</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousWeek}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ← Previous
              </button>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={goToThisWeek}
                  className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                >
                  This Week
                </button>
              )}
              <button
                onClick={goToNextWeek}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-indigo-900">{getWeekLabel()}'s Availability</h3>
              <Link href="/teacher/availability" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline">
                Manage Availability
              </Link>
            </div>

            {slotsLoading ? (
              <div className="text-gray-500 text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                Loading slots...
              </div>
            ) : slotsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{slotsError}</div>
            ) : availableSlots.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
                <p className="font-medium">No available slots set for {getWeekLabel().toLowerCase()}.</p>
                <p className="mt-1">Go to <Link href="/teacher/availability" className="text-indigo-700 underline font-semibold">Manage Availability</Link> to create slots.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSlots.map((slot: any) => (
                  <div key={slot.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-indigo-300 transition">
                    {editingSlot === slot.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                          <input
                            type="text"
                            value={editTopic}
                            onChange={(e) => setEditTopic(e.target.value)}
                            placeholder="e.g., Quran Tafsir, Islamic History"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Detailed description of what will be taught..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(slot.id)}
                            disabled={savingEdit}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                          >
                            {savingEdit ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingEdit}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-sm font-bold text-gray-900">
                                {new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-sm text-gray-600">
                                {slot.start_time?.slice(0,5)} - {slot.end_time?.slice(0,5)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                slot.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {slot.is_free ? 'FREE' : slot.custom_price ? `₹${slot.custom_price}` : 'PAID'}
                              </span>
                            </div>
                            {slot.topic && (
                              <div className="mt-2">
                                <h4 className="text-sm font-semibold text-purple-900">📚 {slot.topic}</h4>
                                {slot.description && (
                                  <p className="text-xs text-gray-600 mt-0.5">{slot.description}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <div className="text-xs text-gray-500">Capacity</div>
                              <div className="text-sm font-semibold text-teal-600">
                                {slot.is_unlimited ? 'Unlimited' : `${slot.current_bookings || 0} booked / ${slot.max_capacity} max`}
                              </div>
                            </div>
                            <button
                              onClick={() => handleEditSlot(slot)}
                              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        {/* Assigned/Upcoming Meetings */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Upcoming Meetings & Attendance</h2>
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 font-medium">
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 font-medium">
              ✗ {error}
            </div>
          )}
          {meetingsData.filter((m: any) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const meetingDate = new Date(m.meeting_date);
            meetingDate.setHours(0, 0, 0, 0);
            return (m.approval_status === 'approved' || m.approval_status === 'paid' || m.payment_status === 'paid') && meetingDate >= today;
          }).length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">No Upcoming Meetings</h3>
              <p className="text-gray-500">Your upcoming meetings will appear here once students book your slots.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetingsData.filter((meeting: any) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const meetingDate = new Date(meeting.meeting_date);
                meetingDate.setHours(0, 0, 0, 0);
                return (meeting.approval_status === 'approved' || meeting.approval_status === 'paid' || meeting.payment_status === 'paid') && meetingDate >= today;
              }).map((meeting: any) => (
                <div key={meeting.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all">
                  {/* Meeting Header - Always Visible */}
                  <div 
                    className="p-5 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => toggleMeeting(meeting.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {meeting.student_name || 'Unknown Student'}
                          </h3>
                          {/* Attendance Badge */}
                          {meeting.attendance === 'present' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3" />
                              Present
                            </span>
                          )}
                          {meeting.attendance === 'absent' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              Absent
                            </span>
                          )}
                          {(!meeting.attendance || meeting.attendance === 'pending') && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            📅 {meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date not set'}
                          </span>
                          <span className="flex items-center gap-1">
                            🕐 {meeting.meeting_time && meeting.meeting_time !== 'Time not set' ? meeting.meeting_time : (meeting.slot_name || 'Time not set')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {meeting.meeting_link && (
                          <a 
                            href={meeting.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Join Meeting
                          </a>
                        )}
                        {expandedMeeting === meeting.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details Section */}
                  {expandedMeeting === meeting.id && (
                    <div className="border-t border-gray-200 bg-gray-50 p-5 space-y-4">
                      {/* Student Contact Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Student Contact</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">📧 Email:</span>
                              <span className="font-medium text-gray-900">{meeting.student_email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">📱 Phone:</span>
                              <span className="font-medium text-gray-900">{meeting.student_phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Meeting Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">💰 Amount:</span>
                              <span className="font-medium text-gray-900">₹{meeting.amount || '0'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">🕐 Time Slot:</span>
                              <span className="font-medium text-gray-900">{meeting.meeting_time || 'Not set'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {meeting.notes && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Student Notes</h4>
                          <p className="text-sm text-gray-700">{meeting.notes}</p>
                        </div>
                      )}

                      {/* Attendance Actions */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-600 mb-3">Mark Attendance</h4>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleAttendance(meeting.id, 'present')}
                            disabled={attendanceUpdating === meeting.id || meeting.attendance === 'present'}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                              meeting.attendance === 'present'
                                ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                            }`}
                          >
                            {attendanceUpdating === meeting.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Updating...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Mark Present
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleAttendance(meeting.id, 'absent')}
                            disabled={attendanceUpdating === meeting.id || meeting.attendance === 'absent'}
                            className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                              meeting.attendance === 'absent'
                                ? 'bg-red-100 text-red-700 border-2 border-red-300 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'
                            }`}
                          >
                            {attendanceUpdating === meeting.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Updating...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <XCircle className="w-5 h-5" />
                                Mark Absent
                              </span>
                            )}
                          </button>
                        </div>
                        {meeting.attendance && meeting.attendance !== 'pending' && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Attendance already recorded as <span className="font-semibold">{meeting.attendance}</span>
                          </p>
                        )}
                      </div>

                      {/* Resources Management */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-600 mb-3">Meeting Resources</h4>
                        <div className="space-y-2 mb-3">
                          {meeting.resource_link && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">📁 Resources:</span>
                              <a href={meeting.resource_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                {meeting.resource_link}
                              </a>
                            </div>
                          )}
                          {meeting.notes_link && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">📝 Notes:</span>
                              <a href={meeting.notes_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                {meeting.notes_link}
                              </a>
                            </div>
                          )}
                          {!meeting.resource_link && !meeting.notes_link && (
                            <p className="text-sm text-gray-500">No resources added yet</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenResourceModal(meeting)}
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all"
                        >
                          {meeting.resource_link || meeting.notes_link ? 'Update Resources' : 'Add Resources'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past Meetings / History */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Meeting History</h2>
          {meetingsData.filter((m: any) => m.approval_status === 'approved' && new Date(m.meeting_date) < new Date()).length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-gray-500">No past meetings yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetingsData
                .filter((meeting: any) => meeting.approval_status === 'approved' && new Date(meeting.meeting_date) < new Date())
                .sort((a: any, b: any) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
                .map((meeting: any) => (
                <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900">{meeting.student_name || 'Unknown Student'}</h3>
                        {meeting.attendance === 'present' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            Present
                          </span>
                        )}
                        {meeting.attendance === 'absent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3" />
                            Absent
                          </span>
                        )}
                        {(!meeting.attendance || meeting.attendance === 'pending') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            No Record
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                        <span>📅 {new Date(meeting.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>🕐 {meeting.meeting_time || 'Time not set'}</span>
                        <span>💰 ₹{meeting.amount || 0}</span>
                      </div>
                      {(meeting.resource_link || meeting.notes_link) && (
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          {meeting.resource_link && (
                            <a href={meeting.resource_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              📁 Resources
                            </a>
                          )}
                          {meeting.notes_link && (
                            <a href={meeting.notes_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              📝 Notes
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {meeting.meeting_link && (
                        <a 
                          href={meeting.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
                        >
                          View Link
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenResourceModal(meeting)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-600 text-sm font-medium hover:bg-indigo-200 transition"
                      >
                        {meeting.resource_link || meeting.notes_link ? 'Edit' : 'Add'} Resources
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Role Badge */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-600 text-white">
              👨‍🏫 Teacher
            </span>
            <p className="ml-4 text-sm text-blue-900 font-medium">
              You can create courses, schedule classes, manage your meetings, and view enrolled students.
            </p>
          </div>
        </div>

        </main>
      </div>

      {/* Resource Modal */}
      {resourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Add Meeting Resources</h3>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📁 Resource Link (Google Drive, Dropbox, etc.)
                </label>
                <input
                  type="url"
                  value={resourceLink}
                  onChange={(e) => setResourceLink(e.target.value)}
                  placeholder="https://drive.google.com/file/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">Share slides, PDFs, documents, etc.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📝 Notes Link (Google Docs, Notion, etc.)
                </label>
                <input
                  type="url"
                  value={notesLink}
                  onChange={(e) => setNotesLink(e.target.value)}
                  placeholder="https://docs.google.com/document/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-1">Share meeting notes, recordings, or additional materials</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setResourceModal(null)}
                disabled={resourceUpdating}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateResources}
                disabled={resourceUpdating}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resourceUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  'Save Resources'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
