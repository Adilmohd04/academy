'use client';

import React, { useState } from 'react';
import { X, Calendar, Clock, Users, AlertTriangle, Send } from 'lucide-react';
import { WeekClass } from '@/types/lms';
import { format } from 'date-fns';

interface ClassCancellationManagerProps {
  classData: WeekClass;
  courseId: string;
  onCancel: (reason: string, rescheduleDate?: string, rescheduleTime?: string) => Promise<void>;
  onClose: () => void;
}

export default function ClassCancellationManager({
  classData,
  courseId,
  onCancel,
  onClose
}: ClassCancellationManagerProps) {
  const [cancellationReason, setCancellationReason] = useState('');
  const [shouldReschedule, setShouldReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onCancel(
        cancellationReason,
        shouldReschedule ? rescheduleDate : undefined,
        shouldReschedule ? rescheduleTime : undefined
      );
      
      // TODO: Send notifications if enabled
      if (notifyStudents) {
        // POST /api/courses/:courseId/classes/:classId/cancel/notify
        console.log('Sending notifications to students...');
      }

      onClose();
    } catch (error) {
      console.error('Error cancelling class:', error);
      alert('Failed to cancel class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Cancel Class</h2>
                <p className="text-red-100 text-sm">This action will notify all enrolled students</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Class Info */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-800 mb-3">Class Details</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-4 w-4 text-red-600" />
              <span>{format(new Date(classData.date), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-red-600" />
              <span>{classData.time}</span>
            </div>
            {classData.enrolledStudents !== undefined && (
              <div className="flex items-center gap-2 text-gray-700">
                <Users className="h-4 w-4 text-red-600" />
                <span>{classData.enrolledStudents} students enrolled</span>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cancellation Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation *
            </label>
            <textarea
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              required
              placeholder="Please provide a detailed reason for cancelling this class..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be shared with students in the notification
            </p>
          </div>

          {/* Reschedule Option */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shouldReschedule}
                onChange={(e) => setShouldReschedule(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded"
              />
              <span className="font-medium text-gray-700">
                Reschedule this class to another date/time
              </span>
            </label>
          </div>

          {/* Reschedule Fields */}
          {shouldReschedule && (
            <div className="pl-8 space-y-4 border-l-4 border-red-200">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Date *
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    required={shouldReschedule}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Time *
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    required={shouldReschedule}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700">
                  💡 <strong>Note:</strong> Students will be notified of the new schedule.
                  Make sure the new time doesn't conflict with other classes.
                </p>
              </div>
            </div>
          )}

          {/* Notification Option */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyStudents}
                onChange={(e) => setNotifyStudents(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded mt-0.5"
              />
              <div>
                <span className="font-medium text-gray-700 block">
                  Send notification to all enrolled students
                </span>
                <span className="text-sm text-gray-600">
                  Students will receive an email and in-app notification about the cancellation
                  {shouldReschedule && ' and new schedule'}
                </span>
              </div>
            </label>
          </div>

          {/* Warning */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 mb-1">Important</p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• This action cannot be undone</li>
                  <li>• All students will be notified immediately</li>
                  <li>• Any recordings or materials for this class will need to be updated</li>
                  {!shouldReschedule && <li>• Consider rescheduling instead of cancelling</li>}
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Keep Class
            </button>
            <button
              type="submit"
              disabled={loading || !cancellationReason.trim()}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {shouldReschedule ? 'Reschedule Class' : 'Cancel Class'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Usage Example Component
export function ClassCancellationExample() {
  const [showModal, setShowModal] = useState(false);

  const mockClass: WeekClass = {
    id: 'class-1',
    weekId: 'week-1',
    title: 'Introduction to Arabic Grammar',
    description: 'Live session covering basic grammar rules',
    date: '2024-01-20',
    time: '10:00 AM',
    scheduledAt: '2024-01-20T10:00:00Z',
    duration_minutes: 60,
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    meetingPlatform: 'google_meet',
    status: 'scheduled',
    isLive: false,
    canJoin: false,
    recordingUrl: undefined,
    attendanceRequired: true,
    attendees: [],
    teacherId: 'teacher-1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    enrolledStudents: 25
  };

  const handleCancel = async (
    reason: string,
    rescheduleDate?: string,
    rescheduleTime?: string
  ) => {
    console.log('Cancelling class:', {
      classId: mockClass.id,
      reason,
      rescheduleDate,
      rescheduleTime
    });

    // TODO: API call
    // PUT /api/courses/:courseId/classes/:classId/cancel
    // Body: { reason, rescheduleDate, rescheduleTime }
  };

  return (
    <div>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
      >
        <X className="h-4 w-4" />
        Cancel Class
      </button>

      {showModal && (
        <ClassCancellationManager
          classData={mockClass}
          courseId="course-1"
          onCancel={handleCancel}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
