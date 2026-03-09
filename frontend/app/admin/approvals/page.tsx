'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Calendar, BookOpen, CheckCircle, XCircle, Clock, Loader2, Eye, Package, Link as LinkIcon, Users, ChevronDown, ChevronUp, Filter, AlertCircle } from 'lucide-react';
import { IslamicCard } from '@/components/ui/IslamicCards';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  price: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface Student {
  requestId: string;
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
  topic: string;
  timeSlotId: string;
  startTime: string;
  endTime: string;
  slotName: string;
  maxCapacity: number;
  currentBookings: number;
  deadlineDate: string | null;
  deadlineTime: string | null;
  isUnlimited: boolean;
  status: 'OPEN' | 'CLOSED' | 'APPROVED' | 'MISSED';
  students: Student[];
}

type TabType = 'courses' | 'meetings';
type BoxFilterType = 'all' | 'open' | 'closed' | 'approved' | 'missed';

export default function ApprovalsPage() {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [courseFilter, setCourseFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [boxFilter, setBoxFilter] = useState<BoxFilterType>('closed');
  const [courses, setCourses] = useState<Course[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingLinks, setMeetingLinks] = useState<{[id: string]: string}>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [expandedBoxes, setExpandedBoxes] = useState<{[id: string]: boolean}>({});

  useEffect(() => {
    if (userId) {
      if (activeTab === 'courses') {
        fetchCourses();
      } else {
        fetchBoxes();
      }
    }
  }, [userId, activeTab]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses`);
      if (res.ok) {
        const response = await res.json();
        const coursesData = Array.isArray(response) ? response : (response.data || []);
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoxes = async () => {
    setLoading(true);
    try {
      // Fetch all meeting bookings and group by slot (box)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/admin/pending`, {
        headers: {
          'x-clerk-user-id': userId || ''
        }
      });
      if (res.ok) {
        const response = await res.json();
        const meetingsData = Array.isArray(response) ? response : (response.data || []);
        
        // Group bookings by teacher_slot_id to create boxes
        const boxMap = new Map<string, Box>();
        
        // Helper to convert time to IST display format
        const formatTimeIST = (time: string) => {
          if (!time) return '';
          // Time is stored in HH:MM:SS format, display as 12-hour format
          const [hours, minutes] = time.split(':');
          const h = parseInt(hours);
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          return `${h12}:${minutes} ${ampm}`;
        };
        
        meetingsData.forEach((booking: any) => {
          const slotKey = booking.teacher_slot_id || `${booking.teacher_id}-${booking.meeting_date}`;
          
          const student: Student = {
            requestId: booking.id,
            studentName: booking.student_name || 'Unknown',
            studentEmail: booking.student_email || '',
            studentPhone: booking.student_phone || '',
            notes: booking.notes || '',
            paymentStatus: booking.payment_status || 'pending',
            amount: booking.payment_amount || 0,
            requestedAt: booking.created_at || new Date().toISOString()
          };
          
          if (boxMap.has(slotKey)) {
            const existingBox = boxMap.get(slotKey)!;
            existingBox.students.push(student);
            existingBox.currentBookings = existingBox.students.length;
          } else {
            // Get IST time now
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
            const nowIST = new Date(now.getTime() + istOffset);
            
            // Check if slot time has passed (slot date + end time)
            const slotDate = booking.meeting_date;
            const slotEndTime = booking.time_slot_end || '23:59:59';
            const slotDateTime = new Date(`${slotDate}T${slotEndTime}`);
            const isSlotTimePassed = now > slotDateTime;
            
            // Check deadline
            const deadlineDateTime = booking.deadline_date && booking.deadline_time 
              ? new Date(`${booking.deadline_date}T${booking.deadline_time}`)
              : null;
            const isDeadlinePassed = deadlineDateTime ? now > deadlineDateTime : false;
            
            // Get actual capacity from slot
            const maxCap = booking.max_capacity || 10;
            const currentBookingsCount = booking.current_bookings || 0;
            const isCapacityFull = !booking.is_unlimited && (currentBookingsCount >= maxCap);
            
            // Determine box status:
            // APPROVED = already approved
            // MISSED = slot time passed but not approved (pending)
            // CLOSED = deadline passed OR capacity full (but slot time not yet passed)
            // OPEN = still accepting bookings
            const isApproved = booking.approval_status === 'approved';
            let boxStatus: 'OPEN' | 'CLOSED' | 'APPROVED' | 'MISSED' = 'OPEN';
            
            if (isApproved) {
              boxStatus = 'APPROVED';
            } else if (isSlotTimePassed) {
              boxStatus = 'MISSED'; // Slot time passed without approval
            } else if (isDeadlinePassed || isCapacityFull) {
              boxStatus = 'CLOSED'; // Ready for approval
            }
            
            const newBox: Box = {
              boxId: slotKey,
              teacherId: booking.teacher_id || '',
              teacherName: booking.teacher_name || 'Unknown Teacher',
              teacherEmail: booking.teacher_email || '',
              date: booking.meeting_date || '',
              topic: booking.topic || 'Meeting',
              timeSlotId: booking.time_slot_id || '',
              startTime: formatTimeIST(booking.time_slot_start),
              endTime: formatTimeIST(booking.time_slot_end),
              slotName: booking.time_slot_name || '',
              maxCapacity: maxCap,
              currentBookings: currentBookingsCount,
              deadlineDate: booking.deadline_date || '',
              deadlineTime: booking.deadline_time || '',
              isUnlimited: booking.is_unlimited || false,
              status: boxStatus,
              students: [student]
            };
            boxMap.set(slotKey, newBox);
          }
        });
        
        setBoxes(Array.from(boxMap.values()));
      }
    } catch (error) {
      console.error('Error fetching boxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCourse = async (courseId: string) => {
    if (!confirm('Approve this course?')) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (res.ok) {
        alert('Course approved!');
        fetchCourses();
      }
    } catch (error) {
      console.error('Error approving course:', error);
    }
  };

  const handleRejectCourse = async (courseId: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-clerk-user-id': userId || ''
        },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
      });

      if (res.ok) {
        alert('Course rejected');
        fetchCourses();
      }
    } catch (error) {
      console.error('Error rejecting course:', error);
    }
  };

  const handleApproveBox = async (boxId: string) => {
    const box = boxes.find(b => b.boxId === boxId);
    if (!box) return;
    
    const meetingLink = meetingLinks[boxId];
    if (!meetingLink) {
      if (!confirm('No meeting link provided. Approve anyway?')) return;
    }
    
    setApprovingId(boxId);
    try {
      // Approve all students in the box
      const approvalPromises = box.students.map(student =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/admin/${student.requestId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': userId || ''
          },
          body: JSON.stringify({ meetingLink: meetingLink || null })
        })
      );
      
      await Promise.all(approvalPromises);
      alert(`Box approved! ${box.students.length} student(s) will receive the meeting link.`);
      fetchBoxes();
    } catch (error) {
      console.error('Error approving box:', error);
      alert('Failed to approve box');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectBox = async (boxId: string) => {
    const box = boxes.find(b => b.boxId === boxId);
    if (!box) return;
    
    const reason = prompt('Reason for rejection (will apply to all students in this box):');
    if (!reason) return;
    
    setApprovingId(boxId);
    try {
      // Reject all students in the box
      const rejectPromises = box.students.map(student =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/meetings/admin/${student.requestId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-clerk-user-id': userId || ''
          },
          body: JSON.stringify({ reason })
        })
      );
      
      await Promise.all(rejectPromises);
      alert(`Box rejected. ${box.students.length} student(s) have been notified.`);
      fetchBoxes();
    } catch (error) {
      console.error('Error rejecting box:', error);
      alert('Failed to reject box');
    } finally {
      setApprovingId(null);
    }
  };

  const toggleBoxExpanded = (boxId: string) => {
    setExpandedBoxes(prev => ({
      ...prev,
      [boxId]: !prev[boxId]
    }));
  };

  const filteredCourses = courses.filter(c => c.status === courseFilter);
  
  // Filter boxes by status
  const filteredBoxes = boxes.filter(box => {
    if (boxFilter === 'all') return true;
    return box.status.toLowerCase() === boxFilter;
  });

  const statusCounts = {
    courses: {
      pending: courses.filter(c => c.status === 'pending').length,
      approved: courses.filter(c => c.status === 'approved').length,
      rejected: courses.filter(c => c.status === 'rejected').length,
    },
    boxes: {
      all: boxes.length,
      open: boxes.filter(b => b.status === 'OPEN').length,
      closed: boxes.filter(b => b.status === 'CLOSED').length,
      approved: boxes.filter(b => b.status === 'APPROVED').length,
      missed: boxes.filter(b => b.status === 'MISSED').length,
    }
  };

  const getDeadlineStatus = (box: Box) => {
    if (!box.deadlineDate || !box.deadlineTime) return null;
    const deadline = new Date(`${box.deadlineDate}T${box.deadlineTime}`);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) {
      return { text: 'EXPIRED', color: 'text-red-600 bg-red-100' };
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return { text: `${days}d ${hours % 24}h left`, color: 'text-orange-600 bg-orange-100' };
    }
    return { text: `${hours}h left`, color: 'text-yellow-600 bg-yellow-100' };
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Pending Approvals</h1>
        <p className="text-slate-600">Review and manage course and meeting box approval requests</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'courses'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-blue-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Course Approvals
            {statusCounts.courses.pending > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {statusCounts.courses.pending}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === 'meetings'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-blue-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Meeting Boxes
            {statusCounts.boxes.closed > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {statusCounts.boxes.closed} ready
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Status Filter - Different for each tab */}
      {activeTab === 'courses' ? (
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setCourseFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                courseFilter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-xs">
                ({statusCounts.courses[status]})
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-6">
          {(['all', 'open', 'closed', 'approved', 'missed'] as BoxFilterType[]).map((status) => (
            <button
              key={status}
              onClick={() => setBoxFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                boxFilter === status
                  ? status === 'closed' 
                    ? 'bg-orange-600 text-white shadow-md' 
                    : status === 'open'
                    ? 'bg-green-600 text-white shadow-md'
                    : status === 'approved'
                    ? 'bg-blue-600 text-white shadow-md'
                    : status === 'missed'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-700 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
              }`}
            >
              {status === 'open' && <Clock className="w-4 h-4" />}
              {status === 'closed' && <AlertCircle className="w-4 h-4" />}
              {status === 'approved' && <CheckCircle className="w-4 h-4" />}
              {status === 'missed' && <XCircle className="w-4 h-4" />}
              {status === 'all' && <Filter className="w-4 h-4" />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="text-xs">
                ({statusCounts.boxes[status]})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : activeTab === 'courses' ? (
        filteredCourses.length === 0 ? (
          <IslamicCard className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No {courseFilter} courses</h3>
            <p className="text-slate-500">There are no courses with {courseFilter} status</p>
          </IslamicCard>
        ) : (
          <div className="space-y-4">
            {filteredCourses.map((course) => (
              <IslamicCard key={course.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-800">{course.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        course.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        course.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-slate-600 mb-3">{course.description}</p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <div><span className="font-medium">Teacher:</span> {course.profiles?.full_name}</div>
                      <div><span className="font-medium">Category:</span> {course.category}</div>
                      <div><span className="font-medium">Level:</span> {course.level}</div>
                      <div><span className="font-medium">Price:</span> {course.price === 0 ? 'Free' : `₹${course.price}`}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {course.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveCourse(course.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectCourse(course.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => window.open(`/admin/courses/${course.id}`, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              </IslamicCard>
            ))}
          </div>
        )
      ) : (
        // Meeting Boxes tab
        <>
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">📦 Meeting Box System</h3>
                <p className="text-sm text-blue-700">
                  Each box groups all students who booked the same slot. 
                  <span className="font-medium"> OPEN</span> = accepting bookings, 
                  <span className="font-medium"> CLOSED</span> = ready to approve (deadline passed or full).
                </p>
              </div>
            </div>
          </div>

          {filteredBoxes.length === 0 ? (
            <IslamicCard className="p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No {boxFilter === 'all' ? '' : boxFilter} boxes</h3>
              <p className="text-slate-500">
                {boxFilter === 'closed' 
                  ? 'No boxes ready for approval. Wait for deadlines to pass or capacity to fill.'
                  : `There are no boxes with ${boxFilter} status`}
              </p>
            </IslamicCard>
          ) : (
            <div className="space-y-4">
              {filteredBoxes.map((box) => {
                const deadlineStatus = getDeadlineStatus(box);
                const isExpanded = expandedBoxes[box.boxId] || false;
                const capacityPercent = box.isUnlimited ? 0 : Math.round((box.students.length / box.maxCapacity) * 100);
                
                return (
                  <IslamicCard key={box.boxId} className="overflow-hidden">
                    {/* Box Header */}
                    <div className={`p-6 ${
                      box.status === 'CLOSED' ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200' :
                      box.status === 'APPROVED' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200' :
                      box.status === 'MISSED' ? 'bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200' :
                      'bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Status + Title */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                              box.status === 'OPEN' ? 'bg-green-100 text-green-700 border border-green-300' :
                              box.status === 'CLOSED' ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                              box.status === 'MISSED' ? 'bg-red-100 text-red-700 border border-red-300' :
                              'bg-blue-100 text-blue-700 border border-blue-300'
                            }`}>
                              {box.status === 'OPEN' && <Clock className="w-4 h-4 inline mr-1" />}
                              {box.status === 'CLOSED' && <AlertCircle className="w-4 h-4 inline mr-1" />}
                              {box.status === 'APPROVED' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                              {box.status === 'MISSED' && <XCircle className="w-4 h-4 inline mr-1" />}
                              {box.status}
                            </span>
                            <h3 className="text-xl font-bold text-slate-800">{box.topic}</h3>
                            {box.status === 'MISSED' && (
                              <span className="px-2 py-1 rounded text-xs font-semibold text-red-600 bg-red-100">
                                Slot Time Passed
                              </span>
                            )}
                            {box.status !== 'MISSED' && deadlineStatus && (
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${deadlineStatus.color}`}>
                                {deadlineStatus.text}
                              </span>
                            )}
                          </div>
                          
                          {/* Box Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div className="bg-white/60 p-3 rounded-lg">
                              <span className="block text-slate-500 text-xs mb-1">Teacher</span>
                              <span className="font-semibold text-slate-800">{box.teacherName}</span>
                            </div>
                            <div className="bg-white/60 p-3 rounded-lg">
                              <span className="block text-slate-500 text-xs mb-1">Date</span>
                              <span className="font-semibold text-slate-800">
                                {box.date ? new Date(box.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}
                              </span>
                            </div>
                            <div className="bg-white/60 p-3 rounded-lg">
                              <span className="block text-slate-500 text-xs mb-1">Time</span>
                              <span className="font-semibold text-slate-800">
                                {box.startTime && box.endTime ? `${box.startTime} - ${box.endTime}` : box.slotName || 'TBD'}
                              </span>
                            </div>
                            <div className="bg-white/60 p-3 rounded-lg">
                              <span className="block text-slate-500 text-xs mb-1">Capacity</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">
                                  {box.students.length} / {box.isUnlimited ? '∞' : box.maxCapacity}
                                </span>
                                {!box.isUnlimited && (
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${capacityPercent >= 100 ? 'bg-red-500' : capacityPercent >= 75 ? 'bg-orange-500' : 'bg-green-500'}`}
                                      style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Deadline Info */}
                          {box.deadlineDate && (
                            <div className="text-xs text-slate-600 mb-2">
                              <span className="font-medium">Booking Deadline:</span> {new Date(box.deadlineDate).toLocaleDateString()} at {box.deadlineTime}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleBoxExpanded(box.boxId)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium whitespace-nowrap border border-slate-300"
                          >
                            <Users className="w-4 h-4" />
                            {isExpanded ? 'Hide' : 'View'} Students ({box.students.length})
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          
                          {box.status === 'CLOSED' && (
                            <>
                              <button
                                onClick={() => handleApproveBox(box.boxId)}
                                disabled={approvingId === box.boxId}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
                              >
                                {approvingId === box.boxId ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Approving...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Approve All
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectBox(box.boxId)}
                                disabled={approvingId === box.boxId}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                Reject All
                              </button>
                            </>
                          )}
                          
                          {box.status === 'OPEN' && (
                            <span className="text-xs text-slate-500 text-center px-2">
                              Wait for deadline or capacity
                            </span>
                          )}
                          
                          {box.status === 'MISSED' && (
                            <span className="text-xs text-red-500 text-center px-2 font-medium">
                              ⚠️ Slot time has passed
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Meeting Link Input (only for CLOSED boxes) */}
                      {box.status === 'CLOSED' && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Meeting Link for All Students (Google Meet / Zoom)
                          </label>
                          <input
                            type="url"
                            value={meetingLinks[box.boxId] || ''}
                            onChange={(e) => setMeetingLinks({ ...meetingLinks, [box.boxId]: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 bg-white placeholder-slate-400"
                            placeholder="https://meet.google.com/xxx-yyyy-zzz"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            This link will be sent to all {box.students.length} student(s) in this box upon approval.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Expanded Student List */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Enrolled Students ({box.students.length})
                        </h4>
                        <div className="space-y-2">
                          {box.students.map((student, idx) => (
                            <div key={student.requestId} className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                                  {idx + 1}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">{student.studentName}</div>
                                  <div className="text-sm text-slate-500">{student.studentEmail}</div>
                                  {student.studentPhone && (
                                    <div className="text-xs text-slate-400">{student.studentPhone}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {student.notes && (
                                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded max-w-[200px] truncate" title={student.notes}>
                                    {student.notes}
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  student.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                  student.paymentStatus === 'free' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {student.paymentStatus === 'paid' ? `₹${student.amount}` : 
                                   student.paymentStatus === 'free' ? 'Free' : 'Pending'}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {new Date(student.requestedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </IslamicCard>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
