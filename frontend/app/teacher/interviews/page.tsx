'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  User, 
  PhoneOff, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Calendar,
  Users
} from 'lucide-react';

interface Interview {
  id: string;
  student_id: string;
  scheduled_date: string;
  duration_minutes: number;
  meeting_link: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  final_exams: {
    id: string;
    title: string;
    course_id: string;
  };
  course: {
    id: string;
    title: string;
  };
  startsIn: number;
  isUpcoming: boolean;
}

interface InterviewDashboardData {
  interviews: Interview[];
  total: number;
  upcoming: number;
  completed: number;
}

export default function TeacherInterviewsPage() {
  const { getToken } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0 });
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchInterviews();
    // Refresh every 30 seconds to show updated "starts in" counts
    const interval = setInterval(fetchInterviews, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/teacher/interviews`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch interviews');
      }

      const data: InterviewDashboardData = await response.json();
      setInterviews(data.interviews);
      setStats(data);
    } catch (err: any) {
      console.error('Error fetching interviews:', err);
      setError(err.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const completeInterview = async (interviewId: string, grade?: number, feedback?: string) => {
    try {
      const token = await getToken();

      const response = await fetch(`${API_URL}/api/teacher/interviews/${interviewId}/complete`, {
        method: 'PATCH',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ grade, feedback })
      });

      if (!response.ok) {
        throw new Error('Failed to complete interview');
      }

      // Update local state
      setInterviews(prev =>
        prev.map(i =>
          i.id === interviewId ? { ...i, status: 'completed' } : i
        )
      );
    } catch (err: any) {
      console.error('Error completing interview:', err);
      alert('Failed to mark interview as completed');
    }
  };

  const openMeetingLink = (meetingLink: string) => {
    if (meetingLink) {
      window.open(meetingLink, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in-progress':
        return 'bg-blue-50 border-blue-200';
      case 'scheduled':
        return 'bg-yellow-50 border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getStatusBadge = (status: string, startsIn: number) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
          <CheckCircle size={16} />
          Completed
        </span>
      );
    }

    if (startsIn <= 5 && startsIn > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full font-medium animate-pulse">
          <AlertCircle size={16} />
          Starting Soon!
        </span>
      );
    }

    if (startsIn <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
          In Progress
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full font-medium">
        <Clock size={16} />
        {startsIn > 60
          ? `${Math.floor(startsIn / 60)}h away`
          : `${startsIn}m away`}
      </span>
    );
  };

  const filteredInterviews = interviews.filter(i => {
    if (filter === 'upcoming') return i.isUpcoming;
    if (filter === 'completed') return i.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Interviews</h1>
        <p className="text-gray-600">Manage and conduct scheduled final exam interviews</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Interviews</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-yellow-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Upcoming</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.upcoming}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Calendar size={24} className="text-yellow-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-green-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        {(['all', 'upcoming', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === f
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button
          onClick={fetchInterviews}
          className="ml-auto px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
          {error}
        </div>
      )}

      {/* Interview List */}
      <AnimatePresence>
        {filteredInterviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16 bg-white rounded-xl border border-gray-200"
          >
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No interviews found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filter === 'upcoming' && 'You have no upcoming interviews scheduled'}
              {filter === 'completed' && 'You haven\'t completed any interviews yet'}
              {filter === 'all' && 'No interviews are available'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview, idx) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-xl border-2 p-6 bg-white transition-all hover:shadow-lg ${getStatusColor(
                  interview.status
                )}`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left: Interview Details */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {interview.student.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {interview.student.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">{interview.student.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <span className="font-semibold">Exam:</span> {interview.final_exams.title}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-semibold">Course:</span> {interview.course.title}
                      </p>

                      <div className="flex flex-wrap gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={16} />
                          {formatDate(interview.scheduled_date)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock size={16} />
                          {interview.duration_minutes} minutes
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex flex-col items-end gap-4 md:w-64">
                    {getStatusBadge(interview.status, interview.startsIn)}

                    <div className="flex gap-2 w-full justify-end">
                      {interview.meeting_link && (
                        <button
                          onClick={() => openMeetingLink(interview.meeting_link)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <ExternalLink size={16} />
                          Join Meeting
                        </button>
                      )}

                      {interview.isUpcoming && interview.status !== 'completed' && (
                        <button
                          onClick={() => completeInterview(interview.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <CheckCircle size={16} />
                          Mark Done
                        </button>
                      )}
                    </div>

                    {interview.status === 'in-progress' && (
                      <div className="w-full">
                        <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                          <p className="text-red-800 text-sm font-medium text-center">
                            ⏰ Student waiting to join!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
