'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';
import { 
  Calendar, Clock, Video, Users, CheckCircle, X,
  AlertCircle, ExternalLink, RefreshCw, Info
} from 'lucide-react';
import { 
  FinalExam, 
  StudentExamInterview, 
  ExamTimeSlot,
  StudentExamCategory 
} from '@/types/lms';
import { format, isAfter, isBefore, differenceInMinutes } from 'date-fns';

interface FinalExamInterviewProps {
  exam: FinalExam;
  studentId: string;
  studentCategory?: string;
}

export default function FinalExamInterview({ 
  exam, 
  studentId,
  studentCategory 
}: FinalExamInterviewProps) {
  const { getToken, userId } = useAuth();
  const [availableSlots, setAvailableSlots] = useState<ExamTimeSlot[]>([]);
  const [myInterview, setMyInterview] = useState<StudentExamInterview | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  type ExamWithInterviewData = FinalExam & {
    interview?: unknown;
    availableTimeSlots?: ExamTimeSlot[];
  };

  const resolveErrorMessage = (error: unknown, fallback: string): string => {
    if (!error || typeof error !== 'object') return fallback;

    const apiError = error as {
      response?: {
        data?: {
          error?: string;
          message?: string;
        };
      };
      message?: string;
    };

    return apiError.response?.data?.error || apiError.response?.data?.message || apiError.message || fallback;
  };

  useEffect(() => {
    fetchInterviewData();
  }, [exam.id, studentId]);

  const mapInterview = (raw: any): StudentExamInterview => {
    const scheduledDateValue = raw?.scheduledDate || raw?.scheduled_date || new Date().toISOString();
    const scheduledDate = new Date(scheduledDateValue);

    return {
      id: String(raw?.id || ''),
      examId: String(raw?.examId || raw?.exam_id || exam.id),
      studentId: String(raw?.studentId || raw?.student_id || studentId || userId || ''),
      slotId: String(raw?.slotId || raw?.slot_id || ''),
      categoryId: raw?.categoryId || raw?.category_id,
      scheduledDate: Number.isNaN(scheduledDate.getTime()) ? new Date().toISOString() : scheduledDate.toISOString(),
      scheduledTime: raw?.scheduledTime || raw?.scheduled_time || 'TBD',
      duration_minutes: Number(raw?.duration_minutes || raw?.durationMinutes || 15),
      meetingUrl: raw?.meetingUrl || raw?.meeting_link || '',
      meetingPassword: raw?.meetingPassword || raw?.meeting_password,
      platform: raw?.platform || 'google_meet',
      status: raw?.status || 'scheduled',
      confirmationSentAt: raw?.confirmationSentAt || raw?.confirmation_sent_at,
      confirmedAt: raw?.confirmedAt || raw?.confirmed_at,
      rescheduledFrom: raw?.rescheduledFrom || raw?.rescheduled_from,
      rescheduledReason: raw?.rescheduledReason || raw?.rescheduled_reason,
      rescheduledBy: raw?.rescheduledBy || raw?.rescheduled_by,
      attended: Boolean(raw?.attended),
      marksObtained: raw?.marksObtained ?? raw?.marks_obtained,
      feedback: raw?.feedback,
      interviewNotes: raw?.interviewNotes || raw?.interview_notes,
      gradedBy: raw?.gradedBy || raw?.graded_by,
      gradedAt: raw?.gradedAt || raw?.graded_at,
      createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
      updatedAt: raw?.updatedAt || raw?.updated_at || new Date().toISOString(),
    };
  };

  const fetchInterviewData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const examData = exam as ExamWithInterviewData;
      const interviewFromExam = examData.interview;
      if (interviewFromExam) {
        setMyInterview(mapInterview(interviewFromExam));
      } else if (userId) {
        const token = await getToken();
        try {
          const detailsResponse = await api.student.getExamInterviewDetails(exam.id, token, userId);
          setMyInterview(mapInterview(detailsResponse.data));
        } catch {
          setMyInterview(null);
        }
      }

      const slots = Array.isArray(examData.availableTimeSlots)
        ? examData.availableTimeSlots
        : [];
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching interview data:', error);
      setActionError('Could not load interview details right now.');
      setMyInterview(null);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slot: ExamTimeSlot) => {
    if (!userId) {
      setActionError('Please sign in to book an interview slot.');
      return;
    }

    setBooking(true);
    setActionError(null);
    try {
      const token = await getToken();
      const scheduledDate = new Date(`${slot.date}T${slot.startTime}:00`);
      const startMinutes = slot.startTime.split(':').map(Number);
      const endMinutes = slot.endTime.split(':').map(Number);
      const durationMinutes = Math.max(
        1,
        (endMinutes[0] * 60 + endMinutes[1]) - (startMinutes[0] * 60 + startMinutes[1])
      );

      await api.student.bookFinalExamInterview(
        exam.id,
        {
          slot_id: slot.id,
          category_id: slot.categoryId || null,
          scheduled_date: scheduledDate.toISOString(),
          duration_minutes: durationMinutes,
          meeting_link: slot.meetingUrl || null
        },
        token,
        userId
      );

      setSelectedSlot(null);
      setRescheduleMode(false);
      await fetchInterviewData();
    } catch (error: unknown) {
      console.error('Error booking slot:', error);
      setActionError(resolveErrorMessage(error, 'Failed to book interview slot'));
    } finally {
      setBooking(false);
    }
  };

  const handleReschedule = async (slot: ExamTimeSlot) => {
    if (!myInterview || !userId) {
      setActionError('Please sign in to reschedule your interview.');
      return;
    }

    setBooking(true);
    setActionError(null);
    try {
      const token = await getToken();
      const scheduledDate = new Date(`${slot.date}T${slot.startTime}:00`);
      const startMinutes = slot.startTime.split(':').map(Number);
      const endMinutes = slot.endTime.split(':').map(Number);
      const durationMinutes = Math.max(
        1,
        (endMinutes[0] * 60 + endMinutes[1]) - (startMinutes[0] * 60 + startMinutes[1])
      );

      await api.student.rescheduleFinalExamInterview(
        exam.id,
        myInterview.id,
        {
            slot_id: slot.id,
            scheduled_date: scheduledDate.toISOString(),
            duration_minutes: durationMinutes,
            meeting_link: slot.meetingUrl || myInterview.meetingUrl || null
        },
        token,
        userId
      );

      setSelectedSlot(null);
      setRescheduleMode(false);
      await fetchInterviewData();
    } catch (error: unknown) {
      console.error('Error rescheduling slot:', error);
      setActionError(resolveErrorMessage(error, 'Failed to reschedule interview'));
    } finally {
      setBooking(false);
    }
  };

  const handleConfirm = async () => {
    if (!myInterview) return;
    
    try {
      if (!userId) {
        setActionError('Please sign in to confirm your interview.');
        return;
      }

      setActionError(null);
      const token = await getToken();
      await api.student.confirmFinalExamInterview(exam.id, myInterview.id, token, userId);

      await fetchInterviewData();
    } catch (error: unknown) {
      console.error('Error confirming:', error);
      setActionError(resolveErrorMessage(error, 'Failed to confirm interview'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!exam.interviewSettings) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-600">Interview settings not configured</p>
      </div>
    );
  }

  const isReleased = isAfter(new Date(), new Date(`${exam.releaseDate}T${exam.releaseTime}`));
  const isExpired = isAfter(new Date(), new Date(`${exam.dueDate}T${exam.dueTime}`));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='0.1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-purple-100">Final Exam - Interview</p>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
            </div>
          </div>
          
          <p className="text-purple-100 mb-4">{exam.description}</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Platform</p>
              <p className="text-lg font-bold flex items-center gap-2">
                {exam.interviewSettings.platform === 'google_meet' ? '📞 Google Meet' :
                 exam.interviewSettings.platform === 'zoom' ? '📞 Zoom' :
                 '📞 Microsoft Teams'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Duration</p>
              <p className="text-lg font-bold">
                {exam.interviewSettings.slotDuration_minutes} minutes
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <p className="text-sm text-purple-100 mb-1">Total Marks</p>
              <p className="text-lg font-bold">{exam.totalMarks}</p>
            </div>
          </div>
        </div>
      </div>

      {!isReleased && (
        <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center gap-3 text-amber-700">
            <Clock className="h-6 w-6" />
            <div>
              <p className="font-bold">Interview Booking Opens Soon</p>
              <p className="text-sm">
                Available from: {format(new Date(`${exam.releaseDate}T${exam.releaseTime}`), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* My Interview Booking */}
      {myInterview ? (
        <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
          myInterview.status === 'confirmed' ? 'border-green-300' :
          myInterview.status === 'scheduled' ? 'border-blue-300' :
          'border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Your Interview Slot</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">
                    {format(new Date(myInterview.scheduledDate), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">
                    {myInterview.scheduledTime} ({myInterview.duration_minutes} minutes)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Video className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">
                    {myInterview.platform === 'google_meet' ? 'Google Meet' :
                     myInterview.platform === 'zoom' ? 'Zoom' : 'Microsoft Teams'}
                  </span>
                </div>
              </div>
            </div>

            <StatusBadge status={myInterview.status} />
          </div>

          {myInterview.status === 'scheduled' && exam.interviewSettings.requiresConfirmation && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-3">
                <strong>⚠️ Action Required:</strong> Please confirm your interview slot
              </p>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Interview
              </button>
            </div>
          )}

          {(myInterview.status === 'confirmed' || myInterview.status === 'scheduled') && (
            <div className="space-y-3">
              <a
                href={myInterview.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-center hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                Join Interview
              </a>

              {myInterview.meetingPassword && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Meeting Password:</strong> <code className="px-2 py-1 bg-gray-200 rounded">{myInterview.meetingPassword}</code>
                  </p>
                </div>
              )}

              {exam.interviewSettings.allowRescheduling && 
               (!exam.interviewSettings.rescheduleDeadline || 
                isBefore(new Date(), new Date(exam.interviewSettings.rescheduleDeadline))) && (
                <button
                  onClick={() => {
                    setSelectedSlot(null);
                    setRescheduleMode(true);
                  }}
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reschedule Interview
                </button>
              )}
            </div>
          )}

          {myInterview.status === 'completed' && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              {myInterview.marksObtained !== undefined ? (
                <div>
                  <p className="text-sm font-medium text-green-700 mb-2">Your Score:</p>
                  <p className="text-3xl font-bold text-green-600">
                    {myInterview.marksObtained} / {exam.totalMarks}
                  </p>
                  {myInterview.feedback && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-sm font-medium text-green-700 mb-1">Feedback:</p>
                      <p className="text-sm text-gray-700">{myInterview.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-green-700">
                  ✅ Interview completed. Results will be announced soon.
                </p>
              )}
            </div>
          )}
        </div>
      ) : myInterview && rescheduleMode && !isExpired ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Choose a New Interview Slot</h3>
            <button
              onClick={() => {
                setRescheduleMode(false);
                setSelectedSlot(null);
              }}
              className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            {availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600">No alternative slots available right now</p>
              </div>
            ) : (
              availableSlots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  isSelected={selectedSlot === slot.id}
                  onSelect={() => setSelectedSlot(slot.id)}
                  onBook={() => handleReschedule(slot)}
                  booking={booking}
                />
              ))
            )}
          </div>
        </div>
      ) : isReleased && !isExpired ? (
        <>
          {/* Available Slots */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Select Your Interview Slot</h3>
            
            {exam.interviewSettings.categorizeStudents && studentCategory && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>Your Category:</strong> {studentCategory}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Some slots may be reserved for specific categories
                </p>
              </div>
            )}

            <div className="space-y-3">
              {availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">No available slots at this time</p>
                </div>
              ) : (
                availableSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    isSelected={selectedSlot === slot.id}
                    onSelect={() => setSelectedSlot(slot.id)}
                    onBook={() => handleBookSlot(slot)}
                    booking={booking}
                  />
                ))
              )}
            </div>
          </div>
        </>
      ) : isExpired ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600">Interview booking period has ended</p>
        </div>
      ) : null}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-gray-800 mb-2">Interview Instructions</h4>
            <div className="text-sm text-gray-700 space-y-2">
              <p>{exam.instructions}</p>
              <ul className="list-disc list-inside space-y-1 mt-3">
                <li>Join the meeting 5 minutes before your scheduled time</li>
                <li>Ensure you have a stable internet connection</li>
                <li>Test your camera and microphone beforehand</li>
                <li>Keep your ID ready for verification</li>
                <li>Find a quiet place for the interview</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const badges = {
    pending: (
      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
        Pending
      </span>
    ),
    scheduled: (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Scheduled
      </span>
    ),
    confirmed: (
      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Confirmed
      </span>
    ),
    completed: (
      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Completed
      </span>
    ),
    cancelled: (
      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
        <X className="h-3 w-3" />
        Cancelled
      </span>
    ),
    rescheduled: (
      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full flex items-center gap-1">
        <RefreshCw className="h-3 w-3" />
        Rescheduled
      </span>
    )
  };

  return badges[status as keyof typeof badges] || badges.pending;
}

