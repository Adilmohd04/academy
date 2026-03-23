'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { 
  Mic, 
  Video, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  User
} from 'lucide-react';

interface ExamWaitingData {
  id: string;
  student_id: string;
  student_name: string;
  final_exam_id: string;
  exam_title: string;
  course_title: string;
  scheduled_date: string;
  duration_minutes: number;
  meeting_link: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  teacher_name?: string;
}

interface DeviceStatus {
  camera: boolean;
  microphone: boolean;
  speaker: boolean;
  internet: 'good' | 'fair' | 'poor';
}

export default function ExamWaitingRoom({ params }: { params: { examId: string } }) {
  const { getToken, userId } = useAuth();
  const { examId } = params;

  const [examData, setExamData] = useState<ExamWaitingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    camera: false,
    microphone: false,
    speaker: true,
    internet: 'good'
  });
  const [timeUntilStart, setTimeUntilStart] = useState(0);
  const [canJoin, setCanJoin] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fetch exam details
  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/student/exams/${examId}/details`, {
          headers: {
            'x-clerk-user-id': userId || '',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch exam details');
        }

        const data: ExamWaitingData = await response.json();
        setExamData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load exam details');
      } finally {
        setLoading(false);
      }
    };

    fetchExamDetails();
  }, [examId, getToken]);

  // Update countdown timer
  useEffect(() => {
    if (!examData) return;

    const updateTimer = () => {
      const scheduledTime = new Date(examData.scheduled_date).getTime();
      const now = new Date().getTime();
      const timeLeft = Math.floor((scheduledTime - now) / 1000);

      setTimeUntilStart(timeLeft);
      setCanJoin(timeLeft <= 300); // Allow join 5 minutes before

      if (timeLeft <= 0) {
        setCanJoin(true); // Allow join if time has passed
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [examData]);

  // Check camera access
  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setDeviceStatus(prev => ({ ...prev, camera: true }));
      setLocalStream(stream);

      if (videoRef) {
        videoRef.srcObject = stream;
      }
    } catch (err) {
      setDeviceStatus(prev => ({ ...prev, camera: false }));
      console.error('Camera access denied:', err);
    }
  };

  // Check microphone access
  const checkMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setDeviceStatus(prev => ({ ...prev, microphone: true }));

      // Stop audio stream to avoid feedback
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setDeviceStatus(prev => ({ ...prev, microphone: false }));
      console.error('Microphone access denied:', err);
    }
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  const joinExam = async () => {
    if (!examData?.meeting_link) {
      alert('Meeting link is not available yet');
      return;
    }

    // Open meeting link in new tab
    window.open(examData.meeting_link, '_blank', 'width=800,height=600');

    // Mark as started on backend
    try {
      const token = await getToken();
      await fetch(`${API_URL}/api/student/exams/${examId}/mark-started`, {
        method: 'PATCH',
        headers: {
          'x-clerk-user-id': userId || '',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error('Error marking exam as started:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return 'Ready to Join';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <RefreshCw size={48} className="text-blue-600" />
          </div>
          <p className="text-gray-600 text-lg">Loading your exam details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8 max-w-md text-center">
          <AlertCircle size={48} className="mx-auto text-red-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Exam not found</p>
        </div>
      </div>
    );
  }

  const allDevicesReady = deviceStatus.camera && deviceStatus.microphone;
  const examDateTime = new Date(examData.scheduled_date);
  const now = new Date();
  const examStarted = examDateTime <= now;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">📝 Exam Waiting Room</h1>
        <p className="text-gray-600">Prepare your device before joining the interview</p>
      </div>

      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Left: Video Preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-2"
        >
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Video Feed */}
            <div className="bg-black aspect-video relative flex items-center justify-center">
              {deviceStatus.camera ? (
                <video
                  ref={el => {
                    if (el) setVideoRef(el);
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <Video size={64} className="text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Camera not enabled</p>
                  <button
                    onClick={checkCamera}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Enable Camera
                  </button>
                </div>
              )}
            </div>

            {/* Exam Info */}
            <div className="p-6 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{examData.exam_title}</h2>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <User size={20} className="text-gray-500" />
                  <span><strong>Course:</strong> {examData.course_title}</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Clock size={20} className="text-gray-500" />
                  <span>
                    <strong>Scheduled:</strong> {formatDate(examData.scheduled_date)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Clock size={20} className="text-gray-500" />
                  <span><strong>Duration:</strong> {examData.duration_minutes} minutes</span>
                </div>
              </div>

              {examData.teacher_name && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-gray-700">
                    👨‍🎓 <strong>Interviewer:</strong> {examData.teacher_name}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right: Device Checks & Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          {/* Timer */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white text-center">
            <div className="text-5xl font-bold mb-2 font-mono">
              {formatCountdown(timeUntilStart)}
            </div>
            <p className="text-blue-100">until exam starts</p>
          </div>

          {/* Device Status */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Device Checklist</h3>

            {/* Camera Check */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${deviceStatus.camera ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Video size={20} className={deviceStatus.camera ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Camera</p>
                  <p className="text-sm text-gray-500">
                    {deviceStatus.camera ? '✅ Ready' : '❌ Not ready'}
                  </p>
                </div>
              </div>
              {!deviceStatus.camera && (
                <button
                  onClick={checkCamera}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Enable
                </button>
              )}
            </div>

            {/* Microphone Check */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${deviceStatus.microphone ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Mic size={20} className={deviceStatus.microphone ? 'text-green-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Microphone</p>
                  <p className="text-sm text-gray-500">
                    {deviceStatus.microphone ? '✅ Ready' : '❌ Not ready'}
                  </p>
                </div>
              </div>
              {!deviceStatus.microphone && (
                <button
                  onClick={checkMicrophone}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Enable
                </button>
              )}
            </div>

            {/* Speaker Check */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <span className="text-xl">🔊</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Speaker</p>
                  <p className="text-sm text-gray-500">✅ Ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h4 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertCircle size={18} />
              Requirements
            </h4>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>✓ Quiet environment</li>
              <li>✓ Stable internet</li>
              <li>✓ Valid ID nearby</li>
              <li>✓ Professional attire</li>
            </ul>
          </div>

          {/* Join Button */}
          {canJoin && examStarted && (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={joinExam}
              disabled={!examData.meeting_link}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                examData.meeting_link
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg hover:scale-105'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              <CheckCircle size={24} />
              {examData.meeting_link ? 'Join Exam Now' : 'Waiting for Link...'}
            </motion.button>
          )}

          {!canJoin && (
            <div className="w-full py-4 px-6 rounded-xl font-bold text-center bg-gray-100 text-gray-600">
              Ready in {formatCountdown(timeUntilStart)}
            </div>
          )}

          {allDevicesReady && (
            <div className="text-center text-green-600 text-sm font-medium">
              ✅ All devices ready!
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer Note */}
      <div className="max-w-4xl mx-auto mt-8 text-center text-sm text-gray-600">
        <p>Please do not close this window. Your interview details are stored locally.</p>
      </div>
    </div>
  );
}