// Slot Card Component
function SlotCard({ 
  slot, 
  isSelected, 
  onSelect, 
  onBook,
  booking 
}: { 
  slot: ExamTimeSlot;
  isSelected: boolean;
  onSelect: () => void;
  onBook: () => void;
  booking: boolean;
}) {
  const isFull = slot.status === 'full' || slot.bookedStudents >= slot.maxStudents;
  const isAvailable = slot.status === 'available' && !isFull;
  const spotsLeft = slot.maxStudents - slot.bookedStudents;

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-purple-600 bg-purple-50'
          : isFull
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 hover:border-purple-300 cursor-pointer'
      }`}
      onClick={isAvailable ? onSelect : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="font-medium">
                {format(new Date(slot.date), 'EEEE, MMM d')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="font-medium">
                {slot.startTime} - {slot.endTime}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className={`flex items-center gap-1 ${spotsLeft <= 2 && spotsLeft > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
              <Users className="h-4 w-4" />
              <span>
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
              </span>
            </div>
            
            {slot.categoryId && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                Reserved Category
              </span>
            )}
          </div>
        </div>

        {isAvailable && (
          <div className="flex items-center gap-2">
            {isSelected ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBook();
                }}
                disabled={booking}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {booking ? 'Booking...' : 'Book This Slot'}
              </button>
            ) : (
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                Select
              </button>
            )}
          </div>
        )}

        {isFull && (
          <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">
            Full
          </span>
        )}
      </div>
    </div>
  );
}
